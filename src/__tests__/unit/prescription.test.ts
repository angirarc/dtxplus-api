import { expect, jest } from '@jest/globals';
import type { Request, Response } from 'express';

import { ApiError } from '../../middleware/error-handler';
import {
  getPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription
} from '../../controllers/prescription.controller';
import Prescription from '../../models/prescription.model';
import Patient from '../../models/patient.model';

// Mock dependencies
jest.mock('../../models/prescription.model');
jest.mock('../../models/patient.model');

describe('Prescription Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock request, response, and next
    mockRequest = {
      params: {},
      body: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });
  
  describe('getPrescriptions', () => {
    it('should return all prescriptions', async () => {
      const mockPrescriptions = [
        { _id: 'prescription-id-1', patient: 'patient-id-1', schedules: [] },
        { _id: 'prescription-id-2', patient: 'patient-id-2', schedules: [] }
      ];
      
      // Mock Prescription.find
      (Prescription.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPrescriptions)
      });
      
      await getPrescriptions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(Prescription.find).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPrescriptions
      });
    });
    
    it('should handle errors', async () => {
      const error = new Error('Database error');
      
      // Mock Prescription.find to throw an error
      (Prescription.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockRejectedValue(error)
      });
      
      await getPrescriptions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
  
  describe('getPrescription', () => {
    it('should return a prescription by ID', async () => {
      const mockPrescription = {
        _id: 'prescription-id-1',
        patient: 'patient-id-1',
        schedules: []
      };
      
      // Set request params
      mockRequest.params = { id: 'prescription-id-1' };
      
      // Mock Prescription.findById
      (Prescription.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPrescription)
      });
      
      await getPrescription(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(Prescription.findById).toHaveBeenCalledWith('prescription-id-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPrescription
      });
    });
    
    it('should return 404 if prescription not found', async () => {
      // Set request params
      mockRequest.params = { id: 'nonexistent-id' };
      
      // Mock Prescription.findById
      (Prescription.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });
      
      await getPrescription(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Prescription not found'
        })
      );
    });
  });
  
  describe('createPrescription', () => {
    it('should create a new prescription', async () => {
      const mockPatient = { _id: 'patient-id-1', name: 'Test Patient' };
      const mockPrescription = {
        _id: 'prescription-id-1',
        patient: 'patient-id-1',
        schedules: [
          {
            drugName: 'Test Drug',
            dosage: 1,
            frequency: 2,
            duration: 7,
            durationUnit: 'days'
          }
        ]
      };
      
      // Set request body
      mockRequest.body = {
        patient: 'patient-id-1',
        schedules: [
          {
            drugName: 'Test Drug',
            dosage: 1,
            frequency: 2,
            duration: 7,
            durationUnit: 'days'
          }
        ]
      };
      
      // Mock Patient.findById
      (Patient.findById as jest.Mock).mockResolvedValue(mockPatient);
      
      // Mock Prescription.create
      (Prescription.create as jest.Mock).mockResolvedValue(mockPrescription);
      
      await createPrescription(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(Patient.findById).toHaveBeenCalledWith('patient-id-1');
      expect(Prescription.create).toHaveBeenCalledWith(expect.objectContaining({
        patient: 'patient-id-1',
        schedules: expect.arrayContaining([
          expect.objectContaining({
            drugName: 'Test Drug'
          })
        ])
      }));
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPrescription
      });
    });
    
    it('should return 404 if patient not found', async () => {
      // Set request body
      mockRequest.body = {
        patient: 'nonexistent-id',
        schedules: [
          {
            drugName: 'Test Drug',
            dosage: 1,
            frequency: 2,
            duration: 7,
            durationUnit: 'days'
          }
        ]
      };
      
      // Mock Patient.findById
      (Patient.findById as jest.Mock).mockResolvedValue(null);
      
      await createPrescription(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(Patient.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Patient not found'
        })
      );
    });
  });
  
  describe('updatePrescription', () => {
    it('should update an existing prescription', async () => {
      const mockPatient = { _id: 'patient-id-1', name: 'Test Patient' };
      const mockPrescription = {
        _id: 'prescription-id-1',
        patient: 'patient-id-1',
        schedules: [],
        save: jest.fn().mockResolvedValue({
          _id: 'prescription-id-1',
          patient: 'patient-id-1',
          schedules: [
            {
              drugName: 'Updated Drug',
              dosage: 2,
              frequency: 3,
              duration: 10,
              durationUnit: 'days'
            }
          ]
        })
      };
      
      // Set request params and body
      mockRequest.params = { id: 'prescription-id-1' };
      mockRequest.body = {
        patient: 'patient-id-1',
        schedules: [
          {
            drugName: 'Updated Drug',
            dosage: 2,
            frequency: 3,
            duration: 10,
            durationUnit: 'days'
          }
        ]
      };
      
      // Mock Prescription.findById
      (Prescription.findById as jest.Mock).mockResolvedValue(mockPrescription);
      
      // Mock Patient.findById
      (Patient.findById as jest.Mock).mockResolvedValue(mockPatient);
      
      await updatePrescription(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(Prescription.findById).toHaveBeenCalledWith('prescription-id-1');
      expect(Patient.findById).toHaveBeenCalledWith('patient-id-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          _id: 'prescription-id-1',
          schedules: expect.arrayContaining([
            expect.objectContaining({
              drugName: 'Updated Drug'
            })
          ])
        })
      });
    });
    
    it('should return 404 if prescription not found', async () => {
      // Set request params and body
      mockRequest.params = { id: 'nonexistent-id' };
      mockRequest.body = {
        patient: 'patient-id-1',
        schedules: []
      };
      
      // Mock Prescription.findById
      (Prescription.findById as jest.Mock).mockResolvedValue(null);
      
      await updatePrescription(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(Prescription.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Prescription not found'
        })
      );
    });
    
    it('should return 404 if patient not found', async () => {
      const mockPrescription = {
        _id: 'prescription-id-1',
        patient: 'patient-id-1',
        schedules: []
      };
      
      // Set request params and body
      mockRequest.params = { id: 'prescription-id-1' };
      mockRequest.body = {
        patient: 'nonexistent-id',
        schedules: []
      };
      
      // Mock Prescription.findById
      (Prescription.findById as jest.Mock).mockResolvedValue(mockPrescription);
      
      // Mock Patient.findById
      (Patient.findById as jest.Mock).mockResolvedValue(null);
      
      await updatePrescription(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      expect(Prescription.findById).toHaveBeenCalledWith('prescription-id-1');
      expect(Patient.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Patient not found'
        })
      );
    });
  });
});