import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Login from './pages/Login';
import Dialer from './pages/Dialer';

const PrivateRoute = ({ children }) => {
    const token = sessionStorage.getItem('agent_token');
    return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/dialer" element={<PrivateRoute><Dialer /></PrivateRoute>} />
                    <Route path="*" element={<Navigate to="/dialer" replace />} />
                </Routes>
            </BrowserRouter>
        </ConfigProvider>
    );
}