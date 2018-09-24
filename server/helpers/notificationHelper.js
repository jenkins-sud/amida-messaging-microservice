import config from '../../config/config';

const Client = require('node-rest-client').Client;

const client = new Client();

function sendPushNotifications(pushData) {
    if (!config.pushNotificationsEnabled) return;
    const authArgs = {
        headers: { 'Content-Type': 'application/json' },
        data: {
            username: config.microserviceAccessKey,
            password: config.microservicePassword,
        },
    };
    // eslint-disable-next-line no-unused-vars
    client.post(`${config.authMicroService}/auth/login`, authArgs, (data, response) => {
        const { token } = data;
        const pushNotificationArgs = {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            data: { pushData },
        };
        // eslint-disable-next-line no-unused-vars
        client.post(`${config.notificationMicroservice}/notifications/sendPushNotifications`, pushNotificationArgs, (_data, response) => {
        });
    });
}

export default {
    sendPushNotifications,
};
