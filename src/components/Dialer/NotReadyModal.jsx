import { useState } from 'react';
import { Modal, Select } from 'antd';

export default function NotReadyModal({ visible, reasons, onCancel, onSubmit }) {
    const [selectedReason, setSelectedReason] = useState();
    const [submitting, setSubmitting] = useState(false);

    const options = reasons.map((reason, index) => {
        const name = typeof reason === 'string' ? reason : reason.name;
        return { label: name, value: name || String(index) };
    }).filter((reason) => reason.label);

    const close = () => {
        setSelectedReason(undefined);
        onCancel();
    };

    const submit = async () => {
        if (!selectedReason) return;
        setSubmitting(true);
        try {
            const success = await onSubmit(selectedReason);
            if (success) {
                close();
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={visible}
            title="Not Ready / Break"
            onCancel={close}
            onOk={submit}
            okText="Submit"
            confirmLoading={submitting}
            okButtonProps={{ disabled: !selectedReason || options.length === 0 }}
            centered
        >
            <Select
                aria-label="Break reason"
                placeholder={options.length ? 'Select a reason' : 'Waiting for break reasons...'}
                options={options}
                value={selectedReason}
                onChange={setSelectedReason}
                disabled={submitting || options.length === 0}
                style={{ width: '100%' }}
            />
        </Modal>
    );
}