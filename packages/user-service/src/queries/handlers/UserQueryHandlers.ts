import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import logger from '@ecommerce/shared/lib/utils/logger';

export interface UserQueryResult {
    id: string;
    email: string;
    profile: {
        firstName: string;
        lastName: string;
        phone?: string;
        dateOfBirth?: string;
        gender?: 'male' | 'female' | 'other';
        avatar?: string;
    };
    addresses: Array<{
        id: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        isDefault: boolean;
        label?: string;
    }>;
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
}

export interface UserSearchResult {
    users: UserQueryResult[];
    total: number;
}

export class UserQueryHandlers {
    constructor(private userRepository: UserRepository) { }

    async getUserById(userId: string): Promise<UserQueryResult | null> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return null;
            }

            return this.mapUserToQueryResult(user);
        } catch (error) {
            logger.error('Error getting user by ID:', error);
            throw error;
        }
    }

    async getUserByEmail(email: string): Promise<UserQueryResult | null> {
        try {
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                return null;
            }

            return this.mapUserToQueryResult(user);
        } catch (error) {
            logger.error('Error getting user by email:', error);
            throw error;
        }
    }

    async getAllUsers(page: number = 1, limit: number = 10): Promise<UserSearchResult> {
        try {
            const result = await this.userRepository.findAll(page, limit);

            return {
                users: result.users.map(user => this.mapUserToQueryResult(user)),
                total: result.total
            };
        } catch (error) {
            logger.error('Error getting all users:', error);
            throw error;
        }
    }

    async searchUsers(query: string, page: number = 1, limit: number = 10): Promise<UserSearchResult> {
        try {
            const result = await this.userRepository.search(query, page, limit);

            return {
                users: result.users.map(user => this.mapUserToQueryResult(user)),
                total: result.total
            };
        } catch (error) {
            logger.error('Error searching users:', error);
            throw error;
        }
    }

    async getUserAddresses(userId: string): Promise<UserQueryResult['addresses']> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            return user.getAddresses().map(address => address.toJSON());
        } catch (error) {
            logger.error('Error getting user addresses:', error);
            throw error;
        }
    }

    async getUserAddressById(userId: string, addressId: string): Promise<UserQueryResult['addresses'][0] | null> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const address = user.getAddressById(addressId);
            return address ? address.toJSON() : null;
        } catch (error) {
            logger.error('Error getting user address by ID:', error);
            throw error;
        }
    }

    async getUserProfile(userId: string): Promise<UserQueryResult['profile'] | null> {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return null;
            }

            return user.getProfile().toJSON();
        } catch (error) {
            logger.error('Error getting user profile:', error);
            throw error;
        }
    }

    async getUsersByStatus(isActive: boolean, page: number = 1, limit: number = 10): Promise<UserSearchResult> {
        try {
            const result = await this.userRepository.findAll(page, limit);

            const filteredUsers = result.users.filter(user => user.isActive() === isActive);

            return {
                users: filteredUsers.map(user => this.mapUserToQueryResult(user)),
                total: filteredUsers.length
            };
        } catch (error) {
            logger.error('Error getting users by status:', error);
            throw error;
        }
    }

    async getUsersByEmailVerificationStatus(isEmailVerified: boolean, page: number = 1, limit: number = 10): Promise<UserSearchResult> {
        try {
            const result = await this.userRepository.findAll(page, limit);

            const filteredUsers = result.users.filter(user => user.isEmailVerified() === isEmailVerified);

            return {
                users: filteredUsers.map(user => this.mapUserToQueryResult(user)),
                total: filteredUsers.length
            };
        } catch (error) {
            logger.error('Error getting users by email verification status:', error);
            throw error;
        }
    }

    async getUsersCreatedInDateRange(startDate: string, endDate: string, page: number = 1, limit: number = 10): Promise<UserSearchResult> {
        try {
            const result = await this.userRepository.findAll(page, limit);

            const start = new Date(startDate);
            const end = new Date(endDate);

            const filteredUsers = result.users.filter(user => {
                const createdAt = new Date(user.getCreatedAt());
                return createdAt >= start && createdAt <= end;
            });

            return {
                users: filteredUsers.map(user => this.mapUserToQueryResult(user)),
                total: filteredUsers.length
            };
        } catch (error) {
            logger.error('Error getting users by date range:', error);
            throw error;
        }
    }

    private mapUserToQueryResult(user: any): UserQueryResult {
        return {
            id: user.getId(),
            email: user.getEmail(),
            profile: user.getProfile().toJSON(),
            addresses: user.getAddresses().map((address: any) => address.toJSON()),
            isEmailVerified: user.isEmailVerified(),
            isActive: user.isActive(),
            createdAt: user.getCreatedAt(),
            updatedAt: user.getUpdatedAt(),
            lastLoginAt: user.getLastLoginAt(),
        };
    }
}
