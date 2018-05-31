import config from '../../config/config';
const Client = require('node-rest-client').Client;
const client = new Client();
/**
 * User Schema
 */
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        }
    });
    User.prototype.sendPushNotification = function(pushData) {
      const { username } = this;
      const authArgs = {
          headers: {"Content-Type": "application/json"},
          data: {
            username: config.microserviceAccessKey,
            password: config.microservicePassword
          }
      };
      client.post(`${config.authMicroService}/v0/auth/login`, authArgs, function (data, response) {
          const { token } = data;
          const pushNotificationArgs = {
              headers: {"Content-Type": "application/json", "Authorization":"Bearer " + token},
              data: {...pushData, username},
          };
          client.post(`${config.notificationMicroservice}/users/sendPushNotification`, pushNotificationArgs, function (data, response) {
          });
      });
    };
    // Class methods

    return User;
};
