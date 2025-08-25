import { Request, Response, NextFunction } from 'express';
import { UserCommandHandlers } from '../../commands/handlers/UserCommandHandlers';
import { UserQueryHandlers } from '../../queries/handlers/UserQueryHandlers';
import { AuthRequest } from '@ecommerce/shared';
import { asyncHandler } from '@ecommerce/shared';
import logger from '@ecommerce/shared/lib/utils/logger';

export class UserController {
    constructor(
        private commandHandlers: UserCommandHandlers,
        private queryHandlers: UserQueryHandlers
    ) { }

    register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const result = await this.commandHandlers.handleRegisterUser(req.body);

        res.status(201).json({
            success: true,
            data: result,
            message: 'User registered successfully'
        });
    });

    login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const result = await this.commandHandlers.handleLogin(req.body);

        res.status(200).json({
            success: true,
            data: result,
            message: 'Login successful'
        });
    });

    getProfile = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        const user = await this.queryHandlers.getUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    });

    updateProfile = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        await this.commandHandlers.handleUpdateProfile({
            userId,
            profileData: req.body
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully'
        });
    });

    changePassword = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        await this.commandHandlers.handleChangePassword({
            userId,
            currentPassword: req.body.currentPassword,
            newPassword: req.body.newPassword
        });

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    });

    getAddresses = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        const addresses = await this.queryHandlers.getUserAddresses(userId);

        res.status(200).json({
            success: true,
            data: addresses
        });
    });

    addAddress = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        await this.commandHandlers.handleAddAddress({
            userId,
            addressData: req.body
        });

        res.status(201).json({
            success: true,
            message: 'Address added successfully'
        });
    });

    updateAddress = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        const addressId = req.params.addressId;

        await this.commandHandlers.handleUpdateAddress({
            userId,
            addressId,
            addressData: req.body
        });

        res.status(200).json({
            success: true,
            message: 'Address updated successfully'
        });
    });

    removeAddress = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        const addressId = req.params.addressId;

        await this.commandHandlers.handleRemoveAddress({
            userId,
            addressId
        });

        res.status(200).json({
            success: true,
            message: 'Address removed successfully'
        });
    });

    // Admin endpoints
    getAllUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await this.queryHandlers.getAllUsers(page, limit);

        res.status(200).json({
            success: true,
            data: result.users,
            pagination: {
                page,
                limit,
                total: result.total,
                pages: Math.ceil(result.total / limit)
            }
        });
    });

    getUserById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.params.id;
        const user = await this.queryHandlers.getUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    });

    searchUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const query = req.query.q as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const result = await this.queryHandlers.searchUsers(query, page, limit);

        res.status(200).json({
            success: true,
            data: result.users,
            pagination: {
                page,
                limit,
                total: result.total,
                pages: Math.ceil(result.total / limit)
            }
        });
    });

    deactivateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.params.id;
        await this.commandHandlers.handleDeactivateUser({
            userId,
            reason: req.body.reason
        });

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully'
        });
    });

    reactivateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.params.id;
        await this.commandHandlers.handleReactivateUser({
            userId
        });

        res.status(200).json({
            success: true,
            message: 'User reactivated successfully'
        });
    });

    // Health check endpoint
    health = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        res.status(200).json({
            success: true,
            message: 'User service is healthy',
            timestamp: new Date().toISOString()
        });
    });
}
