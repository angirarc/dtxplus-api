import express from 'express';

import { receiveCall, leaveVoiceMail, handleCallStatusUpdate } from '../controllers/webhooks.controller';

const router = express.Router();

router.post('/receive', receiveCall);
router.post('/voicemail', leaveVoiceMail);
router.post('/status', handleCallStatusUpdate);

export default router;