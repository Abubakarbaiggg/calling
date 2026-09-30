import { Card, Descriptions, Tag } from 'antd';
import { forwardRef, useImperativeHandle } from 'react';
import { ENV } from '../../config/env';

/**
 * DialerConfig gives parent access to SIP register/unregister via ref.
 * Adjust to your actual config source (env / API).
 */
const DialerConfig = forwardRef((props, ref) => {
    const sipDomain = ENV.SIP_DOMAIN;
    const wssPort = ENV.SIP_PORT;

    useImperativeHandle(ref, () => ({
        sipDomain,
        wssPort,
        registerPhone: props.registerPhone,
        unregisterPhone: props.unregisterPhone,
        isRegistered: props.isRegistered,
    }));

    return (
        <Card size="small" title="SIP Configuration">
            <Descriptions column={1} size="small">
                <Descriptions.Item label="Domain">
                    <Tag color="blue">{sipDomain}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="WSS Port">
                    <Tag color="blue">{wssPort}</Tag>
                </Descriptions.Item>
            </Descriptions>
        </Card>
    );
});

export default DialerConfig;