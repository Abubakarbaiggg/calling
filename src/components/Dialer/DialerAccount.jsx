import { Drawer, Form, Input, Button, Switch, message } from 'antd';
import { useState } from 'react';

export default function DialerAccount({ visible, onClose }) {
    const [form] = Form.useForm();
    const [autoAnswer, setAutoAnswer] = useState(
        sessionStorage.getItem('auto_call_answer') === '1'
    );

    const onSave = () => {
        sessionStorage.setItem('auto_call_answer', autoAnswer ? '1' : '0');
        message.success('Settings saved');
        onClose();
    };

    return (
        <Drawer title="Dialer Settings" placement="right" open={visible} onClose={onClose} width={360}>
            <Form form={form} layout="vertical">
                <Form.Item label="Auto Answer Incoming Calls">
                    <Switch checked={autoAnswer} onChange={setAutoAnswer} />
                </Form.Item>
                <Button type="primary" block onClick={onSave}>Save</Button>
            </Form>
        </Drawer>
    );
}