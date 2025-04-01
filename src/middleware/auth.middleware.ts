import type { Request, Response, NextFunction } from 'express';

import jwt from 'jsonwebtoken';
import { ApiError } from './error-handler';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError(401, 'Not authorized to access this route'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      
      req.user = decoded;
      next();
    } catch (error) {
      return next(new ApiError(401, 'Not authorized to access this route'));
    }
  } catch (error) {
    next(error);
  }
};