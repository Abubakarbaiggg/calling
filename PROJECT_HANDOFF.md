# Calling App Developer Handoff

Use this document as the implementation brief for continuing or rebuilding this app. Treat the repository code as the source of truth for existing behavior. Do not invent backend endpoints, Asterisk configuration, credentials, or response fields; confirm any unknown contract with the backend/PBX owner.

## Project Goal

Build a browser-based call-center agent panel with authenticated agent login, queue controls, SIP phone registration, inbound and outbound audio calls, call controls, transfer flows, and live break-reason updates.

This repository is a frontend client. It does not contain the backend, Asterisk configuration, dialplan, AMI/ARI implementation, or the server-side Echo broadcaster. Those systems must be supplied separately.

## Current App Structure

- `src/App.jsx`: React Router routes and token-based route guard.
- `src/pages/Login.jsx`: agent login form and session setup.
- `src/pages/Dialer.jsx`: agent dashboard, queue controls, SIP status, dialer and call modals.
- `src/config/apiClient.js`: Axios base URL, Bearer token injection, and 401 redirect.
- `src/config/echo.js`: Laravel Echo/Pusher WebSocket configuration.
- `src/hooks/useAgentStatus.js`: agent profile, queue, queue login/logout, break actions, and Echo listener.
- `src/hooks/useSIP.js`: SIP.js registration, WebRTC media, inbound/outbound calls, hold/mute, DTMF, and transfer helpers.
- `src/components/Dialer/`: dialer, settings, incoming call, break and transfer UI.
- `src/Timer/TimerComponent.jsx`: browser-local elapsed-time display.

## User Flows

1. Login posts the entered username/password, stores the returned agent token and profile fields in `sessionStorage`, and navigates to `/dialer`.
2. `/dialer` is guarded by the presence of `agent_token`; unauthenticated users are redirected to `/login`.
3. The dialer loads the agent profile and queue list, then initializes SIP.js when the SIP credentials are available.
4. The agent registers their SIP user agent, logs into the queue, and may pause/unpause or log out of the queue.
5. Outbound calls check prepaid balance before sending a SIP INVITE. Inbound calls can be accepted/rejected and optionally auto-answered.
6. During calls, the UI supports hangup, hold/unhold, mute/unmute and SIP INFO DTMF. Blind transfer uses SIP REFER. An attended-transfer helper starts a second SIP call.
7. A private Echo channel receives pause-reason updates for the current agent.

## Exact Calling Sequence

Use this sequence when implementing or debugging calling. HTTP requests go to the Laravel-style backend; call signaling goes directly through SIP.js to the configured SIP WSS endpoint. Do not invent a REST `place-call` endpoint: none exists in this frontend.

### Before Calling

1. Agent submits username and password in `Login.jsx`.
2. Frontend sends `POST /api/agent-login` with the form values. Store the returned `token`, `id`, `username`, and `auto_call_answer` in `sessionStorage`.
3. On `/dialer`, send `GET /api/get-user` and `GET /api/agent/get-queue` in parallel. The user response supplies `auth_username` and `auth_password` for SIP registration.
4. Create the SIP.js `UserAgent` using `wss://${VITE_SIP_DOMAIN}:${VITE_SIP_PORT}/ws`. When the agent clicks Register, start the user agent and send SIP `REGISTER` over WSS. Wait for the registered state before showing the phone as registered.
5. Queue login is a separate action: `POST /api/agent/login`. It is not the SIP registration call. The current dial action itself does not check `queueLoggedIn`.

### Outbound Call

