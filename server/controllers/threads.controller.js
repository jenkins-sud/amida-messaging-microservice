import httpStatus from 'http-status';
import Promise from 'bluebird';
import db from '../../config/sequelize';
import APIError from '../helpers/APIError';
import Sequelize from 'sequelize';
import notificationHelper from '../helpers/notificationHelper'

const Message = db.Message;
const Thread = db.Thread;
const User = db.User;
const UserThread = db.UserThread;
const sequelize = db.sequelize;
const Op = Sequelize.Op;

function notifyUsers(users, sender, message) {
  const pushNotificationArray = [];
  users.forEach((user) => {
    if(user.username !== sender.username) {
      const pushNotificationData = {
        username: user.username,
        notificationType: 'New Message',
        data: {
          title: `${sender.username} sent you a message`,
          body: message.message,
        }
      };
      pushNotificationArray.push(pushNotificationData);
    }
  });
  notificationHelper.sendPushNotifications(pushNotificationArray);
}

/**
 * Start  a new thread
 * @property {Array} req.body.participants - Array of usernames to include in the thread.
 * @property {string} req.body.subject - Subject line of the message
 * @property {string} req.body.message - Body of the message
 * @property {string} req.body.topic - Topic of the thread
 * @returns {Message}
 */
function create(req, res, next) {
    const { username } = req.user;
    const participants = req.body.participants;
    let users = [];
    let userPromises = [];
    let date = new Date();
    participants.forEach((participant) => {
      let userPromise = User.findOrCreate({where: {username: participant}})
      .spread((user, created) => {
        users.push(user);
      });
      userPromises.push(userPromise);
    });

    Promise.all(userPromises).then(() => {
      Thread.create({
        topic: req.body.topic,
        lastMessageSent: date
      }).then((thread) => {
        thread.setUsers(users);
        const sender = users.find(sender => {
          return sender.username === username;
        })
        Message.create({
          from: username,
          to: [],
          owner: '',
          subject: '',
          message: req.body.message,
          SenderId: sender.id,
          ThreadId: thread.id,
          LastMessageId: thread.id //adding this while creating is okay as this is the first message in thread
        }).then((message) => {
          // I simply passed the LastMessageId and ThreadId properties while creating
          // the message as alternative to calling the methods below to save the extra db operation
          // thread.addMessage(message);
          // thread.setLastMessage(message); EG
          thread.update({
            lastMessageId: message.id
          });
          let addUserMessagePromises = [];
          users.forEach((user) => {
            let addUserMessagePromise = user.addMessage(message).then(() => {
            });
            addUserMessagePromises.push(addUserMessagePromise);
          });
          Promise.all(addUserMessagePromises).then(() => {
            notifyUsers(users, sender, message);
            res.send({message});
          })
        })
      });
    })
}

/**
 * Replies to an existing thread
 * @property {string} req.body.message - Body of the message
 * @property {Number} req.params.threadId - DB ID of the thread being replied to
 * @returns {Message}
 */
function reply(req, res, next) {
  let date = new Date();
  Thread.findById(req.params.threadId)
    .then((thread) => {
      if (!thread) {
          const err = new APIError('Thread does not exist', httpStatus.NOT_FOUND, true);
          return next(err);
      }
      const { username } = req.user;
      User.findOne({where: {username}}).then(currentUser => {
        Message.create({
            from: username,
            to: [],
            owner: '',
            subject: '',
            message: req.body.message,
            SenderId: currentUser.id //set sender id while creating instead of doing message.setSender(currentUser) later
        }).then((message) => {
          thread.addMessage(message);
          thread.setLastMessage(message);
          thread.update({
            lastMessageSent: date,
            lastMessageId: message.id
          }).then(() => {});
          UserThread.update({
            lastMessageRead: false,
          }, {
            where: {
              ThreadId: thread.id,
              UserId: {
                [Op.ne]: currentUser.id
              }
            }
          });
          thread.getUsers().then((users) => {
            const addUserMessagePromises = [];
            users.forEach((user) => {
              const addUserMessagePromise = user.addMessage(message).then(() => {

              });
              addUserMessagePromises.push(addUserMessagePromise);
            });
            Promise.all(addUserMessagePromises).then(() => {
              notifyUsers(users, currentUser, message);
              res.send({message})
            })
          })
        })
      })
    })
    .catch(e => next(e));
}

