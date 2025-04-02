import request from 'supertest';
import express from 'express';
import { expect, jest } from '@jest/globals';

import { errorHandler } from '../../middleware/error-handler';
import webhookRoutes from '../../routes/webhooks.routes';
import CallLog from '../../models/call-log.model';
import Patient from '../../models/patient.model';
import Prescription from '../../models/prescription.model';
import { CallLogStatus } from '../../utils/types';
import CallService from '../../services/call.service';

// Mock dependencies
jest.mock('../../services/call.service');

// Create a test app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use('/webhooks', webhookRoutes);
app.use(errorHandler);

describe('Webhooks API', () => {
  let patientId: string;
  let prescriptionId: string;
  let callLogId: string;
  let callSid: string;
  
  beforeAll(async () => {
    // Create test data
    const patient = await Patient.create({
      name: 'Webhook Test Patient',
      phone: '+15551234567',
      location: 'Test Location'
    });
    patientId = (patient._id as string).toString();
    
    const prescription = await Prescription.create({
      patient: patientId,
      schedules: [
        {
          drugName: 'Test Drug',
          dosage: 1,
          frequency: 2,
          duration: 7,
          durationUnit: 'days'
        }
      ]
    });
    prescriptionId = (prescription._id as string).toString();
    
    callSid = 'CA12345678901234567890123456789012';
    
    const callLog = await CallLog.create({
      patient: patientId,
      prescription: prescriptionId,
      status: CallLogStatus.PENDING,
      phoneCallSid: callSid
    });
    callLogId = (callLog._id as string).toString();
    
    // Mock CallService methods
    (CallService.prototype.updateStatus as jest.Mock).mockResolvedValue(undefined);
    (CallService.prototype.leaveVoicemail as jest.Mock).mockResolvedValue(undefined);
    (CallService.prototype.receiveCall as jest.Mock).mockResolvedValue('<Response><Say>Test response</Say></Response>');
  });
  
  afterAll(async () => {
    // Clean up test data
    await CallLog.deleteMany({});
    await Prescription.deleteMany({});
    await Patient.deleteMany({});
  });
  
  describe('POST /webhooks/status', () => {
    it('should handle completed call status', async () => {
      const response = await request(app)
        .post('/webhooks/status')
        .send({
          CallSid: callSid,
          CallStatus: 'completed',
          RecordingUrl: 'https://example.com/recording.mp3'
        });
      
      expect(response.status).toBe(200);
      expect(CallService.prototype.updateStatus).toHaveBeenCalledWith(
        CallLogStatus.ANSWERED,
        'https://example.com/recording.mp3'
      );
    });
    
    it('should handle failed call status', async () => {
      const response = await request(app)
        .post('/webhooks/status')
        .send({
          CallSid: callSid,
          CallStatus: 'failed'
        });
      
      expect(response.status).toBe(200);
      expect(CallService.prototype.leaveVoicemail).toHaveBeenCalled();
    });
    
    it('should ignore intermediate call states', async () => {
      const response = await request(app)
        .post('/webhooks/status')
        .send({
          CallSid: callSid,
          CallStatus: 'ringing'
        });
      
      expect(response.status).toBe(200);
      expect(CallService.prototype.updateStatus).not.toHaveBeenCalled();
      expect(CallService.prototype.leaveVoicemail).not.toHaveBeenCalled();
    });
    
    it('should handle non-existent call SID', async () => {
      const response = await request(app)
        .post('/webhooks/status')
        .send({
          CallSid: 'non-existent-sid',
          CallStatus: 'completed'
        });
      
      expect(response.status).toBe(200);
      expect(CallService.prototype.updateStatus).not.toHaveBeenCalled();
    });
  });
  
  describe('POST /webhooks/receive', () => {
    it('should handle incoming call response', async () => {
      const response = await request(app)
        .post('/webhooks/receive')
        .send({
          CallSid: callSid,
          Digits: '1'
        });
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('<Response>');
      expect(CallService.prototype.receiveCall).toHaveBeenCalled();
    });
    
    it('should handle speech input', async () => {
      const response = await request(app)
        .post('/webhooks/receive')
        .send({
          CallSid: callSid,
          SpeechResult: 'Yes I have taken my medication'
        });
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('<Response>');
      expect(CallService.prototype.receiveCall).toHaveBeenCalled();
    });
    
    it('should handle non-existent call SID', async () => {
      const response = await request(app)
        .post('/webhooks/receive')
        .send({
          CallSid: 'non-existent-sid',
          Digits: '1'
        });
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Thank you for your response');
    });
  });
});