1. The agent enters a destination in `DialerMenu` and clicks Call.
2. `useSIP.makeCall(number)` checks for `sessionStorage.agent_token`, then calls `GET /api/prepaid-bil` with the Bearer token attached by the Axios interceptor.
3. Read `data.prepaid.remaining_amount`. If it is zero or less, show an insufficient-balance error and do not create a SIP call. If the field is absent, current code defaults the amount to `1`; confirm whether this fallback is acceptable.
4. Build the target URI `sip:<number>@<sip-domain>`. Request browser audio and create a SIP.js `Inviter`.
5. Send SIP `INVITE` over the established SIP WSS connection with early media enabled. This is SIP signaling, not an HTTP API call. WebRTC negotiates audio; actual media routing depends on SDP, ICE, network and PBX/media-server configuration.
6. Update the UI from SIP session state: show outgoing/connected state, attach remote audio to the hidden media element, and stop the ringer when applicable.

Outbound call HTTP API hit: `GET /api/prepaid-bil` only. Registration/INVITE/media are SIP/WebRTC traffic. No outgoing-call DTMF lookup is made by the current code.

### Incoming Call

1. A SIP `INVITE` arrives on the registered SIP.js user agent; `delegate.onInvite` receives the `Invitation`.
2. If another session is already active, reject this invitation as busy. Otherwise, set the caller number from `invitation.remoteIdentity.uri.user`, start the ringer, and track the session.
3. Send `POST /api/agent/get-dtmf-input` with `{ "phone_number": "<caller-number>" }`; show the returned response data as the DTMF value. This lookup is additional backend data, not what establishes the call.
4. If `sessionStorage.auto_call_answer` is `1`, call `accept()` after 300 ms. Otherwise show the incoming-call modal and wait for Accept or Reject.
5. Accept/reject/hangup are SIP session actions (`accept`, `reject`, or `bye` as appropriate); they are not REST endpoints. On establishment, attach remote audio; on termination, stop ringing, clear media and reset call state.

Incoming call HTTP API hit: `POST /api/agent/get-dtmf-input` only. Incoming INVITE, answer, reject and hangup are SIP signaling.

### In-Call Actions

| UI action | Current mechanism | Additional HTTP API? |
| --- | --- | --- |
| Hold / unhold | SIP re-INVITE with or without `Web.holdModifier` | No |
| Mute / unmute | Enable/disable local WebRTC audio sender tracks | No |
| Send a keypad digit | SIP `INFO`, content type `application/dtmf-relay`, body `Signal=<digit>` and `Duration=1000` | No |
| Hang up an establishing outbound call | SIP `CANCEL` | No |
| Reject an incoming call | SIP `reject()` | No |
| Hang up an established call | SIP `BYE` | No |
| Blind transfer | SIP `REFER` to `sip:<target>@<sip-domain>` | No |
| Start attended transfer | Creates a second SIP.js `Inviter` / SIP `INVITE` | No |

The current `acceptTransfer` helper is not connected to a visible completion/bridge control in `Dialer.jsx`; the attended-transfer experience is incomplete and must be finished and tested instead of assumed to work.

## HTTP API Contract Observed In Source

Base URL: `VITE_API_BASE_URL`; fallback in source is `https://androidtesting.telecard.com.pk/backend`.

All Axios requests include `Authorization: Bearer <agent_token>` when the token exists. A 401 response clears `sessionStorage` and redirects to `/login`.

| Method and path | Request | Behavior/response fields used |
| --- | --- | --- |
| `POST /api/agent-login` | Login form values (`username`, `password`) | Reads `token`, `username`, `id`, and `auto_call_answer`; stores them in session storage. |
| `GET /api/get-user` | None | Reads `name`, `auth_username`, and `auth_password`. The SIP password is currently returned to the browser. |
| `GET /api/agent/get-queue` | None | Expects an array and stores it as the queue list. Confirm the actual item shape. |
| `POST /api/agent/login` | No body in current code | Logs the agent into the queue. |
| `POST /api/agent/logout` | No body in current code | Logs the agent out and clears local break state. |
| `POST /api/agent/pause` | `{ "reason": "<selected reason>" }` | Pauses the agent. Code may read array element `[1]` as a break-time value; confirm the response format. |
| `POST /api/agent/unpause` | No body in current code | Unpauses the agent. |
| `GET /api/prepaid-bil` | None | Outbound call gate reads `data.prepaid.remaining_amount`; non-positive balance blocks dialing. |
| `POST /api/agent/get-dtmf-input` | `{ "phone_number": "<number>" }` | Called for an incoming call; response data is shown as DTMF information. |

