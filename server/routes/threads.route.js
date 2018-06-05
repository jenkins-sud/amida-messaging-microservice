import express from 'express';
import passport from 'passport';

import threadsCtrl from '../controllers/threads.controller';

const router = express.Router(); // eslint-disable-line new-cap

router.use(passport.authenticate('jwt', { session: false }));

router.route('/')
    .post(threadsCtrl.create);

router.route('/')
    .get(threadsCtrl.index);

router.route('/:threadId/reply')
    .post(threadsCtrl.reply);

router.route('/:threadId')
    .get(threadsCtrl.show);

export default router;
