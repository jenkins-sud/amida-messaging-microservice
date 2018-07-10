import Sequelize from 'sequelize';
import _ from 'lodash';
import config from './config';

let dbLogging;
if (config.env === 'test') {
    dbLogging = false;
} else {
    dbLogging = console.log;
}

const db = {};

// connect to postgres db
const sequelizeOptions = {
    dialect: 'postgres',
    port: config.postgres.port,
    host: config.postgres.host,
    logging: dbLogging,
};
if (config.postgres.ssl) {
    sequelizeOptions.ssl = config.postgres.ssl;
    if (config.postgres.ssl_ca_cert) {
        sequelizeOptions.dialectOptions = {
            ssl: {
                ca: config.postgres.ssl_ca_cert,
            },
        };
    }
}

const sequelize = new Sequelize(
    config.postgres.db,
    config.postgres.user,
    config.postgres.passwd,
    sequelizeOptions
);

const Message = sequelize.import('../server/models/message.model');
const User = sequelize.import('../server/models/user.model');
const Thread = sequelize.import('../server/models/thread.model');
const UserMessage = sequelize.import('../server/models/userMessage.model');
const UserThread = sequelize.import('../server/models/userThread.model');

// Threads
Thread.hasMany(Message);
Thread.hasOne(Message, { as: 'LastMessage' });
Thread.belongsToMany(User, { through: 'UserThread' });

// Messages
Message.belongsTo(Thread);
Message.belongsTo(User, { as: 'Sender' });
Message.belongsToMany(User, { through: 'UserMessage' });

// Users
User.belongsToMany(Thread, { through: 'UserThread' });
User.belongsToMany(Message, { through: 'UserMessage' });


db.Message = Message;
db.Thread = Thread;
db.User = User;
db.UserMessage = UserMessage;
db.UserThread = UserThread;

// assign the sequelize variables to the db object and returning the db.
module.exports = _.extend({
    sequelize,
    Sequelize,
}, db);
