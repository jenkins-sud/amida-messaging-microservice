/* eslint-env mocha */

import request from 'supertest';
import httpStatus from 'http-status';
import chai, { expect } from 'chai';
// eslint-disable-next-line import/no-extraneous-dependencies
import chaiDatetime from 'chai-datetime';
// eslint-disable-next-line import/no-extraneous-dependencies
import chaiDateString from 'chai-date-string';
import { setTimeout } from 'timers';

import {
    Message,
} from '../../config/sequelize';
import { app, auth, auth2, baseURL } from './common.integration.js';

chai.use(chaiDatetime);
chai.use(chaiDateString);

const authBad = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InVzZXJCYWQiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJhZG1pbiI6dHJ1ZX0.Bht75P-tmchDXssNb58r8mzwe4rHpNZVNzYHQtzfp5k';

const testMessageFrom = 'user0';
const testMessageObject = {
    to: ['user1', 'user2'],
    subject: 'Test Message',
    message: 'Test post please ignore',
};

const testMessageArray = [];
const fromArray = ['user0', 'user1', 'user2', 'user3'];
const MessageUnscoped = Message.unscoped();
// 4 senders send message to 4 recipients each
fromArray.forEach((receiver) => {
    fromArray.forEach((sender) => {
        testMessageArray.push({
            to: fromArray,
            from: sender,
            subject: 'Test Message',
            message: 'Test post please ignore',
            owner: receiver,
        });
    });
});

