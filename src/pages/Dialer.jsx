import { useState } from 'react';
import { Layout, Menu, Tag, Card, Typography, Button, Tooltip } from 'antd';
import {
    ContainerOutlined, SettingOutlined, CodeOutlined, StopOutlined,
    ClusterOutlined, DeliveredProcedureOutlined, PauseCircleOutlined,
    PlayCircleOutlined, UserOutlined, ClockCircleOutlined, CodeSandboxOutlined,
    PhoneOutlined, ReloadOutlined,
} from '@ant-design/icons';

import useSIP from '../hooks/useSIP';
import useAgentStatus from '../hooks/useAgentStatus';
import { ENV } from '../config/env';
import DialerMenu from '../components/Dialer/DialerMenu';
import DialerAccount from '../components/Dialer/DialerAccount';
import IncomingCall from '../components/Dialer/IncomingCall';
import IncomingModal from '../components/Dialer/IncomingModal';
import TransferModal from '../components/Dialer/TransferModal';
import NotReadyModal from '../components/Dialer/NotReadyModal';
import TimerComponent from '../Timer/TimerComponent';
import './Dialer.css';

export default function Dialer() {
    const sipDomain = ENV.SIP_DOMAIN;
    const wssPort = ENV.SIP_PORT;

    const [dialerVisible, setDialerVisible] = useState(false);
    const [accountVisible, setAccountVisible] = useState(false);
    const [transferVisible, setTransferVisible] = useState(false);
    const [transferType, setTransferType] = useState('blind');
    const [breakModalVisible, setBreakModalVisible] = useState(false);

    const agent = useAgentStatus();
    const authUser = agent.user?.authUser;
    const sip = useSIP({ sipDomain, authUser, authPass: agent.user?.authPass, wssPort });

    // Transfer submit
    const onSubmitTransfer = (num) => {
        if (transferType === 'blind') sip.blindTransfer(num);
        else sip.attendedTransfer(num);
        setTransferVisible(false);
    };

    return (
        <Layout hasSider style={{ minHeight: '100vh' }}>
            <Layout.Sider trigger={null} collapsible collapsed width={200} theme="dark">
                <div style={{ color: '#fff', padding: 16, fontWeight: 600 }}>Agent Panel</div>
                <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']}>
                    <Menu.Item key="1" icon={<ContainerOutlined />} onClick={() => setDialerVisible(true)}>
                        Dialer
                    </Menu.Item>
                    <Menu.Item key="2" icon={<SettingOutlined />} onClick={() => setAccountVisible(true)}>
                        Settings
                    </Menu.Item>
                    <Menu.Item key="3" icon={<CodeOutlined />} onClick={sip.RegisterSIP}>
                        Register
                    </Menu.Item>
                    <Menu.Item key="4" icon={<StopOutlined />} disabled={!sip.isRegistered || agent.queueLoggedIn} onClick={sip.UnregisterSIP}>
                        Unregister
                    </Menu.Item>
                    <Menu.Item key="5" icon={<ClusterOutlined />} disabled={!sip.isRegistered || agent.queueLoggedIn} onClick={agent.login}>
                        Queue Login
                    </Menu.Item>
                    <Menu.Item key="6" icon={<DeliveredProcedureOutlined />} disabled={!agent.queueLoggedIn} onClick={agent.logout}>
                        Queue Logout
                    </Menu.Item>
                    <Menu.Item key="7" icon={<PauseCircleOutlined />} disabled={!agent.queueLoggedIn || agent.onBreak} onClick={() => setBreakModalVisible(true)}>
                        Break
                    </Menu.Item>
                    <Menu.Item key="8" icon={<PlayCircleOutlined />} disabled={!agent.onBreak} onClick={agent.unpause}>
                        Unbreak
                    </Menu.Item>
                </Menu>
            </Layout.Sider>

            <Layout className="dialer-layout">
                <Layout.Content className="dialer-content">
                    <section className="agent-dashboard" aria-label="Agent dashboard">
                        <div className="agent-status-strip">
                            <Tag color={sip.isRegistered ? 'green' : 'red'} icon={<PhoneOutlined />}>
                                {sip.isRegistered ? 'online' : 'offline'}
                            </Tag>
                            <div className="agent-status-meta">
                                <Tag icon={<UserOutlined />}>{authUser || '...'}</Tag>
                                <Tag icon={<ClockCircleOutlined />}>
                                    Login Time <TimerComponent active={agent.queueLoggedIn} title="Login Time" />
                                </Tag>
                                <Tag icon={<ClockCircleOutlined />}>
                                    Break Time <TimerComponent active={agent.onBreak} title="Break Time" />
                                </Tag>
                            </div>
                            <Tag color={sip.isConnected ? 'green' : 'red'} icon={<CodeSandboxOutlined />}>
                                {sip.isConnected ? 'online' : 'offline'}
                            </Tag>
                        </div>

                        <div className="agent-welcome">
                            <Typography.Title level={4}>
                                Welcome {agent.user?.name || sessionStorage.getItem('agent_username') || 'Agent'}!
                            </Typography.Title>
                            <Typography.Paragraph>
                                {sip.isRegistered ? (
                                    <>Your phone is <span className="status-word status-word--ready">registered</span>. Click the <StopOutlined /> icon to unregister your phone.</>
                                ) : (
                                    <>Click the <CodeOutlined /> icon to register your phone.</>
                                )}
                            </Typography.Paragraph>
                            {sip.isRegistered && (
                                <Typography.Paragraph>
                                    Click the <ClusterOutlined /> icon to {agent.queueLoggedIn ? 'view your queue status' : 'log in to queue(s)'}{' '}
                                    {agent.queues.length > 0 && (
                                        <span className="queue-name">[{agent.queues.join(', ')}]</span>
                                    )}{' '}
                                    and the <DeliveredProcedureOutlined /> icon to log out.
                                </Typography.Paragraph>
                            )}
                        </div>

                        <div className="agent-queue-status" role="table" aria-label="Queue and agent status">
                            <div className="status-cell status-cell--label" role="rowheader">Queue Status</div>
                            <div className="status-cell" role="cell">
                                <Tag color={agent.queueLoggedIn ? 'green' : 'volcano'}>
                                    {agent.queueLoggedIn ? 'LOGGED_IN' : 'NOT_LOGGED_IN'}
                                </Tag>
                            </div>
                            <div className="status-cell status-cell--label" role="rowheader">Agent Status</div>
                            <div className="status-cell" role="cell">
                                <Tag color={agent.queueLoggedIn && !agent.onBreak ? 'green' : 'volcano'}>
                                    {agent.onBreak ? 'PAUSED' : agent.queueLoggedIn ? 'READY' : 'NOT_READY'}
                                </Tag>
                            </div>
                            <div className="status-cell status-cell--label" role="rowheader">Reason</div>
                            <div className="status-cell" role="cell">{agent.onBreak ? agent.pauseReason : ''}</div>
                        </div>
                    </section>

                    <Card
                        className="script-panel"
                        title="Script"
                        extra={
                            <Tooltip title="Script refresh is not configured">
                                <Button aria-label="Refresh script" icon={<ReloadOutlined />} disabled />
                            </Tooltip>
                        }
                    >
                        <div className="script-panel-body" />
                    </Card>

                    {/* Active Call */}
                    <IncomingCall
                        number={sip.dialedNumber}
                        isConnected={sip.isCallConnected}
                        isHold={sip.isHold}
                        isMute={sip.isMute}
                        dtmfInput={sip.dtmfInput}
                        endCall={sip.endCall}
                        holdCall={sip.onHold}
                        unholdCall={sip.onUnhold}
                        muteCall={sip.onMute}
                        unmuteCall={sip.onUnmute}
                        onToggleBlind={() => { setTransferType('blind'); setTransferVisible(true); }}
                        onToggleAttended={() => { setTransferType('attended'); setTransferVisible(true); }}
                    />

                    {/* Drawers & Modals */}
                    <DialerMenu
                        visible={dialerVisible}
                        onClose={() => setDialerVisible(false)}
                        makeCall={sip.makeCall}
                        number={sip.dialedNumber}
                        setNumber={() => {}}
                        isConnected={sip.isCallConnected}
                        isHold={sip.isHold}
                        isMute={sip.isMute}
                        holdCall={sip.onHold}
                        unholdCall={sip.onUnhold}
                        muteCall={sip.onMute}
                        unmuteCall={sip.onUnmute}
                        endCall={sip.endCall}
                        dtmfInput={sip.sendDTMF}
                    />
                    <DialerAccount visible={accountVisible} onClose={() => setAccountVisible(false)} />

                    <NotReadyModal
                        visible={breakModalVisible}
                        reasons={agent.pauseReasons}
                        onCancel={() => setBreakModalVisible(false)}
                        onSubmit={agent.pause}
                    />

                    <TransferModal
                        visible={transferVisible}
                        transferType={transferType}
                        onCancel={() => setTransferVisible(false)}
                        onSubmit={onSubmitTransfer}
                        isConnected={sip.isTransferConnected}
                        isHold={sip.isTransferHold}
                        isMute={sip.isTransferMute}
                        onHold={sip.transferHold}
                        onUnhold={sip.transferUnhold}
                        onMute={sip.transferMute}
                        onUnmute={sip.transferUnmute}
                        onTransferHangup={sip.transferHangup}
                    />

                    <IncomingModal
                        visible={sip.isModalVisible}
                        number={sip.dialedNumber}
                        onAccept={sip.onCallAccept}
                        onReject={sip.endCall}
                        dtmfInput={sip.dtmfInput}
                    />

                    {/* Hidden audio elements */}
                    <audio ref={sip.mediaElementRef} style={{ display: 'none' }} />
                    <audio ref={sip.audioElementRef} loop style={{ display: 'none' }} />
                </Layout.Content>
            </Layout>
        </Layout>
    );
}