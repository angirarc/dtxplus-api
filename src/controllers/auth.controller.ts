import * as yup from 'yup';
import type { Request, Response, NextFunction } from 'express';

import User from '../models/user.model';
import type { IUser } from '../models/user.model';

import { ApiError } from '../middleware/error-handler';

const registerSchema = yup.object().shape({
    name: yup.string().required('Name is required').max(50, 'Name cannot be more than 50 characters'),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
});

const loginSchema = yup.object().shape({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required')
});

const formatUserResponse = (user: IUser) => ({
    id: user._id,
    name: user.name,
    email: user.email,
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = await registerSchema.validate(req.body);

        const existingUser = await User.findOne({ email: validatedData.email });
        if (existingUser) {
            return next(new ApiError(400, 'User already exists'));
        }

        const user = await User.create(validatedData);

        const token = user.generateAuthToken();

        res.status(201).json({
            success: true,
            token,
            user: formatUserResponse(user)
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = await loginSchema.validate(req.body);

        const user = await User.findOne({ email: validatedData.email }).select('+password');
        if (!user) {
            return next(new ApiError(401, 'Invalid credentials'));
        }

        const isMatch = await user.comparePassword(validatedData.password);
        if (!isMatch) {
            return next(new ApiError(401, 'Invalid credentials'));
        }

        const token = user.generateAuthToken();

        res.status(200).json({
            success: true,
            token,
            user: formatUserResponse(user)
        });
    } catch (error) {
        next(error);
    }
};