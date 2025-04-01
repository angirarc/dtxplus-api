import express from 'express';

import { receiveCall, handleCallStatusUpdate } from '../controllers/webhooks.controller';

const router = express.Router();

router.post('/receive', receiveCall);
router.post('/status', handleCallStatusUpdate);

export default router;