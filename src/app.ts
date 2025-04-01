import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

import { errorHandler } from './middleware/error-handler';

import callRoutes from './routes/call.routes';
import patientRoutes from './routes/patient.routes';
import prescriptionRoutes from './routes/prescription.routes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hisani-erp';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes 
app.use('/calls', callRoutes);
app.use('/patients', patientRoutes);
app.use('/prescriptions', prescriptionRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})