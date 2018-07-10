import config from '../../config/config';
const Client = require('node-rest-client').Client;
const client = new Client();

function sendPushNotifications(pushData) {
    if (!config.enablePushNotifications) return;
    const authArgs = {
        headers: { 'Content-Type': 'application/json' },
        data: {
            username: config.microserviceAccessKey,
            password: config.microservicePassword,
        },
    };
    client.post(`${config.authMicroService}/v1/auth/login`, authArgs, (data, response) => {
        const { token } = data;
        const pushNotificationArgs = {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            data: { pushData },
        };
        client.post(`${config.notificationMicroservice}/notifications/sendPushNotifications`, pushNotificationArgs, (data, response) => {
        });
    });
}

export default {
    sendPushNotifications,
};
