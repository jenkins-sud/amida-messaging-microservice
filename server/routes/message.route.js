import express from 'express';
import validate from 'express-validation';
import passport from 'passport';
import paramValidation from '../../config/param-validation';
import messageCtrl from '../controllers/message.controller';

const router = express.Router(); // eslint-disable-line new-cap

router.use(passport.authenticate('jwt', { session: false }));

router.route('/send')
    .post(validate(paramValidation.sendMessage), messageCtrl.send);

router.route('/reply/:messageId')
    .post(validate(paramValidation.replyMessage), messageCtrl.reply);

/**
 * url params:
 * - limit: number of messages to return
 * - from: filter on message sender by username
 * - summary: boolean, can return a summary version of messages
 * - received: boolean, filters by received messages
 * - sent: boolean, filters by send messages
 * - unread: boolean, filters by unread messages
 * - offset: int, to be used with limit for pagination
 */
router.route('/list')
    .get(messageCtrl.list);

/**
 * url params:
 * - owner: username of owner of messages to count
 * - option: unread/all
 */
router.route('/count/')
    .get(messageCtrl.count);

router.route('/get/:messageId')
    .get(messageCtrl.get);

router.route('/delete/:messageId')
    .delete(messageCtrl.remove);

router.route('/archive/:messageId')
    .put(messageCtrl.archive);

router.route('/unarchive/:messageId')
    .put(messageCtrl.unarchive);

router.route('/markAsUnread/:messageId')
    .put(messageCtrl.markAsUnread);

router.route('/markAsRead/:messageId')
    .put(messageCtrl.markAsRead);

/** Load message when API with route parameter is hit */
router.param('messageId', messageCtrl.load);

export default router;
