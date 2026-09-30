import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { ENV } from './env';

window.Pusher = Pusher;

const initializeEcho = (token) => {
    return new Echo({
        broadcaster: 'pusher',
        key: ENV.PUSHER_KEY,
        cluster: ENV.PUSHER_CLUSTER,
        wsHost: ENV.SOCKET_APP_URL,
        wsPort: ENV.SOCKET_PORT,
        wssPort: ENV.SOCKET_WSS_PORT,
        forceTLS: String(ENV.PUSHER_FORCETLS) === 'true',
        encrypted: true,
        disableStats: true,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: ENV.PUSHER_AUTH_ENDPOINT,
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        },
    });
};

export default initializeEcho;