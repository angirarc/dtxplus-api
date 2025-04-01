import yup from 'yup';

import type { NextFunction, Request, Response } from 'express';

import Patient from '../models/patient.model';

import { ApiError, handleControllerError } from '../middleware/error-handler';

const patientSchema = yup.object().shape({
    name: yup.string().required('Patient name is required').max(100, 'Patient name cannot be more than 100 characters'),
    phone: yup.string().required('Patient phone is required').max(15, 'Patient phone cannot be more than 15 characters'),
    location: yup.string().required('Patient location is required').max(100, 'Patient location cannot be more than 100 characters'),
});

export const getPatients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const patients = await Patient.find()

        res.status(200).json({
            success: true,
            data: patients
        });
    } catch (error) {
        next(error);
    }
}

export const getPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const patient = await Patient.findById(req.params.id)
        if (!patient) {
            return next(new ApiError(404, 'Patient not found'));
        }

        res.status(200).json({
            success: true,
            data: patient
        });
    } catch (error) {
        next(error);
    }
}

export const createPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = await patientSchema.validate(req.body, { abortEarly: false });
        
        const patient = await Patient.create(validatedData);

        res.status(201).json({
            success: true,
            data: patient
        });
    } catch (error) {
        return handleControllerError(error, next);
    }
}

export const updatePatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let patient = await Patient.findById(req.params.id);
        if (!patient) {
          return next(new ApiError(404, 'Patient not found'));
        }

        const validatedData = await patientSchema.validate(req.body, { abortEarly: false });
        
        patient = await Patient.findByIdAndUpdate(
            req.params.id,
            validatedData,
            { new: true, runValidators: true }
        );

        res.status(201).json({
            success: true,
            data: patient
        });
    } catch (error) {
        return handleControllerError(error, next);
    }
}

export const deletePatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let patient = await Patient.findById(req.params.id);
        if (!patient) {
          return next(new ApiError(404, 'Patient not found'));
        }

        await Patient.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: patient
        });
    } catch (error) {
        return handleControllerError(error, next);
    }
}