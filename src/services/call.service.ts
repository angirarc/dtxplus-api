import twilio from 'twilio';
import type { IPrescription } from '../models/prescription.model';
import type { IPatient } from '../models/patient.model';
import type { ICallLog } from '../models/call-log.model';
import type { CallLogStatus } from '../utils/types';

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

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
            (text += i === length - 1 ? `and ${drugName}` : `${drugName}, `), '');
        return `Hello, this is a reminder from your healthcare provider to confirm your medications for the day. Please confirm if you have taken your ${medications} today.`;
    }

    public async updateCallLog(status: CallLogStatus) {
        this.callLog.status = status;
        await this.callLog.save();
    }

    public async makeCall(prescription: Prescription) {
        const message = this.generateInitialMessage(prescription);

        const call = await twilioClient.calls.create({
            to: prescription.patient.phone,
            from: TWILIO_PHONE_NUMBER ?? '',
            method: "GET",
            statusCallback: "https://www.myapp.com/events",
            statusCallbackEvent: ["initiated", "answered"],
            statusCallbackMethod: "POST",
            url: "http://demo.twilio.com/docs/voice.xml",
        }, (err, call) => {
            console.log()
        });

        return call;
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