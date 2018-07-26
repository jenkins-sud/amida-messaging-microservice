import express from 'express';
import passport from 'passport';

import threadCtrl from '../controllers/thread.controller';

const router = express.Router(); // eslint-disable-line new-cap

router.use(passport.authenticate('jwt', { session: false }));

router.route('/:originalMessageId')
    .get(threadCtrl.get);

router.route('/')
    .get(threadCtrl.list);

export default router;
