import twilio from 'twilio';

import type { Request, Response } from 'express';

import CallLog from '../models/call-log.model';
import Prescription from '../models/prescription.model';

import { CallLogStatus } from '../utils/types';
import CallService from '../services/call.service';

const VoiceResponse = twilio.twiml.VoiceResponse;

export const receiveCall = async (req: Request, res: Response) => {
    console.log(req.body)
    const twiml = new VoiceResponse();

    const callLog = await CallLog.findOne({ phoneCallSid: req.body.CallSid });
    if (!callLog) {
        twiml.say({ voice: 'alice' }, 'Thank you for your response. Goodbye.');
        twiml.hangup();
        return res.type('text/xml').send(twiml.toString());
    }

    const callService = new CallService(callLog);
    const resp = await callService.receiveCall(req);

    return res.type('text/xml').send(resp);
};

// Handle call status updates
export const handleCallStatus = async (req: Request, res: Response) => {
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus; // initiated, ringing, answered, completed, busy, no-answer, failed, canceled

    try {
        // Find the call log associated with this call
        const callLog = await CallLog.findOne({ phoneCallSid: callSid });

        if (!callLog) {
            console.error('Call log not found for SID:', callSid);
            return res.status(200).send();
        }

        // Update call log based on status
        switch (callStatus) {
            case 'completed':
                // Call was completed successfully
                if (callLog.status === CallLogStatus.PENDING) {
                    // If status is still pending, update to voicemail (user didn't provide input)
                    await callLog.updateOne({ status: CallLogStatus.VOICEMAIL });
                }
                break;

            case 'busy':
            case 'no-answer':
            case 'failed':
            case 'canceled':
                // Call failed - update status and send SMS
                await callLog.updateOne({ status: CallLogStatus.VOICEMAIL });

                // Import CallService to send SMS
                const callService = new CallService(callLog);

                // Get prescription details
                const prescription = await Prescription.findById(callLog.prescription).populate('patient');

                // Send SMS as fallback
                await callService.sendMessage(prescription as any);
                break;

            default:
                // For other statuses, just log them
                console.log(`Call ${callSid} status updated to ${callStatus}`);
        }

        return res.status(200).send();
    } catch (error) {
        console.error('Error processing call status update:', error);
        return res.status(500).send();
    }
};