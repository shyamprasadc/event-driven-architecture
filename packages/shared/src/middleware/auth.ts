import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomError } from './errorHandler';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        next(new CustomError('Not authorized to access this route', 401));
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    } catch (error) {
        next(new CustomError('Not authorized to access this route', 401));
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new CustomError('Not authorized to access this route', 401));
            return;
        }

        if (!roles.includes(req.user.role)) {
            next(new CustomError(`User role ${req.user.role} is not authorized to access this route`, 403));
            return;
        }

        next();
    };
};

export const generateToken = (userId: string, email: string, role: string): string => {
    return jwt.sign(
        { id: userId, email, role },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

export const verifyToken = (token: string): any => {
    return jwt.verify(token, process.env.JWT_SECRET!);
};
