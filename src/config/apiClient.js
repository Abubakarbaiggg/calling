import axios from 'axios';
import { ENV } from './env';

const apiClient = axios.create({
    baseURL: ENV.API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('agent_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            sessionStorage.clear();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;