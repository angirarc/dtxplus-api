import mongoose, { Document, Schema } from 'mongoose';

export interface IPatient extends Document {
    name: string;
    phone: string;
    location: string;
    createdAt: Date;
    updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        maxlength: [100, 'Name cannot be more than 50 characters']
    },
    phone: {
        type: String,
        required: [true, 'Please provide a phone number'],
        trim: true,
        maxlength: [15, 'Phone number cannot be more than 15 characters']
    },
    location: {
        type: String,
        required: [true, 'Please provide a location'],
        trim: true,
    },
}, { timestamps: true });

export default mongoose.model<IPatient>('Patient', PatientSchema);