import twilio from 'twilio';

import type { Request, Response } from 'express';

import CallLog from '../models/call-log.model';
import Prescription from '../models/prescription.model';

import { CallLogStatus } from '../utils/types';
import CallService from '../services/call.service';

const VoiceResponse = twilio.twiml.VoiceResponse;

const intermediateStates = ["queued", "ringing", "in-progress"];

export const receiveCall = async (req: Request, res: Response) => {
    console.log(req.params)
    const twiml = new VoiceResponse();

    const callLog = await CallLog.findOne({ phoneCallSid: req.params.CallSid });
    if (!callLog) {
        twiml.say({ voice: 'alice' }, 'Thank you for your response. Goodbye.');
        twiml.hangup();
        return res.type('text/xml').send(twiml.toString());
    }

    const callService = new CallService(callLog);
    const resp = await callService.receiveCall(req);

    return res.type('text/xml').send(resp);
};

export const handleCallStatusUpdate = async (req: Request, res: Response) => {
    const { CallSid, CallStatus, RecordingUrl } = req.params;

    try {
        const callLog = await CallLog.findOne({ phoneCallSid: CallSid });

        if (!callLog) {
            console.error('Call log not found for SID:', CallSid);
            return res.status(200).send();
        }

        if (CallStatus === 'completed') {
            callLog.status = CallLogStatus.ANSWERED;
            callLog.phoneCallUrl = RecordingUrl;
            
            await callLog.save();
        } else if (!intermediateStates.includes(CallStatus))  {
            const prescription = await Prescription.findById(callLog.prescription).populate('patient');
            if (prescription) {
                const callService = new CallService(callLog);
                callService.handleFailedStates(req, prescription);
            }
        }

        return res.status(200).send();
    } catch (error) {
        console.error('Error processing call status update:', error);
        return res.status(500).send();
    }
};