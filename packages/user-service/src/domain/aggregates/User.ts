import { Event } from '@ecommerce/shared';
import { UserProfile, UserProfileData } from '../valueObjects/UserProfile';
import { UserAddress, UserAddressData } from '../valueObjects/UserAddress';
import {
    UserRegistered,
    UserProfileUpdated,
    UserPasswordChanged,
    UserEmailVerified,
    UserDeactivated,
    UserReactivated,
    UserAddressAdded,
    UserAddressUpdated,
    UserAddressRemoved
} from '@ecommerce/shared';

export interface UserState {
    id: string;
    email: string;
    passwordHash: string;
    profile: UserProfileData;
    addresses: UserAddressData[];
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
}

export class User {
    private id: string;
    private email: string;
    private passwordHash: string;
    private profile: UserProfile;
    private addresses: UserAddress[];
    private isEmailVerified: boolean;
    private isActive: boolean;
    private createdAt: string;
    private updatedAt: string;
    private lastLoginAt?: string;
    private version: number;
    private uncommittedEvents: Event[];

    constructor(id: string) {
        this.id = id;
        this.version = 0;
        this.uncommittedEvents = [];
    }

    // Factory method to create a new user
    static create(
        id: string,
        email: string,
        passwordHash: string,
        profile: UserProfileData
    ): User {
        const user = new User(id);
        user.apply(new UserRegistered(id, {
            email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            passwordHash
        }));
        return user;
    }

    // Factory method to reconstruct user from events
    static fromEvents(id: string, events: Event[]): User {
        const user = new User(id);
        events.forEach(event => user.apply(event));
        user.version = events.length;
        user.uncommittedEvents = [];
        return user;
    }

    // Apply event to aggregate
    private apply(event: Event): void {
        switch (event.eventType) {
            case 'UserRegistered':
                this.handleUserRegistered(event);
                break;
            case 'UserProfileUpdated':
                this.handleUserProfileUpdated(event);
                break;
            case 'UserPasswordChanged':
                this.handleUserPasswordChanged(event);
                break;
            case 'UserEmailVerified':
                this.handleUserEmailVerified(event);
                break;
            case 'UserDeactivated':
                this.handleUserDeactivated(event);
                break;
            case 'UserReactivated':
                this.handleUserReactivated(event);
                break;
            case 'UserAddressAdded':
                this.handleUserAddressAdded(event);
                break;
            case 'UserAddressUpdated':
                this.handleUserAddressUpdated(event);
                break;
            case 'UserAddressRemoved':
                this.handleUserAddressRemoved(event);
                break;
        }
    }

    private handleUserRegistered(event: UserRegistered): void {
        this.email = event.data.email;
        this.passwordHash = event.data.passwordHash;
        this.profile = new UserProfile({
            firstName: event.data.firstName,
            lastName: event.data.lastName
        });
        this.addresses = [];
        this.isEmailVerified = false;
        this.isActive = true;
        this.createdAt = event.metadata.timestamp;
        this.updatedAt = event.metadata.timestamp;
    }

    private handleUserProfileUpdated(event: UserProfileUpdated): void {
        const currentProfile = this.profile.toJSON();
        this.profile = new UserProfile({
            ...currentProfile,
            ...event.data
        });
        this.updatedAt = event.metadata.timestamp;
    }

    private handleUserPasswordChanged(event: UserPasswordChanged): void {
        this.passwordHash = event.data.passwordHash;
        this.updatedAt = event.metadata.timestamp;
    }

    private handleUserEmailVerified(event: UserEmailVerified): void {
        this.isEmailVerified = true;
        this.updatedAt = event.metadata.timestamp;
    }

    private handleUserDeactivated(event: UserDeactivated): void {
        this.isActive = false;
        this.updatedAt = event.metadata.timestamp;
    }

    private handleUserReactivated(event: UserReactivated): void {
        this.isActive = true;
        this.updatedAt = event.metadata.timestamp;
    }

    private handleUserAddressAdded(event: UserAddressAdded): void {
        const newAddress = new UserAddress(event.data.address);
        this.addresses.push(newAddress);

        // If this is the default address, remove default from others
        if (newAddress.isDefaultAddress()) {
            this.addresses.forEach(addr => {
                if (addr.getId() !== newAddress.getId()) {
                    // Note: In a real implementation, you'd emit an event to update other addresses
                }
            });
        }
        this.updatedAt = event.metadata.timestamp;
    }

    private handleUserAddressUpdated(event: UserAddressUpdated): void {
        const addressIndex = this.addresses.findIndex(addr => addr.getId() === event.data.addressId);
        if (addressIndex !== -1) {
            const currentAddress = this.addresses[addressIndex].toJSON();
            const updatedAddress = new UserAddress({
                ...currentAddress,
                ...event.data.address
            });
            this.addresses[addressIndex] = updatedAddress;
            this.updatedAt = event.metadata.timestamp;
        }
    }

