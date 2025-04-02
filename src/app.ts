import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

import { errorHandler } from './middleware/error-handler';

import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import webhookRoutes from './routes/webhooks.routes';
import callLogRoutes from './routes/call-log.routes';
import prescriptionRoutes from './routes/prescription.routes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hisani-erp';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes 
app.use('/auth', authRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/patients', patientRoutes);
app.use('/call-logs', callLogRoutes);
app.use('/prescriptions', prescriptionRoutes);

app.use('/audio', cors(), express.static('src/audio', {
    setHeaders: (res, path) => {
        if (path.endsWith('.mp3')) {
            res.set('Content-Type', 'audio/mpeg');
            res.set('Access-Control-Allow-Origin', '*');
        }
    }
}));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})