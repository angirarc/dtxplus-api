import type { NextFunction, Request, Response } from 'express';

import CallLog from '../models/call-log.model';

import { ApiError } from '../middleware/error-handler';
import CallService from '../services/call.service';

export const getCallLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const callLogs = await CallLog.find()

        res.status(200).json({
            success: true,
            data: callLogs
        });
    } catch (error) {
        next(error);
    }
}

export const getCallLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const callLog = await CallLog.findById(req.params.id)
            .populate('prescription')
            .populate('patient')
        if (!callLog) {
            return next(new ApiError(404, 'CallLog not found'));
        }

        res.status(200).json({
            success: true,
            data: callLog
        });
    } catch (error) {
        next(error);
    }
}

export const transcribeCall = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const callLog = await CallLog.findById(req.params.id)
            .populate('prescription')
            .populate('patient')
        if (!callLog) {
            return next(new ApiError(404, 'CallLog not found'));
        }
        const callService = new CallService(callLog);
        await callService.transcribeCall(req.body.url);
        res.status(201).json({
            success: true,
            data: callLog
        });
    } catch (error) {
        next(error);
    }
}

export const generateAudio = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const callLog = await CallLog.findById(req.params.id)
           .populate('prescription')
           .populate('patient')
        if (!callLog) {
            return next(new ApiError(404, 'CallLog not found'));
        }

        const callService = new CallService(callLog);
        await callService.generateAudio(req.body.text);
        res.status(201).json({
            success: true,
            data: callLog
        });
    } catch (error) {
        next(error);
    }
}