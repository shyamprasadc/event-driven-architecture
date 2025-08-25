import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../domain/aggregates/User';
import { UserProfileData } from '../../domain/valueObjects/UserProfile';
import { UserAddressData } from '../../domain/valueObjects/UserAddress';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { EventBus } from '@ecommerce/shared';
import logger from '@ecommerce/shared/lib/utils/logger';

export interface RegisterUserCommand {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
}

export interface UpdateProfileCommand {
    userId: string;
    profileData: Partial<UserProfileData>;
}

export interface ChangePasswordCommand {
    userId: string;
    currentPassword: string;
    newPassword: string;
}

export interface LoginCommand {
    email: string;
    password: string;
}

export interface AddAddressCommand {
    userId: string;
    addressData: Omit<UserAddressData, 'id'>;
}

export interface UpdateAddressCommand {
    userId: string;
    addressId: string;
    addressData: Partial<UserAddressData>;
}

export interface RemoveAddressCommand {
    userId: string;
    addressId: string;
}

export interface DeactivateUserCommand {
    userId: string;
    reason?: string;
}

export interface ReactivateUserCommand {
    userId: string;
}

export class UserCommandHandlers {
    constructor(
        private userRepository: UserRepository,
        private eventBus: EventBus
    ) { }

    async handleRegisterUser(command: RegisterUserCommand): Promise<{ userId: string; token: string }> {
        try {
            // Check if user already exists
            const existingUser = await this.userRepository.findByEmail(command.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(command.password, 12);

            // Create user aggregate
            const userId = uuidv4();
            const profile: UserProfileData = {
                firstName: command.firstName,
                lastName: command.lastName,
                phone: command.phone,
                dateOfBirth: command.dateOfBirth,
                gender: command.gender,
            };

            const user = User.create(userId, command.email, passwordHash, profile);

            // Save to event store
            await this.userRepository.save(user);

            // Publish events
            const events = user.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }

            user.markEventsAsCommitted();

            // Generate JWT token
            const token = require('jsonwebtoken').sign(
                { id: userId, email: command.email, role: 'user' },
                process.env.JWT_SECRET!,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            logger.info(`User registered successfully: ${userId}`);
            return { userId, token };
        } catch (error) {
            logger.error('Error registering user:', error);
            throw error;
        }
    }

    async handleUpdateProfile(command: UpdateProfileCommand): Promise<void> {
        try {
            const user = await this.userRepository.findById(command.userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.updateProfile(command.profileData);

            await this.userRepository.save(user);

            // Publish events
            const events = user.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }

            user.markEventsAsCommitted();

            logger.info(`User profile updated: ${command.userId}`);
        } catch (error) {
            logger.error('Error updating user profile:', error);
            throw error;
        }
    }

    async handleChangePassword(command: ChangePasswordCommand): Promise<void> {
        try {
            const user = await this.userRepository.findById(command.userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(command.currentPassword, user.getPasswordHash());
            if (!isCurrentPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(command.newPassword, 12);

            user.changePassword(newPasswordHash);

            await this.userRepository.save(user);

            // Publish events
            const events = user.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }

            user.markEventsAsCommitted();

            logger.info(`User password changed: ${command.userId}`);
        } catch (error) {
            logger.error('Error changing password:', error);
            throw error;
        }
    }

    async handleLogin(command: LoginCommand): Promise<{ userId: string; token: string; user: any }> {
        try {
            const user = await this.userRepository.findByEmail(command.email);
            if (!user) {
                throw new Error('Invalid credentials');
            }

            if (!user.isActive()) {
                throw new Error('Account is deactivated');
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(command.password, user.getPasswordHash());
            if (!isPasswordValid) {
                throw new Error('Invalid credentials');
            }

            // Generate JWT token
            const token = require('jsonwebtoken').sign(
                { id: user.getId(), email: user.getEmail(), role: 'user' },
                process.env.JWT_SECRET!,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            logger.info(`User logged in: ${user.getId()}`);
            return {
                userId: user.getId(),
                token,
                user: {
                    id: user.getId(),
                    email: user.getEmail(),
                    profile: user.getProfile().toJSON(),
                    isEmailVerified: user.isEmailVerified(),
                    isActive: user.isActive(),
                }
            };
        } catch (error) {
            logger.error('Error during login:', error);
            throw error;
        }
    }

    async handleAddAddress(command: AddAddressCommand): Promise<void> {
        try {
            const user = await this.userRepository.findById(command.userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.addAddress(command.addressData);

            await this.userRepository.save(user);

            // Publish events
            const events = user.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }

            user.markEventsAsCommitted();

            logger.info(`Address added for user: ${command.userId}`);
        } catch (error) {
            logger.error('Error adding address:', error);
            throw error;
        }
    }

    async handleUpdateAddress(command: UpdateAddressCommand): Promise<void> {
        try {
            const user = await this.userRepository.findById(command.userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.updateAddress(command.addressId, command.addressData);

            await this.userRepository.save(user);

            // Publish events
            const events = user.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }

            user.markEventsAsCommitted();

            logger.info(`Address updated for user: ${command.userId}`);
        } catch (error) {
            logger.error('Error updating address:', error);
            throw error;
        }
    }

    async handleRemoveAddress(command: RemoveAddressCommand): Promise<void> {
        try {
            const user = await this.userRepository.findById(command.userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.removeAddress(command.addressId);

            await this.userRepository.save(user);

            // Publish events
            const events = user.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }

            user.markEventsAsCommitted();

            logger.info(`Address removed for user: ${command.userId}`);
        } catch (error) {
            logger.error('Error removing address:', error);
            throw error;
        }
    }

    async handleDeactivateUser(command: DeactivateUserCommand): Promise<void> {
        try {
            const user = await this.userRepository.findById(command.userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.deactivate(command.reason);

            await this.userRepository.save(user);

            // Publish events
            const events = user.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }

            user.markEventsAsCommitted();

            logger.info(`User deactivated: ${command.userId}`);
        } catch (error) {
            logger.error('Error deactivating user:', error);
            throw error;
        }
    }

    async handleReactivateUser(command: ReactivateUserCommand): Promise<void> {
        try {
            const user = await this.userRepository.findById(command.userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.reactivate();

            await this.userRepository.save(user);

            // Publish events
            const events = user.getUncommittedEvents();
            for (const event of events) {
                await this.eventBus.publish(event);
            }

            user.markEventsAsCommitted();

            logger.info(`User reactivated: ${command.userId}`);
        } catch (error) {
            logger.error('Error reactivating user:', error);
            throw error;
        }
    }
}
