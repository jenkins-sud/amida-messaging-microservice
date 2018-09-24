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
if (config.postgres.sslEnabled) {
    sequelizeOptions.ssl = config.postgres.sslEnabled;
    if (config.postgres.sslCaCert) {
        sequelizeOptions.dialectOptions = {
            ssl: {
                ca: config.postgres.sslCaCert,
            },
        };
    }
}

const sequelize = new Sequelize(
    config.postgres.db,
    config.postgres.user,
    config.postgres.password,
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

User.hasMany(UserThread);


db.Message = Message;
db.Thread = Thread;
db.User = User;
db.UserMessage = UserMessage;
db.UserThread = UserThread;

// Run sql command to add new column, update lastMessageId column for those who are using Messaging API already
// eslint-disable-next-line no-unused-vars
sequelize.query('ALTER TABLE "UserThreads" DROP COLUMN IF EXISTS "isLog"; ALTER TABLE "Threads" ADD COLUMN IF NOT EXISTS "logUserId" integer DEFAULT NULL; ALTER TABLE "Threads" ADD COLUMN IF NOT EXISTS "lastMessageId" INTEGER; UPDATE "Threads" T1 SET "lastMessageId" = T2."MessageId" FROM ( SELECT max(id) "MessageId", "ThreadId" FROM "Messages" Group By "ThreadId" ) T2 WHERE T1."id" = T2."ThreadId" and "lastMessageId" is null;');


// assign the sequelize variables to the db object and returning the db.
module.exports = _.extend({
    sequelize,
    Sequelize,
}, db);
