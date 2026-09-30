import { Modal, Button } from 'antd';
import { PhoneFilled, CloseCircleFilled } from '@ant-design/icons';

export default function IncomingModal({ visible, number, onAccept, onReject, dtmfInput }) {
    return (
        <Modal
            title="Incoming Call"
            open={visible}
            onOk={onAccept}
            onCancel={onReject}
            maskClosable={false}
            centered
            keyboard={false}
            okText="Accept"
            cancelText="Reject"
            okButtonProps={{ icon: <PhoneFilled /> }}
            cancelButtonProps={{ icon: <CloseCircleFilled />, danger: true }}
        >
            <p style={{ fontSize: 18 }}>
                From: <strong>{number}</strong>
                {dtmfInput && <> (DTMF: {dtmfInput})</>}
            </p>
        </Modal>
    );
}