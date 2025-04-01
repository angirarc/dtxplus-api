import type { Request, Response, NextFunction } from 'express';

import yup, { ValidationError } from 'yup';

// Include user in default Request interface
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export class ApiError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(statusCode: number, message: string, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Error handler middleware
export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);

    // Handle aborted requests
    if ('code' in err && err.code === 'ECONNABORTED') {
        console.error('Connection aborted error:', err);
        return res.status(400).json({
            success: false,
            message: 'Request body incomplete or too large',
            error: {
                code: 'ECONNABORTED',
                type: 'request.aborted',
                details: 'The request was aborted before it could be completed'
            }
        });
    }

    // Handle Yup validation errors
    if (err instanceof ValidationError) {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.errors
        });
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.message
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    // Handle JWT expiration
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }

    // Handle custom API errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    }

    // Handle unknown errors
    return res.status(500).json({
        success: false,
        message: 'Internal Server Error'
    });
};

export const handleControllerError = (error: unknown, next: NextFunction) => {
    if (error instanceof yup.ValidationError) {
        const errors = error.errors.join(', ');
        return next(new ApiError(400, errors));
    }
    next(error);
};