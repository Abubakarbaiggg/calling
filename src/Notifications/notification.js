import { notification } from 'antd';

const openNotificationWithIcon = (type, content) => {
    const validTypes = ['success', 'error', 'info', 'warning'];
    if (!validTypes.includes(type)) {
        console.error(`Invalid notification type: ${type}`);
        return;
    }
    notification[type]({
        message: type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info',
        description: content,
        placement: 'topRight',
    });
};

export default openNotificationWithIcon;