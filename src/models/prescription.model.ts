import mongoose, { Document, Schema } from 'mongoose';

export interface ISchedule extends Document {
    drugName: string;
    dosage: number;
    frequency: number;
    duration: number;
    durationUnit: string;
}

export interface IPrescription extends Document {
    patient: Schema.Types.ObjectId;
    schedules: ISchedule[];
    createdAt: Date;
    updatedAt: Date;
}

const ScheduleSchema = new Schema<ISchedule>({
    drugName: {
        type: String,
        required: [true, 'Please provide a drug name'],
        trim: true,
        maxlength: [50, 'Drug Name cannot be more than 50 characters']
    },
    dosage: {
        type: Number,
        required: [true, 'Please provide dosage'],
    },
    frequency: {
        type: Number,
        required: [true, 'Please provide dosage'],
    },
    duration: {
        type: Number,
        required: [true, 'Please provide dosage'],
    },
    durationUnit: {
        type: String,
        required: [true, 'Please provide dosage'],
        trim: true,
    }
}, { timestamps: true });

const PrescriptionSchema = new Schema<IPrescription>({
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    schedules: [ScheduleSchema],
}, { timestamps: true });

export default mongoose.model<IPrescription>('Prescription', PrescriptionSchema);