import express from 'express';

import { protect } from '../middleware/auth.middleware';

import {
    getPrescriptions,
    getPrescription,
    createPrescription,
    updatePrescription,
    deletePrescription,
    initiateCall,
} from '../controllers/prescription.controller';

const router = express.Router();

router.get('/', protect, getPrescriptions);
router.get('/:id', protect, getPrescription);
router.post('/:id/call', protect, initiateCall);
router.post('/', protect, createPrescription);
router.put('/:id', protect, updatePrescription);
router.delete('/:id', protect, deletePrescription);

export default router;