describe('Message API:', () => {
    // run health check to ensure sync runs
    before((done) => {
        request(app)
            .get('/api/health-check')
            .expect(httpStatus.OK)
            .then(setTimeout(done, 1000));
    });

    // after(() => Message.destroy({truncate: true}));

    describe('POST /message/send', () => {
        it('should return OK', () => request(app)
            .post(`${baseURL}/message/send`)
            .set('Authorization', `Bearer ${auth}`)
            .send(testMessageObject)
            .expect(httpStatus.OK)
        );

        /**
         * Every recipient, plus the sender, gets their own version
         * of the message with the `owner` field set to their user ID.
         * Creating a message should return the sender's version of the message.
         */
        it('should return the sender\'s Message object', () => request(app)
            .post(`${baseURL}/message/send`)
            .set('Authorization', `Bearer ${auth}`)
            .send(testMessageObject)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body.to).to.deep.equal(testMessageObject.to);
                expect(res.body.from).to.equal(testMessageFrom);
                expect(res.body.owner).to.equal(testMessageFrom);
                expect(res.body.subject).to.equal(testMessageObject.subject);
                expect(res.body.message).to.equal(testMessageObject.message);
                return;
            })
        );

        it('should create new Messages in the DB', () => request(app)
            .post(`${baseURL}/message/send`)
            .set('Authorization', `Bearer ${auth}`)
            .send(testMessageObject)
            .expect(httpStatus.OK)
            .then(res => Message.findById(res.body.id)
                .then((message) => {
                    expect(message.subject).to.equal(testMessageObject.subject);
                    return Message
                        .findOne({ where: { owner: testMessageObject.to[0] } })
                        .then((foundMessage) => {
                            expect(foundMessage.from).to.equal(testMessageFrom);
                            expect(foundMessage.subject).to.equal(testMessageObject.subject);
                            expect(foundMessage.message).to.equal(testMessageObject.message);
                            return;
                        });
                })
            )
        );

        it('returned message should have a createdAt timestamp', () =>
            request(app)
                .post(`${baseURL}/message/send`)
                .set('Authorization', `Bearer ${auth}`)
                .send(testMessageObject)
                .expect(httpStatus.OK)
                .then(res => expect(res.body.createdAt).to.be.a('string'))
        );

        it('recipient message should have readAt set to NULL', () =>
            request(app)
                .post(`${baseURL}/message/send`)
                .set('Authorization', `Bearer ${auth}`)
                .send(testMessageObject)
                .expect(httpStatus.OK)
                .then(() => Message
                    .findOne({ where: { owner: testMessageObject.to[0] } })
                    .then(message => expect(message.readAt).to.be.a('null'))
                )
        );

        /**
         * Sent messages are considered read
         */
        it('sender message should have readAt set to createdAt time', () =>
            request(app)
                .post(`${baseURL}/message/send`)
                .set('Authorization', `Bearer ${auth}`)
                .send(testMessageObject)
                .expect(httpStatus.OK)
                .then(res => Message
                    .findById(res.body.id)  // do we need to define res.body.id outside?
                    .then((message) => {
                        expect(message.readAt).to.not.be.a('null');
                        expect(message.readAt).to.deep.equal(message.createdAt);
                        return;
                    })
                )
        );
    });

    describe('POST /message/reply/:messageId', () => {
        const goodReplyMessageObject = {
            to: ['user1', 'user0'],
            subject: 'RE: Test Message',
            message: 'Test reply please ignore',
        };

        const badReplyMessageObject = {
            to: ['user1', 'user0'],
            subject: 'RE: Test Message',
            message: 'Bad reply please ignore',
        };

        let messageId;
        let originalMessageId;

        before(() => request(app)
            .post(`${baseURL}/message/send`)
            .set('Authorization', `Bearer ${auth}`)
            .send(testMessageObject)
            .expect(httpStatus.OK)
            .then((origMsg) => {
                originalMessageId = origMsg.body.originalMessageId;
                return Message.scope({ method: ['forUser', { username: 'user2' }] })
                              .findOne({ where: { originalMessageId } });
            })
            .then((message) => {
                messageId = message.id;
                return;
            })
        );

        it('should return OK', () => request(app)
            .post(`${baseURL}/message/reply/${messageId}`)
            .set('Authorization', `Bearer ${auth2}`)
            .send(goodReplyMessageObject)
            .expect(httpStatus.OK)
        );

        it('should return the response message owned by the sender', () => request(app)
            .post(`${baseURL}/message/reply/${messageId}`)
            .set('Authorization', `Bearer ${auth2}`)
            .send(goodReplyMessageObject)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body.to).to.deep.equal(goodReplyMessageObject.to);
                expect(res.body.from).to.equal('user2');
                expect(res.body.owner).to.equal('user2');
                expect(res.body.subject).to.equal(goodReplyMessageObject.subject);
                expect(res.body.message).to.equal(goodReplyMessageObject.message);
                expect(res.body.originalMessageId).to.equal(originalMessageId);
                expect(res.body.parentMessageId).to.equal(messageId);
            })
        );

        it('should create new messages in the DB with appropriate threaded message IDs', () => request(app)
            .post(`${baseURL}/message/reply/${messageId}`)
            .set('Authorization', `Bearer ${auth2}`)
            .send(goodReplyMessageObject)
            .expect(httpStatus.OK)
            .then(() => {
                // Message 1: owned by respondent (user2)
                const m1 = Message.findOne({ where: {
                    owner: 'user2',
                    parentMessageId: messageId,
                } });

                // Message 2: owned by user0
                const m2 = Message.findOne({ where: {
                    owner: goodReplyMessageObject.to[0],
                    parentMessageId: messageId,
                } });

                // Message 3: owned by user1
                const m3 = Message.findOne({ where: {
                    owner: goodReplyMessageObject.to[1],
                    parentMessageId: messageId,
                } });

                return Promise.join(m1, m2, m3, (res1, res2, res3) => {
                    expect(res1.originalMessageId).to.equal(originalMessageId);
                    expect(res1.message).to.equal(goodReplyMessageObject.message);
                    expect(res2.originalMessageId).to.equal(originalMessageId);
                    expect(res2.message).to.equal(goodReplyMessageObject.message);
                    expect(res3.originalMessageId).to.equal(originalMessageId);
                    expect(res3.message).to.equal(goodReplyMessageObject.message);
                });
            })
        );

        it('should return an error if the messageId does not exist', () => request(app)
            .post(`${baseURL}/message/reply/99999`)
            .set('Authorization', `Bearer ${auth2}`)
            .send(goodReplyMessageObject)
            .expect(httpStatus.NOT_FOUND)
        );

        it('should not find the parent message if the sender was not a recipient, or sender, of the message specified', () => request(app)
            .post(`${baseURL}/message/reply/${messageId}`)
            .set('Authorization', `Bearer ${authBad}`)
            .send(badReplyMessageObject)
            .expect(httpStatus.NOT_FOUND)
        );

        it('sender should be able to reply to a message that they sent', () => request(app)
            .post(`${baseURL}/message/reply/${originalMessageId}`)
            .set('Authorization', `Bearer ${auth}`)
            .send(goodReplyMessageObject)
            .expect(httpStatus.OK)

        );

        it('should be able to archive, reply to, then unarchive a message', () => {
            request(app)
            .put(`${baseURL}/message/archive/${originalMessageId}`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .end(() => {
                request(app)
                .post(`${baseURL}/message/reply/${originalMessageId}`)
                .set('Authorization', `Bearer ${auth}`)
                .send(goodReplyMessageObject)
                .expect(httpStatus.OK)
                .end(() => {
                    request(app)
                    .put(`${baseURL}/message/unarchive/${originalMessageId}`)
                    .set('Authorization', `Bearer ${auth}`)
                    .expect(httpStatus.OK);
                });
            });
        });
    });

    // parameters: from, summary, limit
    describe('GET /message/list', () => {
        let userName;
        const limit = 2;
        const summary = true;

        before(() => Message
            .destroy({
                where: {},
                truncate: true,
            }).then(() => Message
                .bulkCreate(testMessageArray)
                .then((messages) => {
                    userName = messages[0].from;
                    return;
                })
            )
        );

        after(() => Message
            .destroy({
                where: {},
                truncate: true,
            })
        );

        it('should return OK', () => request(app)
            .get(`${baseURL}/message/list`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
        );

        // this cannot be tested correctly without auth microservice.
        // Just returning all messages for now, without considering the owner
        it('should return all Messages addressed to a user', () => request(app)
            .get(`${baseURL}/message/list`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body).to.be.an('array');
                expect(res.body.from).to.equal(testMessageArray.from);
                expect(res.body.to).to.equal(testMessageArray.to);
                return;
            })
        );

        it('has an option to limit Messages returned', () => request(app)
            .get(`${baseURL}/message/list?limit=${limit}`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body).to.be.an('array');
                expect(res.body.length).to.be.at.most(limit);
                return;
            })
        );

        it('has an option to offset Messages returned', () => request(app)
            .get(`${baseURL}/message/list?offset=${testMessageArray.length - 1}`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body).to.be.an('array');
                expect(res.body.length).to.be.at.most(1);
                return;
            })
        );

        it('has an option to limit by sender', () => request(app)
            .get(`${baseURL}/message/list?from=${userName}`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body).to.be.an('array');
                expect(res.body.length).to.not.equal(0);
                expect(res.body[0].from).to.equal(testMessageArray[0].from);
                expect(res.body[0].to).to.deep.equal(testMessageArray[0].to);
                return;
            })
        );

        it('has an option to filter by sent messages', () => request(app)
            .get(`${baseURL}/message/list?sent=true`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body).to.be.an('array');
                expect(res.body.length).to.not.equal(0);
                expect(() => {
                    let i;
                    for (i = 0; i < res.body.length; i++) { // eslint-disable-line no-plusplus
                        if (res.body[i].from !== userName) {
                            throw new Error(`${res.body[i].from} does not equal ${userName}`);
                        }
                    }
                }).to.not.throw();
                return;
            })
        );

        it('has an option to filter by received messages', () => request(app)
            .get(`${baseURL}/message/list?received=true`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body).to.be.an('array');
                expect(res.body.length).to.not.equal(0);
                expect(() => {
                    let i;
                    for (i = 0; i < res.body.length; i++) { // eslint-disable-line no-plusplus
                        if (!res.body[i].to.includes(userName)) {
                            throw new Error(`${res.body[i].to} does not contain ${userName}`);
                        }
                    }
                }).to.not.throw();
                return;
            })
        );

        it('has an option to filter by unread messages', () => request(app)
            .get(`${baseURL}/message/list?unread=true`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body).to.be.an('array');
                expect(res.body.length).to.not.equal(0);
                expect(() => {
                    let i;
                    for (i = 0; i < res.body.length; i++) { // eslint-disable-line no-plusplus
                        if (res.body[i].readAt) {
                            throw new Error(`${res.body[i].readAt} message was already read`);
                        }
                    }
                }).to.not.throw();
                return;
            })
        );

        it('has an option to return summaries', () => request(app)
            .get(`${baseURL}/message/list?summary=${summary}`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body).to.be.an('array');
                expect(res.body[0].from).to.equal(testMessageArray[0].from);
                expect(res.body[0].subject).to.be.a('string');
                expect(res.body[0].to).to.be.a('undefined');
                expect(res.body[0].message).to.be.a('undefined');
                return;
            })
        );
    });

    // describe('GET /message/count/:userId', function () {

    //     let userId;

    //     before(done => {
    //         Message.destroy({
    //             where: {},
    //             truncate: true
    //         }).then(() => {
    //             Message.create(testMessageObject)
    //                 .then(message => {
    //                     userId = message.from;
    //                     done();
    //                 });
    //         });
    //     });

    //     it('should return OK', done => {
    //         request(app)
    //             .get(baseURL + '/message/count' + userId)
    //             .expect(httpStatus.OK)
    //             .then(res => {
    //                 expect(res.text).to.equal('OK');
    //                 done();
    //             })
    //             .catch(done);
    //     });

    //     it('should return a count for total Messages', done => {
    //         request(app)
    //             .get(baseURL + '/message/count' + userId)
    //             .expect(httpStatus.OK)
    //             .then(res => {
    //                 expect(res.body.total).to.equal(1);
    //                 done();
    //             })
    //             .catch(done);
    //     });

    //     it('should return a count for unread Messages', done => {
    //         request(app)
    //             .get(baseURL + '/message/count' + userId)
    //             .expect(httpStatus.OK)
    //             .then(res => {
    //                 expect(res.body.unread).to.equal(1);
    //                 done();
    //             })
    //             .catch(done);
    //     });

    // });

    describe('GET /message/get/:messageId', () => {
        let messageId;

        before(() => request(app)
            .post(`${baseURL}/message/send`)
            .set('Authorization', `Bearer ${auth}`)
            .send(testMessageObject)
            .expect(httpStatus.OK)
            .then((message) => {
                messageId = message.body.id;
                return;
            })
        );

        it('should return OK', () => request(app)
            .get(`${baseURL}/message/get/${messageId}`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
        );

        it('should return the specified Message', () =>
            request(app)
                .get(`${baseURL}/message/get/${messageId}`)
                .set('Authorization', `Bearer ${auth}`)
                .expect(httpStatus.OK)
                .then(res => expect(res.body).to.deep.include(testMessageObject))
        );

        it('should mark the Message retrieved as read', () =>
            request(app)
                .get(`${baseURL}/message/get/${messageId}`)
                .set('Authorization', `Bearer ${auth}`)
                .expect(httpStatus.OK)
                .then(res => expect(res.body.readAt).to.be.a.dateString())
        );
    });

    describe('DELETE /message/delete/:messageId', () => {
        let messageId;

        beforeEach(() => Message
            .destroy({
                where: {},
                truncate: true,
            }).then(() => request(app)
                .post(`${baseURL}/message/send`)
                .set('Authorization', `Bearer ${auth}`)
                .send(testMessageObject)
                .expect(httpStatus.OK)
                .then((message) => {
                    messageId = message.body.id;
                    return;
                }))
        );

        it('should return OK', () => request(app)
                .delete(`${baseURL}/message/delete/${messageId}`)
                .set('Authorization', `Bearer ${auth}`)
                .expect(httpStatus.OK)
        );

        it('should return the deleted Message', () =>
            request(app)
                .delete(`${baseURL}/message/delete/${messageId}`)
                .set('Authorization', `Bearer ${auth}`)
                .expect(httpStatus.OK)
                .then(res => expect(res.body).to.deep.include(testMessageObject))
        );

        it('should delete the message from the DB', () =>
            request(app)
                .delete(`${baseURL}/message/delete/${messageId}`)
                .set('Authorization', `Bearer ${auth}`)
                .expect(httpStatus.OK)
                .then((res) => {
                    const id = res.body.id;
                    return Message
                        .findById(id)
                        .then(message => expect(message).to.be.a('null'));
                })
        );
    });

    describe('PUT /message/archive/:messageId', () => {
        let messageId;
        let archivedMessageId;
        let deletedMessageId;

        before(() => Message
                      .destroy({
                          where: {},
                          truncate: true,
                      }).then(() => request(app)
                .post(`${baseURL}/message/send`)
                .set('Authorization', `Bearer ${auth}`)
                .send(testMessageObject)
                .expect(httpStatus.OK)
                .then((message) => {
                    messageId = message.body.id;
                    return;
                }))
                .then(() => request(app)
                    .post(`${baseURL}/message/send`)
                    .set('Authorization', `Bearer ${auth}`)
                    .send(testMessageObject)
                    .expect(httpStatus.OK)
                    .then((messageToArchive) => {
                        archivedMessageId = messageToArchive.body.id;
                    }))
                .then(() => request(app)
                    .post(`${baseURL}/message/send`)
                    .set('Authorization', `Bearer ${auth}`)
                    .send(testMessageObject)
                    .expect(httpStatus.OK)
                    .then((messageToArchiveAndDelete) => {
                        deletedMessageId = messageToArchiveAndDelete.body.id;
                        return request(app)
                        .delete(`${baseURL}/message/delete/${deletedMessageId}`)
                        .set('Authorization', `Bearer ${auth}`)
                        .expect(httpStatus.OK);
                    }))
        );

        it('should archive and return message', () =>
            request(app)
                .put(`${baseURL}/message/archive/${messageId}`)
                .set('Authorization', `Bearer ${auth}`)
                .expect(httpStatus.OK)
                .then((res) => {
                    expect(res.body).to.deep.include(testMessageObject);
                    const id = res.body.id;
                    return MessageUnscoped
                        .findById(id)
                        .then(message => expect(message.isArchived).to.equal(true));
                })
        );

        it('should delete the archived message', () =>
            request(app)
                .delete(`${baseURL}/message/delete/${messageId}`)
                .set('Authorization', `Bearer ${auth}`)
                .expect(httpStatus.OK)
                .then(() => MessageUnscoped
                    .findById(messageId)
                    .then((message) => {
                        expect(message.isArchived).to.equal(true);
                        expect(message.isDeleted).to.equal(true);
                        return;
                    })
                )
        );

        it('should unarchive and return message', () => request(app)
            .put(`${baseURL}/message/unarchive/${archivedMessageId}`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((res) => {
                expect(res.body).to.deep.include(testMessageObject);
                const id = res.body.id;
                return MessageUnscoped
                        .findById(id)
                        .then(message => expect(message.isArchived).to.equal(false));
            })
        );

        it('should not unarchive deleted messages', () => request(app)
            .put(`${baseURL}/message/unarchive/${deletedMessageId}`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.NOT_FOUND));

        after(() => Message
            .destroy({
                where: {},
                truncate: true,
            })
        );
    });

    describe('PUT /message/markAsUnread/:messageId', () => {
        let messageId;

        before(() => Message
                      .destroy({
                          where: {},
                          truncate: true,
                      }).then(() => request(app)
                .post(`${baseURL}/message/send`)
                .set('Authorization', `Bearer ${auth}`)
                .send(testMessageObject)
                .expect(httpStatus.OK)
                .then((message) => {
                    messageId = message.body.id;
                    expect(message.body.readAt).is.a('string');
                })));

        it('should mark a message as unread', () => request(app)
            .get(`${baseURL}/message/get/${messageId}`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((message) => {
                expect(message.body.readAt).is.a('string');
            })
            .then(() => request(app)
                .put(`${baseURL}/message/markAsUnread/${messageId}`)
                .set('Authorization', `Bearer ${auth}`)
                .expect(httpStatus.OK)
                .then((message) => {
                    expect(message.body.readAt).is.a('null');
                })));

        it('should 404 if not found', () => request(app)
            .put(`${baseURL}/messages/markAsRead/-1`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.NOT_FOUND));
    });

    describe('PUT /message/markAsRead/:messageId', () => {
        let messageId;

        before(() => Message
                      .destroy({
                          where: {},
                          truncate: true,
                      }).then(() => request(app)
                .post(`${baseURL}/message/send`)
                .set('Authorization', `Bearer ${auth}`)
                .send(testMessageObject)
                .expect(httpStatus.OK)
                .then((message) => {
                    messageId = message.body.id;
                    expect(message.body.readAt).is.a('string');
                }))
                .then(() => request(app)
                    .put(`${baseURL}/message/markAsUnread/${messageId}`)
                    .set('Authorization', `Bearer ${auth}`)
                    .expect(httpStatus.OK)
                    .then((message) => {
                        expect(message.body.readAt).is.a('null');
                    }))
        );

        it('should mark a message as read', () => request(app)
            .put(`${baseURL}/message/markAsRead/${messageId}`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.OK)
            .then((message) => {
                expect(message.body.readAt).is.a('string');
            }));

        it('should 404 if not found', () => request(app)
            .put(`${baseURL}/messages/markAsRead/-1`)
            .set('Authorization', `Bearer ${auth}`)
            .expect(httpStatus.NOT_FOUND));
    });
});
