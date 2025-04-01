import express from 'express';

import { protect } from '../middleware/auth.middleware';

import {
    getPatients,
    getPatient,
    createPatient,
    updatePatient,
    deletePatient,
} from '../controllers/patient.controller';

const router = express.Router();

router.get('/', protect, getPatients);
router.get('/:id', protect, getPatient);
router.post('/', protect, createPatient);
router.put('/:id', protect, updatePatient);
router.delete('/:id', protect, deletePatient);

export default router;