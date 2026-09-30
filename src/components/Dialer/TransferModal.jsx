import { Modal, Input, Button, Space, Tag } from 'antd';
import { useState } from 'react';

export default function TransferModal({
    visible, transferType, onCancel, onSubmit, isConnected, isHold, isMute,
    onHold, onUnhold, onMute, onUnmute, onTransferHangup,
}) {
    const [num, setNum] = useState('');

    const submit = () => {
        if (!num) return;
        onSubmit(num);
        setNum('');
    };

    return (
        <Modal
            open={visible}
            title={transferType === 'blind' ? 'Blind Transfer' : 'Attended Transfer'}
            onCancel={onCancel}
            onOk={submit}
            okText="Dial"
            centered
        >
            <Input
                placeholder="Enter number"
                value={num}
                onChange={(e) => setNum(e.target.value)}
            />
            <Space style={{ marginTop: 12 }} wrap>
                <Tag color={isConnected ? 'green' : 'red'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                </Tag>
                <Button onClick={isHold ? onUnhold : onHold}>Hold/Unhold</Button>
                <Button onClick={isMute ? onUnmute : onMute}>Mute/Unmute</Button>
                <Button danger onClick={onTransferHangup}>Hangup Transfer</Button>
            </Space>
        </Modal>
    );
}