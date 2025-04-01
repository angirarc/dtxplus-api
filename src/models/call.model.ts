import mongoose, { Document, Schema } from 'mongoose';

export interface ICall extends Document {
    patient: Schema.Types.ObjectId;
    prescription: Schema.Types.ObjectId;
    status: string;
    userResponse?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CallSchema = new Schema<ICall>({
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
    status: {
        type: String,
        required: [true, 'Please provide a status'],
        trim: true,
    },
    userResponse: {
        type: String,
        trim: true,
    },
}, { timestamps: true });

export default mongoose.model<ICall>('Call', CallSchema);