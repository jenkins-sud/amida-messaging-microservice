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
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        indexes: [
            {
                fields: ['uuid'],
            },
        ],
    });
    // Class methods
    return User;
};
