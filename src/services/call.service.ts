import twilio from 'twilio';
import { pipeline } from 'stream/promises';
import { createClient } from '@deepgram/sdk';

import type { IPatient } from '../models/patient.model';
import type { ICallLog } from '../models/call-log.model';
import type { IPrescription } from '../models/prescription.model';

import { CallLogStatus } from '../utils/types';
import type { Request } from 'express';

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, NGROK_URL, DEEPGRAM_API_KEY } = process.env;

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const deepgramClient = createClient(DEEPGRAM_API_KEY);

const VoiceResponse = twilio.twiml.VoiceResponse;

interface Prescription extends Omit<IPrescription, 'patient'> {
    patient: IPatient | any;
}

class CallService {
    private callLog: ICallLog;
    private twiml = new VoiceResponse();

    public constructor(callLog: ICallLog) {
        this.callLog = callLog;
    }

    public async generateInitialMessage(prescription: Prescription) {
        const length = prescription.schedules.length;
        let medications = prescription.schedules.reduce((text, { drugName }, i) =>
            length > 1 ? (text += (i === length - 1) ? `and ${drugName}` : `${drugName}, `) : drugName, '');
        return `Hello ${prescription.patient.name}, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your ${medications} today.`;
    }

    public async updateCallLog(status: CallLogStatus) {
        this.callLog.status = status;
        await this.callLog.save();
    }

    public async testCall(prescription: Prescription) {
        const call = await twilioClient.calls.create({
            from: TWILIO_PHONE_NUMBER?? '',
            to: prescription.patient.phone,
            url: "http://demo.twilio.com/docs/voice.xml",
        });

        console.log(call.sid);
    }

    public async makeCall(prescription: Prescription) {
        const message = await this.generateInitialMessage(prescription);

        const twiml = new VoiceResponse();

        twiml.say({ voice: 'alice' }, message);

        const gather = twiml.gather({
            input: ['dtmf', 'speech'],
            timeout: 5,
            numDigits: 1,
            action: '/webhooks/receive', // Webhook to handle user input
            method: 'POST',
            speechTimeout: 'auto',
            speechModel: 'phone_call',
            hints: 'yes, no, I have, I have not'
        });

        gather.say({ voice: 'alice' }, 'Press 1 or say yes if you have taken your medications. Press 2 or say no if you have not.');

        twiml.say({ voice: 'alice' }, 'We didn\'t receive your response. We\'ll send you a text message as a reminder.');

        this.callLog.transcript = [twiml.toString()];
        await this.callLog.save();

        try {
            await twilioClient.calls.create({
                to: prescription.patient.phone,
                from: TWILIO_PHONE_NUMBER ?? '',
                method: 'POST',
                // url: `${NGROK_URL}/webhooks/receive`,
                // applicationSid: this.callLog.id,
                statusCallback: '/call-logs/status',
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'busy', 'no-answer', 'failed', 'canceled'],
                statusCallbackMethod: 'POST',
                twiml: twiml.toString()
            }, async (error, response) => {
                if (error) {
                    console.error('Error making call:', error);
                    throw error;
                }
                
                if (response) {
                    this.callLog.phoneCallSid = response.sid;
                    await this.callLog.save();
                }
            });
        } catch (error) {
            console.error('Error making call:', error);

            await this.updateCallLog(CallLogStatus.VOICEMAIL);

            await this.sendMessage(prescription);

            throw error;
        }
    }

    public async receiveCall(req: Request) {
        try {
            let responseMessage = '';
            const { Digits, SpeechResult } = req.body;
            const userInput = Digits || SpeechResult;
            const input = `Patient: ${userInput}`;
    
            if (userInput === '1' || /yes|have taken|i have/i.test(userInput)) {
              await this.callLog.updateOne({ 
                $set: { status: CallLogStatus.ANSWERED },
                $push: { transcript: `${input} - (Patient confirmed taking medication)` }
              });
              responseMessage = 'Thank you for confirming that you have taken your medication. Have a great day!';
            } else if (userInput === '2' || /no|have not|haven't/i.test(userInput)) {
              await this.callLog.updateOne({ 
                $set: { status: CallLogStatus.ANSWERED },
                $push: { transcript: `${input} - (Patient reported not taking medication)` }
              });
              responseMessage = 'Thank you for letting us know. Please remember to take your medication as prescribed. Your healthcare provider will be notified.';
            } else {
              await this.callLog.updateOne({ 
                $set: { status: CallLogStatus.ANSWERED },
                $push: { transcript: `${input} - (Unclear patient response)` }
              });
              responseMessage = 'Thank you for your response. We recommend taking your medication as prescribed. Your healthcare provider will be notified.';
            }

            this.twiml.say({ voice: 'alice' }, responseMessage);
            this.twiml.hangup();

            return this.twiml.toString();
        } catch (error) {
            console.log({error})
            this.twiml.say({ voice: 'alice' }, 'We encountered an error processing your response. Please contact your healthcare provider.');
            this.twiml.hangup();

            return this.twiml.toString();
        }
    }

    public async sendMessage(prescription: Prescription) {
        const messageSent = await twilioClient.messages.create({
            to: prescription.patient.phone,
            from: TWILIO_PHONE_NUMBER ?? '',
            body: "We called to check on your medication but couldn't reach you. Please call us back or take your medications if you haven't done so.",
        });
        return messageSent;
    }
}

export default CallService;