The Echo private-channel authorization URL is configured by `VITE_PUSHER_AUTH_ENDPOINT`; its actual value and backend behavior must be confirmed outside this repository. Do not replace it with a guessed endpoint.

## SIP, Asterisk, And Media

- SIP implementation: `sip.js` (`UserAgent`, `Registerer`, `Inviter`, `Invitation`).
- SIP signaling URL: `wss://${VITE_SIP_DOMAIN}:${VITE_SIP_PORT}/ws`; defaults in code are `androidtesting.telecard.com.pk` and port `8089`.
- SIP authorization username/password come from `GET /api/get-user` response fields `auth_username` and `auth_password`.
- Calls use browser WebRTC audio only (`audio: true`, `video: false`) and a hidden audio element for remote media.
- The frontend contains no Asterisk AMI/ARI client and no PBX dialplan. Call routing, extensions, SIP users, codecs, NAT, firewall, TLS certificates, and WebSocket support are server/PBX responsibilities.
- Browser microphone permission and a valid secure origin/WSS certificate are required for real calls.
- Outbound calls create a SIP INVITE to `sip:<number>@<sip-domain>` after the prepaid-balance check. Hangup uses SIP CANCEL/REJECT/BYE according to session state.
- Hold/unhold renegotiates with `Web.holdModifier`; mute/unmute toggles local sender audio tracks.
- DTMF digits are sent using SIP INFO with `application/dtmf-relay` and a 1000 ms duration.
- Blind transfer uses SIP REFER. Attended transfer creates a second SIP dialog. `acceptTransfer` exists in `useSIP`, but the current dialer UI does not wire it into an explicit complete/bridge action; verify and finish this flow before calling it production-ready.

## Realtime Echo/Pusher

- Client libraries: `laravel-echo` with the Pusher broadcaster and `pusher-js`.
- Host: `VITE_SOCKET_APP_URL` (source fallback `androidtesting.telecard.com.pk`).
- WS port: `VITE_SOCKET_PORT` (fallback `6001`); WSS port: `VITE_SOCKET_WSS_PORT` (fallback `443`).
- TLS is enabled by default through `VITE_PUSHER_FORCETLS`; stats are disabled; transports are `ws` and `wss`.
- Pusher key/cluster use `VITE_PUSHER_KEY` and `VITE_PUSHER_CLUSTER` (source fallbacks `local` and `mt1`).
- Private channel: `agent-panel-pause-reason-channel.<agent-id>`.
- Event: `.agent-panel-pause-reason`; code reads reason options from `event.data.data`.
- The private channel auth request uses `VITE_PUSHER_AUTH_ENDPOINT` and the agent Bearer token.

Earlier requested WebSocket URL used `version=7.6.0`. The current `package.json` has `pusher-js: ^8.4.0`, and the regenerated lock resolves `8.6.0`, so the browser URL will report the 8.x client version. If the server specifically requires `7.6.0`, pin that exact package version and regenerate the lockfile; do not change it without confirming that requirement.

## Environment Variables

Define these in a local environment file for the selected bundler. Values below are intentionally omitted; use placeholders and never commit credentials or tokens.

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | HTTP API base URL. |
| `VITE_SIP_DOMAIN` | SIP domain/host. |
| `VITE_SIP_PORT` | SIP WSS port used by SIP.js. |
| `VITE_PUSHER_KEY` | Pusher-compatible application key. |
| `VITE_PUSHER_CLUSTER` | Pusher cluster setting. |
| `VITE_PUSHER_FORCETLS` | Toggle TLS for Echo/Pusher. |
| `VITE_SOCKET_APP_URL` | Echo/Pusher WebSocket host. |
| `VITE_SOCKET_PORT` | Non-TLS WebSocket port. |
| `VITE_SOCKET_WSS_PORT` | TLS WebSocket port. |
| `VITE_PUSHER_AUTH_ENDPOINT` | Server endpoint used to authorize private channels. |

