import { Card, Tag, Space, Button } from 'antd';
import {
    PhoneTwoTone, AudioMutedOutlined, NotificationOutlined,
    SwapOutlined, ContactsOutlined, CloseOutlined
} from '@ant-design/icons';
import TimerComponent from '../../Timer/TimerComponent';

export default function IncomingCall({
    number, isConnected, isHold, isMute, dtmfInput,
    endCall, holdCall, unholdCall, muteCall, unmuteCall,
    onToggleBlind, onToggleAttended
}) {
    if (!isConnected) return null;

    return (
        <Card size="small" style={{ marginTop: 12 }}>
            <Space wrap>
                <Tag color="green">Connected</Tag>
                <Tag>{number}</Tag>
                {dtmfInput && <Tag color="blue">DTMF: {dtmfInput}</Tag>}
                <TimerComponent active={isConnected} title="Call Time" />
                {isHold && <Tag color="orange">Hold</Tag>}
                {isMute && <Tag color="red">Mute</Tag>}
            </Space>
            <Space style={{ marginTop: 12 }} wrap>
                <Button icon={<PhoneTwoTone twoToneColor="red" />} onClick={endCall} danger>Hangup</Button>
                <Button icon={<AudioMutedOutlined />} onClick={isMute ? unmuteCall : muteCall}>
                    {isMute ? 'Unmute' : 'Mute'}
                </Button>
                <Button icon={<NotificationOutlined />} onClick={isHold ? unholdCall : holdCall}>
                    {isHold ? 'Unhold' : 'Hold'}
                </Button>
                <Button icon={<SwapOutlined />} onClick={onToggleBlind}>Blind Transfer</Button>
                <Button icon={<ContactsOutlined />} onClick={onToggleAttended}>Attended Transfer</Button>
                <Button icon={<CloseOutlined />} onClick={endCall} type="text" />
            </Space>
        </Card>
    );
}