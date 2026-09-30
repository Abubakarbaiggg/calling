import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import apiClient from '../config/apiClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const { data } = await apiClient.post('/api/agent-login', values);
            sessionStorage.setItem('agent_token', data.token);
            sessionStorage.setItem('agent_username', data.username || values.username);
            sessionStorage.setItem('id', data.id);
            sessionStorage.setItem('auto_call_answer', data.auto_call_answer ?? 0);
            message.success('Login successful');
            navigate('/dialer');
        } catch (err) {
            message.error(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg,#1e3c72,#2a5298)'
        }}>
            <Card style={{ width: 380 }}>
                <Typography.Title level={3} style={{ textAlign: 'center' }}>
                    Agent Login
                </Typography.Title>
                <Form onFinish={onFinish} layout="vertical">
                    <Form.Item name="username" rules={[{ required: true }]}>
                        <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                        Login
                    </Button>
                </Form>
            </Card>
        </div>
    );
}