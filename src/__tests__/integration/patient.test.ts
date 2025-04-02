import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { expect, jest } from '@jest/globals';

import { errorHandler } from '../../middleware/error-handler';
import patientRoutes from '../../routes/patient.routes';
import Patient from '../../models/patient.model';
import User from '../../models/user.model';

// Mock dependencies
jest.mock('jsonwebtoken');

// Create a test app
const app = express();
app.use(express.json());
app.use('/patients', patientRoutes);
app.use(errorHandler);

describe('Patient API', () => {
  let authToken: string;
  let patientId: string;
  
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
    
    // Create auth token
    authToken = 'Bearer test-token';
  });
  
  afterAll(async () => {
    // Clean up test data
    await Patient.deleteMany({});
    await User.deleteMany({});
  });
  
  describe('POST /patients', () => {
    it('should create a new patient', async () => {
      const patientData = {
        name: 'Test Patient',
        phone: '+15551234567',
        location: 'Test Location'
      };
      
      const response = await request(app)
        .post('/patients')
        .set('Authorization', authToken)
        .send(patientData);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe('Test Patient');
      
      patientId = response.body.data._id;
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/patients')
        .set('Authorization', authToken)
        .send({
          name: 'Invalid Patient'
          // Missing required fields
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /patients', () => {
    it('should get all patients', async () => {
      const response = await request(app)
        .get('/patients')
        .set('Authorization', authToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
  
  describe('GET /patients/:id', () => {
    it('should get a patient by ID', async () => {
      const response = await request(app)
        .get(`/patients/${patientId}`)
        .set('Authorization', authToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(patientId);
      expect(response.body.data.name).toBe('Test Patient');
    });
    
    it('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .get('/patients/60f1a5c5f32d8a2a58b7a123') // Non-existent ID
        .set('Authorization', authToken);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('PUT /patients/:id', () => {
    it('should update a patient', async () => {
      const updatedData = {
        name: 'Updated Patient',
        phone: '+15551234567',
        location: 'Updated Location'
      };
      
      const response = await request(app)
        .put(`/patients/${patientId}`)
        .set('Authorization', authToken)
        .send(updatedData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Patient');
      expect(response.body.data.location).toBe('Updated Location');
    });
  });
  
  describe('DELETE /patients/:id', () => {
    it('should delete a patient', async () => {
      const response = await request(app)
        .delete(`/patients/${patientId}`)
        .set('Authorization', authToken);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify patient is deleted
      const getResponse = await request(app)
        .get(`/patients/${patientId}`)
        .set('Authorization', authToken);
      
      expect(getResponse.status).toBe(404);
    });
  });
});