import fs from 'fs';
import { v4 } from 'uuid';
import twilio from 'twilio';
import type { Request } from 'express';
import { createClient } from '@deepgram/sdk';

import { CallLogStatus, AudioPresets } from '../utils/types';

import Prescription from '../models/prescription.model';
import type { IPatient } from '../models/patient.model';
import type { ICallLog } from '../models/call-log.model';
import type { IPrescription, ISchedule } from '../models/prescription.model';

import { getAudioBuffer } from '../utils';

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, SERVER_URL, DEEPGRAM_API_KEY } = process.env;

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

    public getMedication(schedules: ISchedule[]) {
        const length = schedules.length;
        let medication = schedules.reduce((text, { drugName }, i) =>
            length > 1? (text += (i === length - 1)? `and ${drugName}` : `${drugName}, `) : drugName, '');
        return medication;
    }

    public generateInitialMessage(prescription: Prescription) {
        const medication = this.getMedication(prescription.schedules);
        return `Hello ${prescription.patient.name}, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your ${medication} today.`;
    }

    public async updateStatus(status: CallLogStatus, url?: string) {
        this.callLog.status = status;
        await this.callLog.save();
        console.log(`Call SID: ${this.callLog.phoneCallSid}, status: ${status}`);

        if (url) await this.transcribeCall(url);
    }

    public async transcribeCall(url: string) {
        console.log('Transcribing call...');
        const { result, error } = await deepgramClient.listen.prerecorded.transcribeUrl(
            { url },
            {
                model: 'nova-3',
                language: 'en',
                smart_format: true,
            },
        );

        if (error) {
            console.error(error);
        } else {
            console.log('Transcription completed');
            const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
            console.log({transcript});
            await this.callLog.updateOne({
                phoneCallUrl: url,
                transcript
            });
        }
    }

    public async generateAudio(text: string) {
        const fileName = `${v4()}.mp3`;
        const outputFile = `./src/audio/${fileName}`;
        try {
            const response = await deepgramClient.speak.request(
                { text },
                {
                    model: 'aura-athena-en',
                    encoding: "linear16",
                    container: "wav",
                }
            );

            const stream = await response.getStream();
            if (stream) {
                const buffer = await getAudioBuffer(stream);
                await fs.promises.writeFile(outputFile, buffer);
                console.log(`Audio file written to ${outputFile}`);

                return fileName;
            } else {
                console.error('Error generating audio:', outputFile);
                throw new Error('Error generating audio');
            }
        } catch (error) {
            console.error('Error generating audio:', error);
            throw new Error('Error generating audio');
        }
    }

    public async deleteAudio(fileName: string) {
        const filePath = `./src/audio/${fileName}`;
        try {
            await fs.promises.unlink(filePath);
            console.log(`Audio file deleted: ${filePath}`);
        } catch (error) {
            console.error(`Error deleting audio file: ${filePath}`, error);
        }
    }

    public async testCall(prescription: Prescription) {
        const call = await twilioClient.calls.create({
            from: TWILIO_PHONE_NUMBER ?? '',
            to: prescription.patient.phone,
            url: "http://demo.twilio.com/docs/voice.xml",
        });

        console.log(call.sid);
    }

    public async makeCall(prescription: Prescription) {
        try {
            const twiml = new VoiceResponse();
            const initialMessage = this.generateInitialMessage(prescription);
            const audioFile = await this.generateAudio(initialMessage);
    
            twiml.play(`${SERVER_URL}/audio/${audioFile}`);
    
            const gather = twiml.gather({
                input: ['dtmf', 'speech'],
                // timeout: 5,
                numDigits: 1,
                action: `${SERVER_URL}/webhooks/receive`,
                method: 'POST',
                speechTimeout: 'auto',
                speechModel: 'phone_call',
                hints: 'yes, no, I have, I have not'
            });
    
            gather.play(`${SERVER_URL}/audio/${AudioPresets.PROMPT}`)
    
            twiml.play(`${SERVER_URL}/audio/${AudioPresets.FALLBACK}`)
        
            await twilioClient.calls.create({
                to: prescription.patient.phone,
                from: TWILIO_PHONE_NUMBER ?? '',
                method: 'POST',
                asyncAmd: 'false',
                machineDetection: 'Enable',
                asyncAmdStatusCallbackMethod: 'POST',
                asyncAmdStatusCallback: `${SERVER_URL}/webhooks/voicemail`,
                statusCallback: `${SERVER_URL}/webhooks/status`,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'busy', 'no-answer', 'failed', 'canceled'],
                statusCallbackMethod: 'POST',
                twiml: twiml.toString(),
                record: true
            }, async (error, response) => {
                if (error) {
                    console.error('Error making call:', error);
                    throw error;
                }

                if (response) {
                    console.log('Call SID:', response.sid);
                    this.callLog.phoneCallSid = response.sid;
                    await this.callLog.save();
                }
            });

            // Enhance this by using a queuing
            setTimeout(() => this.deleteAudio(audioFile), 60000)
        } catch (error) {
            console.error('Error making call:', error);

            await this.sendMessage(prescription);

            throw error;
        }
    }

    public async receiveCall(req: Request) {
        let audio = AudioPresets.ERROR;

        const prescription = await Prescription.findById(this.callLog.prescription).populate('patient');
        if (!prescription) {
            this.twiml.play(`${SERVER_URL}/audio/${audio}`)
            this.twiml.hangup();
            return this.twiml.toString();
        }

        try {
            const { Digits, SpeechResult } = req.body;
            const userInput = Digits || SpeechResult;
            const input = `Patient: ${userInput}`;
            // Logging patient input
            console.log(input);

            const initialMessage = this.generateInitialMessage(prescription);
            const audioFile = await this.generateAudio(initialMessage);

            this.twiml.play(`${SERVER_URL}/audio/${audioFile}`);

            if (userInput === '1' || /yes|have taken|i have/i.test(userInput)) {
                audio = AudioPresets.POSITIVE;
            } else if (userInput === '2' || /no|have not|haven't/i.test(userInput)) {
                audio = AudioPresets.NEGATIVE;
            }

            this.twiml.play(`${SERVER_URL}/audio/${audio}`);
            this.twiml.hangup();

            return this.twiml.toString();
        } catch (error) {
            this.sendMessage(prescription as any);

            console.log({ error })
            this.twiml.play(`${SERVER_URL}/audio/${AudioPresets.ERROR}`);
            this.twiml.hangup();
            
            return this.twiml.toString();
        }
    }

    public async leaveVoicemail() {
        let audio = AudioPresets.ERROR;
        
        const prescription = await Prescription.findById(this.callLog.prescription).populate('patient');
        if (!prescription) {
            this.twiml.play(`${SERVER_URL}/audio/${audio}`)
            this.twiml.hangup();
            return this.twiml.toString();
        }

        try {
            const medication = this.getMedication(prescription.schedules);
            const audioFile = await this.generateAudio(`We called to check on your medication but couldn't reach you. Please call us back or take your ${medication} if you haven't done so.`);
            this.twiml.play(`${SERVER_URL}/audio/${audioFile}`);
            this.twiml.hangup();
            return this.twiml.toString();
        } catch (error) {
            this.sendMessage(prescription as any);

            console.log({ error })
            this.twiml.play(`${SERVER_URL}/audio/${AudioPresets.ERROR}`);
            this.twiml.hangup();
            
            return this.twiml.toString();
        }
    }

    public async sendMessage(prescription: Prescription) {
        try {
            console.log('Sending message...');
            const medication = this.getMedication(prescription.schedules);
            const messageSent = await twilioClient.messages.create({
                to: prescription.patient.phone,
                from: TWILIO_PHONE_NUMBER ?? '',
                body: `We called to check on your medication but couldn't reach you. Please call us back or take your ${medication} if you haven't done so.`,
            });

            this.updateStatus(CallLogStatus.SMS);
            return messageSent;

        } catch (error) {
            this.updateStatus(CallLogStatus.FAILED);
            console.error('Error sending message:', error);
        }
    }
}

export default CallService;