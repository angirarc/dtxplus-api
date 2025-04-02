import bcrypt from 'bcrypt';
import express from 'express';
import request from 'supertest';
import { expect, jest } from '@jest/globals';

import { errorHandler } from '../../middleware/error-handler';
import authRoutes from '../../routes/auth.routes';
import User from '../../models/user.model';

// Mock dependencies
jest.mock('bcrypt');

// Create a test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

describe('Auth API', () => {
  beforeAll(async () => {
    // Mock bcrypt functions
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    (bcrypt.compare as jest.Mock).mockImplementation((plainPassword, hashedPassword) => {
      return Promise.resolve(plainPassword === 'correctPassword');
    });
  });
  
  afterEach(async () => {
    // Clean up test data after each test
    await User.deleteMany({});
  });
  
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/auth/register')
        .send(userData);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.name).toBe('Test User');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          // Missing email and password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('should prevent duplicate email registration', async () => {
      // Create a user first
      await User.create({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'hashedPassword'
      });
      
      // Try to register with the same email
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'New User',
          email: 'existing@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });
  
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await User.create({
        name: 'Login Test User',
        email: 'login@example.com',
        password: 'hashedPassword'
      });
    });
    
    it('should login a user with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'correctPassword'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.name).toBe('Login Test User');
      expect(response.body.data.user.email).toBe('login@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });
    
    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'correctPassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
    
    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongPassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });
});