/**
 * Returns messages for a thread
 * @property {Number} req.params.threadId - DB ID of the thread
 * @returns {[Message]}
 */
function show(req, res, next) {
  Thread.findById(req.params.threadId)
    .then((thread) => {
      if (!thread) {
          const err = new APIError('Thread does not exist', httpStatus.NOT_FOUND, true);
          return next(err);
      }
      const { username } = req.user;
      User.findOne({where: {username}}).then(currentUser => {
        UserThread.update({
          lastMessageRead: true,
        }, {
          where: {
            ThreadId: thread.id,
            UserId: currentUser.id
          }
        });
      })
      thread.getMessages({
        include: [{
          association: 'Sender'
        }],
        //Order messages here by ascending. Table assigns id in chronological order as messages are created
        order: [
          ['id', 'ASC']
        ]
        }).then(messages => {
          res.send(messages)
      })
    })
    .catch(e => next(e));
}

/**
 * Returns a the current user and a list of the current user's threads
 * @returns {User}
 */
function index(req, res, next) {
  const { username } = req.user;
  const { logUsername } = req.query;


  if( username === logUsername ) {
    // User.findOne({
    //   where: {username: logUsername}
    //   })
    //   .then((user) => {
    //     if (!user) {
    //         const err = new APIError('There are no threads for the current user', httpStatus.NOT_FOUND, true);
    //         return next(err);
    //     }
    //     user.getThreads({
    //       include:[{
    //         model: Message,
    //         as: 'LastMessage',
    //         include: [{
    //           association: 'Sender'
    //         }]
    //       }],
    //       order: [
    //       ['lastMessageSent', 'DESC']]
    //     }).then(threads => {
    //
    //       res.send(threads)
    //     })
    //   })
    sequelize.query('SELECT * FROM "Users" as A inner join "UserThreads" as UserThread on A."id" = UserThread."UserId" inner join "Threads" as E on UserThread."ThreadId" = E."id" inner join "Messages" as LastMessage on E."lastMessageId" = LastMessage."id" Where A.username = :username Order By "lastMessageSent" DESC',
      { replacements: { username: username }, type: sequelize.QueryTypes.SELECT
    }).then(logData => {
      if (!logData) {
          const err = new APIError('There are no threads for the current user', httpStatus.NOT_FOUND, true);
          return next(err);
      }
        res.send(logData)
    })
    .catch(e => next(e));
  } else {
    sequelize.query('SELECT * FROM "Users" as A inner join "UserThreads" as UserThread on A."id" = UserThread."UserId" inner join "UserThreads" as C on C."ThreadId" = UserThread."ThreadId" and UserThread."UserId" != C."UserId" inner join "Users" as D on C."UserId" = D."id" inner join "Threads" as E on UserThread."ThreadId" = E."id" inner join "Messages" as LastMessage on E."lastMessageId" = LastMessage."id" Where A.username = :username and  D.username = :logUsername Order By "lastMessageSent" DESC',
      { replacements: { username: username, logUsername: logUsername }, type: sequelize.QueryTypes.SELECT
    }).then(logData => {
      if (!logData) {
          const err = new APIError('There are no threads for the current user', httpStatus.NOT_FOUND, true);
          return next(err);
      }
        res.send(logData)
    })
    .catch(e => next(e));

    // User.findAll({
    //   include:[{
    //     model: UserThread,
    //     include:[{
    //       model: Thread,
    //       on: {
    //            col1: sequelize.where(sequelize.col("UserThread.ThreadId"), "=", sequelize.col("Thread.Id")),
    //        },
    //
    //     }],
    //   }],
    //
    //   where: {username: logUsername}
    //
    // }).then(threads => {
    //   console.log('This is called!')
    //   console.log(threads)
    //   res.send(threads)
    // })


  }
}

export default {
    create,
    reply,
    show,
    index
};
