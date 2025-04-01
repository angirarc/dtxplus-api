import yup from 'yup';

import type { NextFunction, Request, Response } from 'express';

import Call from '../models/call.model';
import Prescription from '../models/prescription.model';

import { ApiError, handleControllerError } from '../middleware/error-handler';
import { CallStatus } from '../utils/types';

export const getCalls = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const calls = await Call.find()

        res.status(200).json({
            success: true,
            data: calls
        });
    } catch (error) {
        next(error);
    }
}

export const getCall = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const call = await Call.findById(req.params.id)
            .populate('prescription')
            .populate('patient')
        if (!call) {
            return next(new ApiError(404, 'Call not found'));
        }

        res.status(200).json({
            success: true,
            data: call
        });
    } catch (error) {
        next(error);
    }
}

export const makeCall = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const prescription = await Prescription.findById(req.params.id)
        if (!prescription) {
            return next(new ApiError(404, 'Prescription not found'));
        }

        const call = await Call.create({
            patient: prescription.patient,
            prescription: prescription._id,
            status: CallStatus.PENDING,
        })

        res.status(201).json({
            success: true,
            data: call
        });
    } catch (error) {
        return handleControllerError(error, next);
    }
}