import { Drawer, Button, Input, Space, Tag, Divider, Typography } from 'antd';
import { PhoneOutlined, CloseOutlined } from '@ant-design/icons';
import { useState } from 'react';

const digits = ['1','2','3','4','5','6','7','8','9','*','0','#'];

export default function DialerMenu({
    visible, onClose, makeCall, number, setNumber,
    isConnected, isHold, isMute, holdCall, unholdCall, muteCall, unmuteCall, endCall, dtmfInput
}) {
    const [local, setLocal] = useState(number || '');

    const onPress = (d) => {
        const next = local + d;
        setLocal(next);
        setNumber?.(next);
        if (isConnected) dtmfInput?.(d);
    };

    return (
        <Drawer
            title={<span><PhoneOutlined /> Dialer</span>}
            placement="right"
            onClose={onClose}
            open={visible}
            width={360}
        >
            <Input
                size="large"
                value={local}
                onChange={(e) => { setLocal(e.target.value); setNumber?.(e.target.value); }}
                placeholder="Enter number"
                style={{ marginBottom: 12, textAlign: 'center', fontSize: 20 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {digits.map((d) => (
                    <Button
                        key={d}
                        size="large"
                        style={{ height: 60, fontSize: 22 }}
                        onClick={() => onPress(d)}
                    >
                        {d}
                    </Button>
                ))}
            </div>

            <Divider />

            <Space style={{ width: '100%', justifyContent: 'center' }} wrap>
                {!isConnected ? (
                    <Button
                        type="primary"
                        size="large"
                        icon={<PhoneOutlined />}
                        onClick={() => makeCall(local)}
                        disabled={!local}
                    >
                        Call
                    </Button>
                ) : (
                    <Button danger size="large" icon={<CloseOutlined />} onClick={endCall}>
                        Hangup
                    </Button>
                )}
                <Button onClick={isHold ? unholdCall : holdCall} disabled={!isConnected}>
                    {isHold ? 'Unhold' : 'Hold'}
                </Button>
                <Button onClick={isMute ? unmuteCall : muteCall} disabled={!isConnected}>
                    {isMute ? 'Unmute' : 'Mute'}
                </Button>
            </Space>

            {dtmfInput && (
                <Typography.Paragraph style={{ marginTop: 12, textAlign: 'center' }}>
                    <Tag color="blue">DTMF: {dtmfInput}</Tag>
                </Typography.Paragraph>
            )}
        </Drawer>
    );
}