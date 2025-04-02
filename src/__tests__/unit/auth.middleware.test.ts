import jwt from 'jsonwebtoken';
import { expect, jest } from '@jest/globals';
import type { Request, Response } from 'express';

import { protect } from '../../middleware/auth.middleware';
import User from '../../models/user.model';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../models/user.model');

describe('Auth Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock environment variables
        process.env.JWT_SECRET = 'test-jwt-secret';

        // Mock request, response, and next
        mockRequest = {
            headers: {}
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        mockNext = jest.fn();
    });

    it('should call next() if token is valid', async () => {
        // Mock valid token
        mockRequest.headers = {
            authorization: 'Bearer valid-token'
        };

        // Mock jwt.verify
        (jwt.verify as jest.Mock).mockImplementation(() => ({
            id: 'test-user-id',
            email: 'test@example.com'
        }));

        // Mock User.findById
        (User.findById as jest.Mock).mockResolvedValue({
            _id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com'
        });

        await protect(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-jwt-secret');
        expect(User.findById).toHaveBeenCalledWith('test-user-id');
        expect(mockRequest.user).toEqual({
            _id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com'
        });
        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 if no token is provided', async () => {
        // No authorization header
        mockRequest.headers = {};

        await protect(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 401,
            message: 'Not authorized, no token'
        }));

        expect(jwt.verify).not.toHaveBeenCalled();
        expect(User.findById).not.toHaveBeenCalled();
    });

    it('should return 401 if token format is invalid', async () => {
        // Invalid token format (missing 'Bearer')
        mockRequest.headers = {
            authorization: 'invalid-token'
        };

        await protect(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 401,
            message: 'Not authorized to access this route'
        }));
        
        expect(jwt.verify).not.toHaveBeenCalled();
        expect(User.findById).not.toHaveBeenCalled();
    });
    
    it('should return 401 if token verification fails', async () => {
        // Mock valid token format but verification fails
        mockRequest.headers = {
            authorization: 'Bearer invalid-token'
        };
        
        // Mock jwt.verify to throw an error
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid token');
        });
        
        await protect(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );
        
        expect(jwt.verify).toHaveBeenCalledWith('invalid-token', 'test-jwt-secret');
        expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 401,
            message: 'Not authorized to access this route'
        }));
        
        expect(User.findById).not.toHaveBeenCalled();
    });
    
    it('should return 401 if user not found', async () => {
        // Mock valid token
        mockRequest.headers = {
            authorization: 'Bearer valid-token'
        };
        
        // Mock jwt.verify
        (jwt.verify as jest.Mock).mockImplementation(() => ({
            id: 'nonexistent-user-id',
            email: 'test@example.com'
        }));
        
        // Mock User.findById to return null (user not found)
        (User.findById as jest.Mock).mockResolvedValue(null);
        
        await protect(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
        );
        
        expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-jwt-secret');
        expect(User.findById).toHaveBeenCalledWith('nonexistent-user-id');
        expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 401,
            message: 'Not authorized to access this route'
        }));
    });
});