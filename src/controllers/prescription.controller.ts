import yup from 'yup';

import type { NextFunction, Request, Response } from 'express';

import Patient from '../models/patient.model';
import CallLog from '../models/call-log.model';
import Prescription from '../models/prescription.model';

import { CallLogStatus } from '../utils/types';
import { ApiError, handleControllerError } from '../middleware/error-handler';

const prescriptionSchema = yup.object().shape({
    patient: yup.string().required('Patient ID is required'),
    schedules: yup.array().of(
        yup.object().shape({
            drugName: yup.string()
                .required('Drug name is required')
                .max(50, 'Drug Name cannot be more than 50 characters')
                .trim(),
            dosage: yup.number()
                .required('Dosage is required')
                .positive('Dosage must be a positive number'),
            frequency: yup.number()
                .required('Frequency is required')
                .positive('Frequency must be a positive number'),
            duration: yup.number()
                .required('Duration is required')
                .positive('Duration must be a positive number'),
            durationUnit: yup.string()
                .required('Duration unit is required')
                .trim()
        })
    ).min(1, 'At least one schedule is required')
});

export const getPrescriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const prescriptions = await Prescription.find()

        res.status(200).json({
            success: true,
            data: prescriptions
        });
    } catch (error) {
        next(error);
    }
}

export const getPrescription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const prescription = await Prescription.findById(req.params.id).populate('patient');
        if (!prescription) {
            return next(new ApiError(404, 'Prescription not found'));
        }

        res.status(200).json({
            success: true,
            data: prescription
        });
    } catch (error) {
        next(error);
    }
}

export const createPrescription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let patient = await Patient.findById(req.body.patient);
        if (!patient) {
          return next(new ApiError(404, 'Patient not found'));
        }

        const validatedData = await prescriptionSchema.validate(req.body, { abortEarly: false });
        
        const prescription = await Prescription.create(validatedData);

        res.status(201).json({
            success: true,
            data: prescription
        });
    } catch (error) {
        return handleControllerError(error, next);
    }
}

export const updatePrescription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let prescription = await Prescription.findById(req.params.id);
        if (!prescription) {
          return next(new ApiError(404, 'Prescription not found'));
        }

        let patient = await Patient.findById(req.body.patient);
        if (!patient) {
          return next(new ApiError(404, 'Patient not found'));
        }

        const validatedData = await prescriptionSchema.validate(req.body, { abortEarly: false });
        
        prescription = await Prescription.create(validatedData);

        res.status(201).json({
            success: true,
            data: prescription
        });
    } catch (error) {
        return handleControllerError(error, next);
    }
}

export const deletePrescription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let prescription = await Prescription.findById(req.params.id);
        if (!prescription) {
          return next(new ApiError(404, 'Prescription not found'));
        }

        await Prescription.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: prescription
        });
    } catch (error) {
        return handleControllerError(error, next);
    }
}

export const makeCall = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const prescription = await Prescription.findById(req.params.id)
        if (!prescription) {
            return next(new ApiError(404, 'Prescription not found'));
        }

        const callLog = await CallLog.create({
            patient: prescription.patient,
            prescription: prescription._id,
            status: CallLogStatus.PENDING,
        })

        // Make a callLog to the patient
        // If the callLog is successful, update the callLog status to COMPLETED
        // Use speech to text to capture the patient's response & record it
        // Log CallLog ID, status (e.g., answered, voicemail left, SMS sent
        // If the callLog is unsuccessful, update the callLog status to FAILED
        // Attempt to leave voicemail, if voicemail not available, send SMS

        res.status(201).json({
            success: true,
            data: callLog
        });
    } catch (error) {
        return handleControllerError(error, next);
    }
}