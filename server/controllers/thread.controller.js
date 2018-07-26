import httpStatus from 'http-status';
import Sequelize from 'sequelize';
import db from '../../config/sequelize';
import APIError from '../helpers/APIError';

const Message = db.Message;

function get(req, res, next) {
    Message.scope({ method: ['forUser', req.user] })
        .findAll({
            where: {
                originalMessageId: req.params.originalMessageId,
            },
        })
        .then((messages) => {
            if (messages.length === 0) {
                const err = new APIError('Original message does not exist', 'MESSAGE_NOT_EXIST', httpStatus.NOT_FOUND, true);
                next(err);
            } else {
                res.send(messages);
            }
        })
        .catch(next);
}

function findFirstUnreadMessageId(thread, allMessages) {
    let minUnreadCreatedDate;
    let minUnreadMessageId;
    let j;
    for (j = 0; j < allMessages.length; j++) { // eslint-disable-line no-plusplus
        if (allMessages[j].originalMessageId !== thread.originalMessageId) {
            continue; // eslint-disable-line no-continue
        }
        if (minUnreadMessageId) {
            if (minUnreadCreatedDate > allMessages[j].createdAt) {
                minUnreadCreatedDate = allMessages[j].createdAt;
                minUnreadMessageId = allMessages[j].id;
            }
        } else {
            minUnreadMessageId = allMessages[j].id;
        }
    }
    return minUnreadMessageId;
}

function findLastReadMessageId(thread, allMessages) {
    let maxCreatedDate;
    let maxCreatedMessageId;
    let j;
    for (j = 0; j < allMessages.length; j++) { // eslint-disable-line no-plusplus
        if (allMessages[j].originalMessageId !== thread.originalMessageId) {
            continue; // eslint-disable-line no-continue
        }
        if (maxCreatedMessageId) {
            if (maxCreatedDate < allMessages[j].readAt) {
                maxCreatedDate = allMessages[j].readAt;
                maxCreatedMessageId = allMessages[j].id;
            }
        } else {
            maxCreatedMessageId = allMessages[j].id;
        }
    }
    return maxCreatedMessageId;
}

function findFirstSubjectText(thread, allMessages) {
    let minSubjectDate;
    let minSubject;
    let j;
    for (j = 0; j < allMessages.length; j++) { // eslint-disable-line no-plusplus
        if (allMessages[j].originalMessageId !== thread.originalMessageId) {
            continue;  // eslint-disable-line no-continue
        }
        if (!minSubjectDate || minSubjectDate > allMessages[j].createdAt) {
            minSubjectDate = allMessages[j].createdAt;
            minSubject = allMessages[j].subject;
        }
    }
    return minSubject;
}

function list(req, res, next) {
    const queryObject = {
        raw: true,
        where: {},
        order: [[Sequelize.fn('MAX', Sequelize.col('createdAt')), 'DESC']],
    };

    if (req.query.limit) {
        queryObject.limit = req.query.limit;
    }

    if (req.query.offset) {
        queryObject.offset = req.query.offset;
    }

    if (req.query.archived !== undefined) {
        queryObject.having =
            Sequelize.where(Sequelize.fn('bool_and', Sequelize.col('isArchived')),
            { $eq: req.query.archived }
        );
    }

    const from = [Sequelize.fn('ARRAY_AGG', Sequelize.fn('DISTINCT', Sequelize.col('from'))), 'from'];
    const originalMessageId = 'originalMessageId';
    const mostRecent = [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'mostRecent'];
    const count = [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'];
    const isArchived = [Sequelize.fn('bool_and', Sequelize.col('isArchived')), 'isArchived'];
    const unread = [Sequelize.fn('bool_or', (Sequelize.literal('CASE WHEN "readAt" IS NULL THEN true ELSE false END'))), 'unread'];
    const messageIds = [Sequelize.fn('ARRAY_AGG', Sequelize.col('id')), 'messageIds'];
    queryObject.group = 'originalMessageId';
    queryObject.attributes =
        [from, originalMessageId, mostRecent, count, isArchived, unread, messageIds];

    Message.scope({ method: ['forUser', req.user] })
        .findAndCountAll(queryObject)
        .then(({ rows: threadsResponse, count: findCount }) => {
            Message.scope({ method: ['forUser', req.user] })
            .findAll({ raw: true })
            .then((allMessages) => {
                const threads = threadsResponse;
                let i;
                for (i = 0; i < threads.length; i++) { // eslint-disable-line no-plusplus
                    threads[i].count = parseInt(threads[i].count, 10);
                    if (threads[i].unread) {
                        threads[i].refMessageId
                          = findFirstUnreadMessageId(threads[i], allMessages);
                    } else {
                        threads[i].refMessageId
                          = findLastReadMessageId(threads[i], allMessages);
                    }
                    threads[i].subject
                      = findFirstSubjectText(threads[i], allMessages);
                }
                res.send({ threads, count: findCount.length });
            });
        })
        .catch(next);
}

export default { get, list };
