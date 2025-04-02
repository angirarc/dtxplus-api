import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Setup test database connection
beforeAll(async () => {
  const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/dtxplus-test';
  await mongoose.connect(MONGODB_TEST_URI);
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Mock environment variables
process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
process.env.TWILIO_PHONE_NUMBER = '+15551234567';
process.env.NGROK_URL = 'http://localhost:3000';
process.env.DEEPGRAM_API_KEY = 'test_deepgram_key';