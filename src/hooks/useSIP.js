import { useRef, useState, useEffect, useCallback } from 'react';
import {
    UserAgent,
    Registerer,
    RegistererState,
    Inviter,
    Invitation,
    SessionState,
    Web,
} from 'sip.js';
import openNotificationWithIcon from '../Notifications/notification';
import apiClient from '../config/apiClient';

export default function useSIP({ sipDomain, authUser, authPass, wssPort }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [sessionState, setSessionState] = useState(null);
    const [incoming, setIncoming] = useState(false);
    const [outgoing, setOutgoing] = useState(false);
    const [isCallConnected, setIsCallConnected] = useState(false);
    const [isHold, setIsHold] = useState(false);
    const [isMute, setIsMute] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [dialedNumber, setDialedNumber] = useState('');
    const [incomingInvitation, setIncomingInvitation] = useState(null);
    const [dtmfInput, setDtmfInput] = useState(null);
    const [isTransferConnected, setIsTransferConnected] = useState(false);
    const [isTransferHold, setIsTransferHold] = useState(false);
    const [isTransferMute, setIsTransferMute] = useState(false);
    const [isBridged, setIsBridged] = useState(false);

    const userAgentRef = useRef(null);
    const registererRef = useRef(null);
    const sessionRef = useRef(null);
    const transferSessionRef = useRef(null);
    const mediaElementRef = useRef(null);
    const audioElementRef = useRef(null);

    // ---------- Register Listener ----------
    const registerListener = useCallback((state) => {
        switch (state) {
            case RegistererState.Registered:
                setIsRegistered(true);
                setIsConnected(true);
                sessionStorage.setItem('sip_registered', 'true');
                sessionStorage.setItem('sip_connected', 'true');
                openNotificationWithIcon('success', 'Phone registered successfully');
                break;
            case RegistererState.Unregistered:
            case RegistererState.Terminated:
                setIsRegistered(false);
                setIsConnected(false);
                sessionStorage.setItem('sip_registered', 'false');
                sessionStorage.setItem('sip_connected', 'false');
                break;
            default:
                break;
        }
    }, []);

    // ---------- Session Listener (Outgoing) ----------
    const sessionListener = useCallback((state) => {
        setSessionState(state);
        switch (state) {
            case SessionState.Establishing:
                attachMedia();
                break;
            case SessionState.Established:
                stopRing();
                setIsCallConnected(true);
                break;
            case SessionState.Terminating:
            case SessionState.Terminated:
                stopRing();
                cleanupMedia();
                setIncoming(false);
                setOutgoing(false);
                setIsCallConnected(false);
                setIsModalVisible(false);
                setIsHold(false);
                setIsMute(false);
                setDialedNumber('');
                sessionRef.current = null;
                break;
            default:
                break;
        }
    }, []);

    // ---------- Incoming Session Listener ----------
    const incomingSessionListener = useCallback((state) => {
        setSessionState(state);
        switch (state) {
            case SessionState.Established:
                attachMedia();
                stopRing();
                setIsCallConnected(true);
                break;
            case SessionState.Terminating:
            case SessionState.Terminated:
                stopRing();
                cleanupMedia();
                setIncoming(false);
                setIsCallConnected(false);
                setIsModalVisible(false);
                setIsHold(false);
                setDialedNumber('');
                sessionRef.current = null;
                break;
            default:
                break;
        }
    }, []);

    // ---------- Ringer ----------
    const playRinger = () => {
        audioElementRef.current?.play().catch(() => {});
    };
    const stopRing = () => {
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.currentTime = 0;
        }
    };

    // ---------- DTMF fetch ----------
    const fetchDtmf = (number) => {
        apiClient.post('api/agent/get-dtmf-input', { phone_number: number })
            .then((res) => setDtmfInput(res.data))
            .catch(() => openNotificationWithIcon('error', 'Unable to catch DTMF input'));
    };

    // ---------- Incoming Invite ----------
    const onInvite = useCallback((invitation) => {
        if (!sessionRef.current) {
            playRinger();
            const autoAnswer = sessionStorage.getItem('auto_call_answer') ?? 0;

            sessionRef.current = invitation;
            setIncoming(true);
            setDialedNumber(invitation.remoteIdentity.uri.user);
            fetchDtmf(invitation.remoteIdentity.uri.user);

            invitation.stateChange.addListener(incomingSessionListener);

            if (Number(autoAnswer) === 1) {
                setTimeout(() => onCallAccept(), 300);
            } else {
                setIsModalVisible(true);
            }
        } else {
            invitation.reject().catch(() => {});
            openNotificationWithIcon('warning', `Call from ${invitation.remoteIdentity.uri.user} rejected (busy)`);
        }
    }, [incomingSessionListener]);

    // ---------- UA Init ----------
    useEffect(() => {
        if (!sipDomain || !authUser || !authPass) return;

        const uri = UserAgent.makeURI(`sip:${authUser}@${sipDomain}`);
        if (!uri) {
            openNotificationWithIcon('error', 'Invalid SIP URI');
            return;
        }

        userAgentRef.current = new UserAgent({
            authorizationUsername: authUser,
            authorizationPassword: authPass,
            transportOptions: {
                server: `wss://${sipDomain}:${wssPort}/ws`,
            },
            uri,
            logLevel: 'error',
            delegate: {
                onConnect: () => {
                    setIsConnected(true);
                    sessionStorage.setItem('sip_connected', 'true');
                },
                onDisconnect: () => {
                    setIsConnected(false);
                    sessionStorage.setItem('sip_connected', 'false');
                },
                onInvite,
            },
        });

        registererRef.current = new Registerer(userAgentRef.current);

        // Auto re-register if previously registered
        if (sessionStorage.getItem('sip_registered') === 'true') {
            RegisterSIP();
        }

        return () => {
            try {
                registererRef.current?.stateChange.removeListener(registerListener);
                sessionRef.current?.stateChange.removeListener(sessionListener);
                userAgentRef.current?.stop();
            } catch (e) {
                console.log(e);
            }
        };
        // eslint-disable-next-line
    }, [sipDomain, authUser, authPass, wssPort]);

    // ---------- Register / Unregister ----------
    const RegisterSIP = useCallback(() => {
        if (!userAgentRef.current) return;
        userAgentRef.current.start()
            .then(() => {
                registererRef.current.stateChange.addListener(registerListener);
                return registererRef.current.register();
            })
            .catch((err) => openNotificationWithIcon('error', err.message));
    }, [registerListener]);

    const UnregisterSIP = useCallback(() => {
        registererRef.current?.unregister()
            .then(() => openNotificationWithIcon('success', 'Phone unregistered'))
            .catch((err) => openNotificationWithIcon('error', err.message));
    }, []);

    // ---------- Make Call ----------
    const makeCall = useCallback(async (number) => {
        sessionStorage.setItem('setDialerSpin', 'true');
        const token = sessionStorage.getItem('agent_token');
        if (!token) {
            openNotificationWithIcon('error', 'Authentication error. Please log in again.');
            sessionStorage.setItem('setDialerSpin', 'false');
            return;
        }
        try {
            const balanceResp = await apiClient.get('api/prepaid-bil');
            const remainingAmount = balanceResp.data?.prepaid?.remaining_amount ?? 1;
            if (remainingAmount <= 0) {
                openNotificationWithIcon('error', 'Insufficient balance. Cannot make a call.');
                sessionStorage.setItem('setDialerSpin', 'false');
                return;
            }

            const target = UserAgent.makeURI(`sip:${number}@${sipDomain}`);
            if (!target) {
                openNotificationWithIcon('error', 'Invalid target URI');
                return;
            }
            const inviter = new Inviter(userAgentRef.current, target, { earlyMedia: true });

            const options = {
                earlyMedia: true,
                sessionDescriptionHandlerOptions: {
                    constraints: { audio: true, video: false },
                    iceGatheringTimeout: 100,
                },
            };

            inviter.invite(options)
                .then(() => setOutgoing(true))
                .catch((err) => openNotificationWithIcon('error', err.message));

            sessionRef.current = inviter;
            inviter.stateChange.addListener(sessionListener);
            setDialedNumber(number);
        } catch (err) {
            openNotificationWithIcon('error', `Error making API request: ${err.message}`);
        } finally {
            sessionStorage.setItem('setDialerSpin', 'false');
        }
    }, [sipDomain, sessionListener]);

    // ---------- Accept / End ----------
    const onCallAccept = useCallback(() => {
        if (!sessionRef.current) return;
        const options = {
            sessionDescriptionHandlerOptions: {
                constraints: { audio: true, video: false },
                iceGatheringTimeout: 100,
            },
        };
        sessionRef.current.accept(options);
        setIsModalVisible(false);
    }, []);

    const endCall = useCallback(() => {
        stopRing();
        if (!sessionRef.current) return;
        const session = sessionRef.current;
        switch (session.state) {
            case SessionState.Initial:
            case SessionState.Establishing:
                if (session instanceof Inviter) session.cancel().catch(() => {});
                else session.reject().catch(() => {});
                sessionRef.current = null;
                setIsModalVisible(false);
                break;
            case SessionState.Established:
                session.bye().catch(() => {});
                sessionRef.current = null;
                setIsModalVisible(false);
                setIsHold(false);
                setDialedNumber('');
                break;
            default:
                sessionRef.current = null;
                break;
        }
    }, []);

    // ---------- Hold / Unhold / Mute / Unmute ----------
    const onHold = () => {
        if (!sessionRef.current) return;
        const options = { sessionDescriptionHandlerModifiers: [Web.holdModifier] };
        sessionRef.current.invite(options)
            .then(() => setIsHold(true))
            .catch((err) => openNotificationWithIcon('error', err.message));
    };

    const onUnhold = () => {
        if (!sessionRef.current) return;
        const options = { sessionDescriptionHandlerModifiers: [] };
        sessionRef.current.invite(options)
            .then(() => setIsHold(false))
            .catch((err) => openNotificationWithIcon('error', err.message));
    };

    const onMute = () => {
        if (!sessionRef.current) return;
        const pc = sessionRef.current.sessionDescriptionHandler.peerConnection;
        pc.getSenders().forEach((sender) => {
            if (sender.track) sender.track.enabled = false;
        });
        setIsMute(true);
    };

    const onUnmute = () => {
        if (!sessionRef.current) return;
        const pc = sessionRef.current.sessionDescriptionHandler.peerConnection;
        pc.getSenders().forEach((sender) => {
            if (sender.track) sender.track.enabled = true;
        });
        setIsMute(false);
    };

    // ---------- Transfers ----------
    const blindTransfer = (target) => {
        if (!sessionRef.current) return;
        const transferTarget = UserAgent.makeURI(`sip:${target}@${sipDomain}`);
        if (!transferTarget) return;
        sessionRef.current.refer(transferTarget)
            .then(() => {
                openNotificationWithIcon('success', 'Call transferred');
                endCall();
            })
            .catch((err) => openNotificationWithIcon('error', err.message));
    };

    const attendedTransfer = (number) => {
        const target = UserAgent.makeURI(`sip:${number}@${sipDomain}`);
        if (!target) return;
        const transferSession = new Inviter(userAgentRef.current, target, { earlyMedia: true });
        const options = {
            earlyMedia: true,
            sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } },
        };

        transferSession.stateChange.addListener((state) => {
            switch (state) {
                case SessionState.Establishing:
                    setIsTransferConnected(true);
                    break;
                case SessionState.Terminated:
                    setIsTransferConnected(false);
                    transferSessionRef.current = null;
                    attachMedia();
                    break;
                default:
                    break;
            }
        });

        transferSession.invite(options).catch(() => {});
        transferSessionRef.current = transferSession;
    };

    const acceptTransfer = () => {
        const sessionA = sessionRef.current;
        const sessionB = transferSessionRef.current;
        if (!sessionA || !sessionB) return;

        const receivedTracks = [];
        sessionA.sessionDescriptionHandler.peerConnection.getReceivers().forEach((r) => receivedTracks.push(r.track));
        sessionB.sessionDescriptionHandler.peerConnection.getReceivers().forEach((r) => receivedTracks.push(r.track));

        const context = new AudioContext();
        const mediaStream = new MediaStream();

        [sessionA, sessionB].forEach((session) => {
            const mixedOutput = context.createMediaStreamDestination();
            session.sessionDescriptionHandler.peerConnection.getReceivers().forEach((receiver) => {
                receivedTracks.forEach((track) => {
                    mediaStream.addTrack(receiver.track);
                    if (receiver.track.id !== track.id) {
                        const src = context.createMediaStreamSource(new MediaStream([track]));
                        src.connect(mixedOutput);
                    }
                });
            });
            session.sessionDescriptionHandler.peerConnection.getSenders().forEach((sender) => {
                if (sender.track) {
                    const src = context.createMediaStreamSource(new MediaStream([sender.track]));
                    src.connect(mixedOutput);
                }
            });
            const firstSender = session.sessionDescriptionHandler.peerConnection.getSenders()[0];
            if (firstSender) {
                firstSender.replaceTrack(mixedOutput.stream.getTracks()[0]).then(() => {
                    setIsBridged(true);
                }).catch(() => {});
            }
        });
    };

    const transferHangup = () => {
        if (!transferSessionRef.current) return;
        const s = transferSessionRef.current;
        if (s.state === SessionState.Established) s.bye().catch(() => {});
        else s.cancel?.().catch(() => {});
        transferSessionRef.current = null;
        setIsTransferConnected(false);
        setIsBridged(false);
        attachMedia();
    };

    const transferHold = () => {
        if (!transferSessionRef.current) return;
        transferSessionRef.current.invite({ sessionDescriptionHandlerModifiers: [Web.holdModifier] })
            .then(() => setIsTransferHold(true)).catch(() => {});
    };

    const transferUnhold = () => {
        if (!transferSessionRef.current) return;
        transferSessionRef.current.invite({ sessionDescriptionHandlerModifiers: [] })
            .then(() => setIsTransferHold(false)).catch(() => {});
    };

    const transferMute = () => {
        if (!transferSessionRef.current) return;
        const pc = transferSessionRef.current.sessionDescriptionHandler.peerConnection;
        pc.getSenders().forEach((sender) => { if (sender.track) sender.track.enabled = false; });
        setIsTransferMute(true);
    };

    const transferUnmute = () => {
        if (!transferSessionRef.current) return;
        const pc = transferSessionRef.current.sessionDescriptionHandler.peerConnection;
        pc.getSenders().forEach((sender) => { if (sender.track) sender.track.enabled = true; });
        setIsTransferMute(false);
    };

    // ---------- DTMF ----------
    const sendDTMF = (digit) => {
        if (!sessionRef.current) return;
        const options = {
            requestOptions: {
                body: {
                    contentDisposition: 'render',
                    contentType: 'application/dtmf-relay',
                    content: `Signal=${digit}\r\nDuration=1000`,
                },
            },
        };
        sessionRef.current.info(options).catch(() => {});
    };

    // ---------- Media Helpers ----------
    const attachMedia = () => {
        if (!mediaElementRef.current || !sessionRef.current) return;
        const remoteStream = new MediaStream();
        sessionRef.current.sessionDescriptionHandler.peerConnection.getReceivers().forEach((receiver) => {
            if (receiver.track) remoteStream.addTrack(receiver.track);
        });
        mediaElementRef.current.srcObject = remoteStream;
        mediaElementRef.current.play().catch(() => {});
    };

    const cleanupMedia = () => {
        if (!mediaElementRef.current) return;
        mediaElementRef.current.srcObject = null;
        mediaElementRef.current.pause();
    };

    return {
        // refs
        mediaElementRef,
        audioElementRef,
        // state
        isConnected, isRegistered, sessionState, incoming, outgoing,
        isCallConnected, isHold, isMute, isModalVisible, dialedNumber,
        dtmfInput, isTransferConnected, isTransferHold, isTransferMute, isBridged,
        // actions
        RegisterSIP, UnregisterSIP, makeCall, onCallAccept, endCall,
        onHold, onUnhold, onMute, onUnmute,
        blindTransfer, attendedTransfer, acceptTransfer,
        transferHangup, transferHold, transferUnhold, transferMute, transferUnmute,
        sendDTMF,
    };
}