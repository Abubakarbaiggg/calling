// Safe environment variable accessor supporting both CRA (process.env.REACT_APP_*) and Vite (import.meta.env.VITE_*)

const getEnv = (key, fallback = '') => {
    // Check process.env (Create React App / Webpack)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env[`REACT_APP_${key}`] !== undefined) {
            return process.env[`REACT_APP_${key}`];
        }
        if (process.env[`VITE_${key}`] !== undefined) {
            return process.env[`VITE_${key}`];
        }
    }

    // Check import.meta.env (Vite)
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            if (import.meta.env[`VITE_${key}`] !== undefined) {
                return import.meta.env[`VITE_${key}`];
            }
            if (import.meta.env[`REACT_APP_${key}`] !== undefined) {
                return import.meta.env[`REACT_APP_${key}`];
            }
        }
    } catch (e) {
        // Ignore ReferenceError if import.meta is not supported
    }

    return fallback;
};

export const ENV = {
    API_BASE_URL: getEnv('API_BASE_URL', 'https://androidtesting.telecard.com.pk/backend'),
    SIP_DOMAIN: getEnv('SIP_DOMAIN', '192.168.150.238'),
    SIP_PORT: getEnv('SIP_PORT', '8089'),
    PUSHER_KEY: getEnv('PUSHER_KEY', 'local'),
    PUSHER_CLUSTER: getEnv('PUSHER_CLUSTER', 'mt1'),
    PUSHER_FORCETLS: getEnv('PUSHER_FORCETLS', 'true'),
    SOCKET_APP_URL: getEnv('SOCKET_APP_URL', 'androidtesting.telecard.com.pk'),
    SOCKET_PORT: getEnv('SOCKET_PORT', '6001'),
    SOCKET_WSS_PORT: getEnv('SOCKET_WSS_PORT', '443'),
    PUSHER_AUTH_ENDPOINT: getEnv('PUSHER_AUTH_ENDPOINT', 'https://androidtesting.telecard.com.pk/backend/broadcasting/auth'),
};

export default ENV;
