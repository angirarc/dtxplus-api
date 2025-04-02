import express from 'express';

import { protect } from '../middleware/auth.middleware';

import {
    getCallLogs,
    getCallLog,
    generateAudio,
    transcribeCall,
} from '../controllers/call-log.controller';

const router = express.Router();

// Routes accessible by all authenticated users
router.get('/', protect, getCallLogs);
router.get('/:id', protect, getCallLog);
router.post('/:id/generate', protect, generateAudio);
router.post('/:id/transcribe', protect, transcribeCall);

export default router;