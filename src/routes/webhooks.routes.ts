import express from 'express';

import { handleCallInput, handleCallStatus } from '../controllers/webhooks.controller';

const router = express.Router();

router.post('/receive', handleCallInput);
router.post('/status', handleCallStatus);

export default router;