    private handleUserAddressRemoved(event: UserAddressRemoved): void {
        this.addresses = this.addresses.filter(addr => addr.getId() !== event.data.addressId);
        this.updatedAt = event.metadata.timestamp;
    }

    // Command methods
    updateProfile(profileData: Partial<UserProfileData>): void {
        if (!this.isActive) {
            throw new Error('Cannot update profile of inactive user');
        }

        this.apply(new UserProfileUpdated(this.id, profileData));
        this.uncommittedEvents.push(new UserProfileUpdated(this.id, profileData));
    }

    changePassword(newPasswordHash: string): void {
        if (!this.isActive) {
            throw new Error('Cannot change password of inactive user');
        }

        this.apply(new UserPasswordChanged(this.id, {
            passwordHash: newPasswordHash,
            changedAt: new Date().toISOString()
        }));
        this.uncommittedEvents.push(new UserPasswordChanged(this.id, {
            passwordHash: newPasswordHash,
            changedAt: new Date().toISOString()
        }));
    }

    verifyEmail(): void {
        if (!this.isActive) {
            throw new Error('Cannot verify email of inactive user');
        }

        this.apply(new UserEmailVerified(this.id, {
            verifiedAt: new Date().toISOString()
        }));
        this.uncommittedEvents.push(new UserEmailVerified(this.id, {
            verifiedAt: new Date().toISOString()
        }));
    }

    deactivate(reason?: string): void {
        if (!this.isActive) {
            throw new Error('User is already deactivated');
        }

        this.apply(new UserDeactivated(this.id, {
            reason,
            deactivatedAt: new Date().toISOString()
        }));
        this.uncommittedEvents.push(new UserDeactivated(this.id, {
            reason,
            deactivatedAt: new Date().toISOString()
        }));
    }

    reactivate(): void {
        if (this.isActive) {
            throw new Error('User is already active');
        }

        this.apply(new UserReactivated(this.id, {
            reactivatedAt: new Date().toISOString()
        }));
        this.uncommittedEvents.push(new UserReactivated(this.id, {
            reactivatedAt: new Date().toISOString()
        }));
    }

    addAddress(addressData: Omit<UserAddressData, 'id'>): void {
        if (!this.isActive) {
            throw new Error('Cannot add address to inactive user');
        }

        const addressId = require('uuid').v4();
        const newAddress = {
            ...addressData,
            id: addressId
        };

        this.apply(new UserAddressAdded(this.id, {
            addressId,
            address: newAddress
        }));
        this.uncommittedEvents.push(new UserAddressAdded(this.id, {
            addressId,
            address: newAddress
        }));
    }

    updateAddress(addressId: string, addressData: Partial<UserAddressData>): void {
        if (!this.isActive) {
            throw new Error('Cannot update address of inactive user');
        }

        const address = this.addresses.find(addr => addr.getId() === addressId);
        if (!address) {
            throw new Error('Address not found');
        }

        this.apply(new UserAddressUpdated(this.id, {
            addressId,
            address: addressData
        }));
        this.uncommittedEvents.push(new UserAddressUpdated(this.id, {
            addressId,
            address: addressData
        }));
    }

    removeAddress(addressId: string): void {
        if (!this.isActive) {
            throw new Error('Cannot remove address of inactive user');
        }

        const address = this.addresses.find(addr => addr.getId() === addressId);
        if (!address) {
            throw new Error('Address not found');
        }

        this.apply(new UserAddressRemoved(this.id, { addressId }));
        this.uncommittedEvents.push(new UserAddressRemoved(this.id, { addressId }));
    }

    // Query methods
    getId(): string {
        return this.id;
    }

    getEmail(): string {
        return this.email;
    }

    getPasswordHash(): string {
        return this.passwordHash;
    }

    getProfile(): UserProfile {
        return this.profile;
    }

    getAddresses(): UserAddress[] {
        return [...this.addresses];
    }

    getDefaultAddress(): UserAddress | undefined {
        return this.addresses.find(addr => addr.isDefaultAddress());
    }

    getAddressById(addressId: string): UserAddress | undefined {
        return this.addresses.find(addr => addr.getId() === addressId);
    }

    isEmailVerified(): boolean {
        return this.isEmailVerified;
    }

    isActive(): boolean {
        return this.isActive;
    }

    getCreatedAt(): string {
        return this.createdAt;
    }

    getUpdatedAt(): string {
        return this.updatedAt;
    }

    getLastLoginAt(): string | undefined {
        return this.lastLoginAt;
    }

    getVersion(): number {
        return this.version;
    }

    getUncommittedEvents(): Event[] {
        return [...this.uncommittedEvents];
    }

    markEventsAsCommitted(): void {
        this.uncommittedEvents = [];
    }

    toJSON(): UserState {
        return {
            id: this.id,
            email: this.email,
            passwordHash: this.passwordHash,
            profile: this.profile.toJSON(),
            addresses: this.addresses.map(addr => addr.toJSON()),
            isEmailVerified: this.isEmailVerified,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastLoginAt: this.lastLoginAt,
        };
    }
}