## Packages

Direct dependencies declared by the current `package.json`:

- `react`, `react-dom`: UI runtime.
- `react-router-dom`: client-side routes.
- `antd`, `@ant-design/icons`: UI components and icons.
- `axios`: HTTP API client.
- `laravel-echo`, `pusher-js`: private real-time events.
- `sip.js`: SIP/WebRTC phone client.
- `react-scripts`: Create React App development/build/test commands.
- `web-vitals`: CRA performance reporting.
- `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`: UI test tooling.

Current direct version declarations: `antd 5.27.6`, `@ant-design/icons 5.6.1`, `react-scripts 5.0.1`, `sip.js ^0.21.2`, `laravel-echo ^2.2.0`, `pusher-js ^8.4.0`; other ranges are in `package.json` and exact resolutions are in `package-lock.json`.

## Build And Setup Notes

- Current scripts use Create React App: `npm start`, `npm test`, and `npm run build`.
- The CRA entry point is `src/index.js`; `public/index.html` is also a CRA template.
- Source configuration currently reads `import.meta.env.VITE_*`, which is Vite-style, while the package scripts use `react-scripts`. Resolve this mismatch explicitly: either migrate the project consistently to Vite, or keep CRA and change configuration to `process.env.REACT_APP_*` with matching environment variable names. Do not mix the two bundler conventions.
- A prior build reported `[eslint] ... Environment key "jest/globals" is unknown`. Verify the installed `eslint-plugin-jest` / CRA dependency tree after installation and resolve this without disabling lint checks globally.
- An earlier `npm start` failure reported `react-scripts` not recognized because `node_modules` was incomplete. Once the lockfile is correct, use `npm ci` for a reproducible clean install, then run `npm start` and `npm run build`.
- The current Script panel is an empty placeholder and its refresh control is disabled; no script API is present in the source.
- The displayed login/break timers count locally from zero; they are not synchronized to server timestamps. The pause response's optional `break_time` storage is not used by the timer component.

## Implementation And Acceptance Requirements

1. Preserve the described routes and agent workflows unless the product owner approves a change.
2. Confirm API payloads, response shapes, Echo auth URL/event payload, and Asterisk/SIP server settings with the backend/PBX owner before implementing unknown behavior.
3. Keep all secrets and real `.env` values out of source control, screenshots, logs, and generated documentation.
4. Ensure auth failure, API loading/error states, SIP connection/registration failures, microphone denial, incoming calls, busy rejection, and disconnect/reconnect states are handled visibly.
5. Complete and test attended transfer end-to-end; do not report it as complete based only on the existing helper.
6. Add focused tests for login/session behavior, API failure handling, agent status actions, and call-control state transitions where practical.
7. Run a clean dependency install, production build, and relevant tests. Record any backend/PBX configuration that cannot be verified from this frontend repository.

## Copy-Paste Task For Another AI

Implement and complete the browser calling flow described in this brief and in the existing source. First inspect `src/hooks/useSIP.js`, `src/hooks/useAgentStatus.js`, `src/pages/Dialer.jsx`, `src/components/Dialer/`, and the API/Echo config. Preserve the API paths and payloads listed above. Keep backend HTTP APIs separate from SIP signaling: outbound calls use the prepaid-balance GET followed by SIP INVITE; incoming calls arrive as SIP INVITEs and make the DTMF lookup POST; hangup, hold, mute, DTMF, and transfer use SIP/WebRTC, not invented HTTP routes. Finish the attended-transfer flow, expose clear call and registration states, handle permission/network/API failures, and add focused tests. Do not expose or hardcode environment secrets. Before changing configuration, resolve the documented Vite `import.meta.env` versus CRA `react-scripts` mismatch consistently. Run the production build and relevant tests, and report any required Asterisk/backend configuration that this frontend cannot implement.