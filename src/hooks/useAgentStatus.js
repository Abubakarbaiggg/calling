import { useState, useCallback, useEffect } from 'react';
import apiClient from '../config/apiClient';
import initializeEcho from '../config/echo';
import openNotificationWithIcon from '../Notifications/notification';

export default function useAgentStatus() {
    const [queueLoggedIn, setQueueLoggedIn] = useState(false);
    const [onBreak, setOnBreak] = useState(false);
    const [queues, setQueues] = useState([]);
    const [user, setUser] = useState(null);
    const [pauseReasons, setPauseReasons] = useState([]);
    const [pauseReason, setPauseReason] = useState('');

    useEffect(() => {
        let active = true;

        apiClient.get('/api/get-user')
            .then(({ data }) => {
                if (active) {
                    setUser({
                        name: data.name,
                        authUser: data.auth_username,
                        authPass: data.auth_password,
                    });
                }
            })
            .catch((e) => {
                if (active) {
                    openNotificationWithIcon('error', e.response?.data?.message || 'Unable to load SIP account');
                }
            });

        apiClient.get('/api/agent/get-queue')
            .then(({ data }) => {
                if (active) setQueues(Array.isArray(data) ? data : []);
            })
            .catch((e) => {
                if (active) {
                    openNotificationWithIcon('error', e.response?.data?.message || 'Unable to load queues');
                }
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const token = sessionStorage.getItem('agent_token');
        const userId = sessionStorage.getItem('id');
        if (!token || !userId) return undefined;

        const echo = initializeEcho(token);
        const channelName = `agent-panel-pause-reason-channel.${userId}`;

        echo.private(channelName).listen('.agent-panel-pause-reason', (event) => {
            const reasons = event?.data?.data;
            if (Array.isArray(reasons)) setPauseReasons(reasons);
        });

        return () => {
            echo.leave(channelName);
            echo.disconnect();
        };
    }, []);

    const login = useCallback(async () => {
        try {
            const { data } = await apiClient.post('/api/agent/login');
            if (data?.response && data.response !== 'Success') {
                throw new Error(data.message || 'Login failed');
            }
            setQueueLoggedIn(true);
            openNotificationWithIcon('success', data.message || 'Logged into queue');
        } catch (e) {
            openNotificationWithIcon('error', e.response?.data?.message || e.message || 'Login failed');
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const { data } = await apiClient.post('/api/agent/logout');
            if (data?.response && data.response !== 'Success') {
                throw new Error(data.message || 'Logout failed');
            }
            setQueueLoggedIn(false);
            setOnBreak(false);
            setPauseReason('');
            sessionStorage.removeItem('break_time');
            openNotificationWithIcon('success', data.message || 'Logged out from queue');
        } catch (e) {
            openNotificationWithIcon('error', e.response?.data?.message || e.message || 'Logout failed');
        }
    }, []);

    const pause = useCallback(async (reason) => {
        try {
            const { data } = await apiClient.post('/api/agent/pause', { reason });
            if (data?.response === 'Error') {
                throw new Error(data.message || 'Pause failed');
            }
            if (Array.isArray(data) && data[1] != null && String(data[1]).length > 0) {
                sessionStorage.setItem('break_time', String(data[1]));
            }
            setOnBreak(true);
            setPauseReason(reason);
            openNotificationWithIcon('success', data.message || 'Paused');
            return true;
        } catch (e) {
            openNotificationWithIcon('error', e.response?.data?.message || e.message || 'Pause failed');
            return false;
        }
    }, []);

    const unpause = useCallback(async () => {
        try {
            const { data } = await apiClient.post('/api/agent/unpause');
            setOnBreak(false);
            setPauseReason('');
            sessionStorage.removeItem('break_time');
            openNotificationWithIcon('success', data.message || 'Unpaused');
        } catch (e) {
            openNotificationWithIcon('error', e.response?.data?.message || 'Unpause failed');
        }
    }, []);

    return {
        user,
        queueLoggedIn,
        onBreak,
        pauseReasons,
        pauseReason,
        queues,
        setQueues,
        login,
        logout,
        pause,
        unpause,
    };
}