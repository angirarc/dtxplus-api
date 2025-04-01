import express from 'express';

import { receiveCall, handleCallStatus } from '../controllers/webhooks.controller';

const router = express.Router();

router.post('/receive', receiveCall);
router.post('/status', handleCallStatus);

export default router;