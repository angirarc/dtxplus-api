import mongoose, { Document, Schema } from 'mongoose';

export interface ICallLog extends Document {
    patient: Schema.Types.ObjectId;
    prescription: Schema.Types.ObjectId;
    status: string;
    transcript?: string[];
    phoneCallSid?: string;
    phoneCallUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CallLogSchema = new Schema<ICallLog>({
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'Patient',
        required: [true, 'Please provide a patient'],
    },
    prescription: {
        type: Schema.Types.ObjectId,
        ref: 'Prescription',
        required: [true, 'Please provide a prescription'],
    },
    transcript: [
        {
            type: String,
            trim: true,
        },
    ],
    status: {
        type: String,
        required: [true, 'Please provide a status'],
        trim: true,
    },
}, { timestamps: true });

export default mongoose.model<ICallLog>('CallLog', CallLogSchema);