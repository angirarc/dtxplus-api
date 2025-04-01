import express from 'express';

import { protect } from '../middleware/auth.middleware';

import {
    getCalls,
    getCall,
    makeCall,
} from '../controllers/call.controller';

const router = express.Router();

// Routes accessible by all authenticated users
router.get('/', protect, getCalls);
router.get('/:id', protect, getCall);
router.post('/:id', protect, makeCall);

export default router;