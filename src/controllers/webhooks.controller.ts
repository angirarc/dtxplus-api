import twilio from 'twilio';

import type { Request, Response } from 'express';

import CallLog from '../models/call-log.model';
import Prescription from '../models/prescription.model';

import { CallLogStatus, AudioPresets } from '../utils/types';

import CallService from '../services/call.service';

const { SERVER_URL } = process.env;

const VoiceResponse = twilio.twiml.VoiceResponse;

const intermediateStates = ["initiated", "queued", "ringing", "in-progress"];

export const receiveCall = async (req: Request, res: Response) => {
    try {
        const twiml = new VoiceResponse();

        const callLog = await CallLog.findOne({ phoneCallSid: req.body.CallSid });
        if (!callLog) {
            twiml.play(`${SERVER_URL}/audio/${AudioPresets.ERROR}`)
            twiml.hangup();
            return res.type('text/xml').send(twiml.toString());
        }

        const callService = new CallService(callLog);
        const resp = await callService.receiveCall(req);

        return res.type('text/xml').send(resp);
    } catch (error) {
        console.error('Error receiving call:', error);
        return res.status(500).send();
    }
};

export const leaveVoiceMail = async (req: Request, res: Response) => {
    try {
        const twiml = new VoiceResponse();
        const callLog = await CallLog.findOne({ phoneCallSid: req.body.CallSid });
        if (!callLog) {
            twiml.play(`${SERVER_URL}/audio/${AudioPresets.ERROR}`)
            twiml.hangup();
            return res.type('text/xml').send(twiml.toString());
        }

        const callService = new CallService(callLog);
        const resp = await callService.leaveVoicemail();

        return res.type('text/xml').send(resp);
    } catch (error) {
        console.error('Error leaving voicemail:', error);
        return res.status(500).send();
    }
}

export const handleCallStatusUpdate = async (req: Request, res: Response) => {
    const { CallSid, CallStatus, RecordingUrl } = req.body;

    try {
        const callLog = await CallLog.findOne({ phoneCallSid: CallSid });
        if (!callLog) {
            console.error('Call log not found for SID:', CallSid);
            return res.status(200).send();
        }

        const callService = new CallService(callLog);
        if (CallStatus === 'completed') {
            await callService.updateStatus(CallLogStatus.ANSWERED, RecordingUrl);
        } else if (CallStatus === 'no-answer') {
            await callService.leaveVoicemail();
        } else if (!intermediateStates.includes(CallStatus)) {
            const prescription = await Prescription.findById(callLog.prescription).populate('patient');
            if (prescription) {
                callService.sendMessage(prescription);
            }
        }

        return res.status(200).send();
    } catch (error) {
        console.error('Error processing call status update:', error);
        return res.status(500).send();
    }
};