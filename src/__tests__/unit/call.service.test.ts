import twilio from 'twilio';
import { expect, jest } from '@jest/globals';

import { CallLogStatus } from '../../utils/types';
import CallService from '../../services/call.service';
import CallLog from '../../models/call-log.model';
import Prescription from '../../models/prescription.model';

// Mock dependencies
jest.mock('twilio');
jest.mock('@deepgram/sdk', () => ({
  createClient: jest.fn().mockReturnValue({
    listen: {
      prerecorded: {
        transcribeFile: jest.fn().mockResolvedValue({
          results: {
            channels: [{
              alternatives: [{
                transcript: 'Test transcript'
              }]
            }]
          }
        })
      }
    }
  })
}));

describe('CallService', () => {
  let callLog: any;
  let callService: CallService;
  let mockTwilioClient: any;
  
  beforeEach(() => {
    // Mock CallLog
    callLog = {
      _id: 'test-call-log-id',
      patient: 'test-patient-id',
      prescription: 'test-prescription-id',
      status: CallLogStatus.PENDING,
      phoneCallSid: 'test-call-sid',
      save: jest.fn().mockResolvedValue(undefined)
    };
    
    // Create CallService instance
    callService = new CallService(callLog);
    
    // Mock Twilio client
    mockTwilioClient = {
      calls: {
        create: jest.fn().mockResolvedValue({
          sid: 'new-call-sid'
        })
      },
      messages: {
        create: jest.fn().mockResolvedValue({
          sid: 'test-message-sid'
        })
      }
    };
    
    // Mock twilio client implementation
    (twilio as unknown as jest.Mock).mockReturnValue(mockTwilioClient);
  });
  
  describe('makeCall', () => {
    it('should make a call and update call log', async () => {
      const prescription = {
        _id: 'test-prescription-id',
        patient: {
          _id: 'test-patient-id',
          name: 'Test Patient',
          phone: '+15551234567'
        },
        schedules: [
          {
            drugName: 'Test Drug',
            dosage: 1,
            frequency: 2,
            duration: 7,
            durationUnit: 'days'
          }
        ]
      } as any;
      
      await callService.makeCall(prescription);
      
      expect(mockTwilioClient.calls.create).toHaveBeenCalledWith({
        to: '+15551234567',
        from: expect.any(String),
        url: expect.stringContaining('/webhooks/receive'),
        statusCallback: expect.stringContaining('/webhooks/status')
      });
      
      expect(callLog.phoneCallSid).toBe('new-call-sid');
      expect(callLog.save).toHaveBeenCalled();
    });
    
    it('should handle errors when making a call', async () => {
      const prescription = {
        _id: 'test-prescription-id',
        patient: {
          _id: 'test-patient-id',
          name: 'Test Patient',
          phone: '+15551234567'
        },
        schedules: [{ drugName: 'Test Drug' }]
      } as any;
      
      // Mock error
      mockTwilioClient.calls.create.mockRejectedValue(new Error('Twilio error'));
      
      await expect(callService.makeCall(prescription)).rejects.toThrow('Twilio error');
    });
  });
  
  describe('updateStatus', () => {
    it('should update call log status', async () => {
      await callService.updateStatus(CallLogStatus.ANSWERED, 'https://example.com/recording.mp3');
      
      expect(callLog.status).toBe(CallLogStatus.ANSWERED);
      expect(callLog.phoneCallUrl).toBe('https://example.com/recording.mp3');
      expect(callLog.save).toHaveBeenCalled();
    });
  });
  
  describe('leaveVoicemail', () => {
    it('should update status to voicemail', async () => {
        const prescription = {
          _id: 'test-prescription-id',
          patient: {
            _id: 'test-patient-id',
            name: 'Test Patient',
            phone: '+15551234567'
          },
          schedules: [{ drugName: 'Test Drug' }]
        } as any;
      await callService.leaveVoicemail(prescription);
      
      expect(callLog.status).toBe(CallLogStatus.VOICEMAIL);
      expect(callLog.save).toHaveBeenCalled();
    });
  });
  
  describe('sendSMS', () => {
    it('should send SMS and update status', async () => {
      const prescription = {
        _id: 'test-prescription-id',
        patient: {
          _id: 'test-patient-id',
          name: 'Test Patient',
          phone: '+15551234567'
        },
        schedules: [{ drugName: 'Test Drug' }]
      } as any;
      
      await callService.sendMessage(prescription);
      
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        to: '+15551234567',
        from: expect.any(String),
        body: expect.stringContaining('Test Drug')
      });
      
      expect(callLog.status).toBe(CallLogStatus.SMS);
      expect(callLog.save).toHaveBeenCalled();
    });
  });
  
  describe('receiveCall', () => {
    it('should handle digit input', async () => {
      const req = {
        body: {
          Digits: '1'
        },
        params: {}
      } as any;
      
      const prescription = {
        _id: 'test-prescription-id',
        schedules: [{ drugName: 'Test Drug' }]
      };
      
      // Mock Prescription.findById
      jest.spyOn(Prescription, 'findById').mockResolvedValue(prescription as any);
      
      const response = await callService.receiveCall(req);
      
      expect(response).toContain('<Response>');
      expect(callLog.save).toHaveBeenCalled();
    });
    
    it('should handle speech input', async () => {
      const req = {
        body: {
          SpeechResult: 'Yes I have taken my medication'
        },
        params: {}
      } as any;
      
      const prescription = {
        _id: 'test-prescription-id',
        schedules: [{ drugName: 'Test Drug' }]
      };
      
      // Mock Prescription.findById
      jest.spyOn(Prescription, 'findById').mockResolvedValue(prescription as any);
      
      const response = await callService.receiveCall(req);
      
      expect(response).toContain('<Response>');
      expect(callLog.save).toHaveBeenCalled();
    });
  });
});