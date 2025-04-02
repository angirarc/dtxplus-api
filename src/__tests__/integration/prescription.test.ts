// import jest from 'jest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { expect, jest } from '@jest/globals';

import { errorHandler } from '../../middleware/error-handler';
import prescriptionRoutes from '../../routes/prescription.routes';
import Patient from '../../models/patient.model';
import Prescription from '../../models/prescription.model';
import CallLog from '../../models/call-log.model';
import User from '../../models/user.model';
import CallService from '../../services/call.service';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../services/call.service');

// Create a test app
const app = express();
app.use(express.json());
app.use('/prescriptions', prescriptionRoutes);
app.use(errorHandler);

describe('Prescription API', () => {
  let authToken: string;
  let patientId: string;
  let prescriptionId: string;
  
  beforeAll(async () => {
    // Mock JWT verification
    (jwt.verify as jest.Mock).mockImplementation(() => ({
      id: 'test-user-id',
      email: 'test@example.com'
    }));
    
    // Create test user
    await User.create({
      _id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword'
    });
    
    // Create test patient
    const patient = await Patient.create({
      name: 'Test Patient',
      phone: '+15551234567',
      location: 'Test Location'
    });
    patientId = (patient._id as string).toString();
    
    // Create auth token
    authToken = 'Bearer test-token';
    
    // Mock CallService methods
    (CallService.prototype.makeCall as jest.Mock).mockResolvedValue(undefined);
  });
  
  afterAll(async () => {
    // Clean up test data
    await CallLog.deleteMany({});
    await Prescription.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});
  });
  
  describe('POST /prescriptions', () => {
    it('should create a new prescription', async () => {
      const prescriptionData = {
        patient: patientId,
        schedules: [
          {
            drugName: 'Medication A',
            dosage: 1,
            frequency: 2,
            duration: 7,
            durationUnit: 'days'
          }
        ]
      };
      
      const response = await request(app)
        .post('/prescriptions')
        .set('Authorization', authToken)
        .send(prescriptionData);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.schedules[0].drugName).toBe('Medication A');
      
      prescriptionId = response.body.data._id;
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/prescriptions')
        .set('Authorization', authToken)
        .send({
          // Missing patient and schedules
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 404 if patient does not exist', async () => {
      const response = await request(app)
        .post('/prescriptions')
        .set('Authorization', authToken)
        .send({
          patient: '60f1a5c5f32d8a2a58b7a123', // Non-existent ID
          schedules: [
            {
              drugName: 'Medication A',
              dosage: 1,
              frequency: 2,
              duration: 7,
              durationUnit: 'days'
            }
          ]
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Patient not found');
    });
  });
  
  describe('GET /prescriptions', () => {
    it('should get all prescriptions', async () => {
      const response = await request(app)
        .get('/prescriptions')
        .set('Authorization', authToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
  
  describe('GET /prescriptions/:id', () => {
    it('should get a prescription by ID', async () => {
      const response = await request(app)
        .get(`/prescriptions/${prescriptionId}`)
        .set('Authorization', authToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(prescriptionId);
      expect(response.body.data).toHaveProperty('schedules');
    });
    
    it('should return 404 for non-existent prescription', async () => {
      const response = await request(app)
        .get('/prescriptions/60f1a5c5f32d8a2a58b7a123') // Non-existent ID
        .set('Authorization', authToken);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Prescription not found');
    });
  });
  
  describe('PUT /prescriptions/:id', () => {
    it('should update a prescription', async () => {
      const updatedData = {
        patient: patientId,
        schedules: [
          {
            drugName: 'Updated Medication',
            dosage: 2,
            frequency: 3,
            duration: 10,
            durationUnit: 'days'
          }
        ]
      };
      
      const response = await request(app)
        .put(`/prescriptions/${prescriptionId}`)
        .set('Authorization', authToken)
        .send(updatedData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schedules[0].drugName).toBe('Updated Medication');
      expect(response.body.data.schedules[0].dosage).toBe(2);
    });
    
    it('should return 404 if prescription does not exist', async () => {
      const response = await request(app)
        .put('/prescriptions/60f1a5c5f32d8a2a58b7a123') // Non-existent ID
        .set('Authorization', authToken)
        .send({
          patient: patientId,
          schedules: []
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Prescription not found');
    });
    
    it('should return 404 if patient does not exist', async () => {
      const response = await request(app)
        .put(`/prescriptions/${prescriptionId}`)
        .set('Authorization', authToken)
        .send({
          patient: '60f1a5c5f32d8a2a58b7a123', // Non-existent ID
          schedules: []
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Patient not found');
    });
  });
  
  describe('DELETE /prescriptions/:id', () => {
    it('should delete a prescription', async () => {
      const response = await request(app)
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', authToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify prescription is deleted
      const getResponse = await request(app)
        .get(`/prescriptions/${prescriptionId}`)
        .set('Authorization', authToken);
      
      expect(getResponse.status).toBe(404);
    });
    
    it('should return 404 if prescription does not exist', async () => {
      const response = await request(app)
        .delete('/prescriptions/60f1a5c5f32d8a2a58b7a123') // Non-existent ID
        .set('Authorization', authToken);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Prescription not found');
    });
  });
  
  describe('POST /prescriptions/:id/call', () => {
    beforeEach(async () => {
      // Create a new prescription for call tests
      const prescription = await Prescription.create({
        patient: patientId,
        schedules: [
          {
            drugName: 'Call Test Medication',
            dosage: 1,
            frequency: 2,
            duration: 7,
            durationUnit: 'days'
          }
        ]
      });
      prescriptionId = (prescription._id as string).toString();
    });
    
    it('should initiate a call for a prescription', async () => {
      const response = await request(app)
        .post(`/prescriptions/${prescriptionId}/call`)
        .set('Authorization', authToken);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('patient');
      expect(response.body.data).toHaveProperty('prescription');
      expect(response.body.data.prescription.toString()).toBe(prescriptionId);
      expect(CallService.prototype.makeCall).toHaveBeenCalled();
    });
    
    it('should return 404 if prescription does not exist', async () => {
      const response = await request(app)
        .post('/prescriptions/60f1a5c5f32d8a2a58b7a123/call') // Non-existent ID
        .set('Authorization', authToken);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Prescription not found');
    });
  });
});