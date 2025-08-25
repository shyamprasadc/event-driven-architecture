import { User } from '../domain/aggregates/User';
import { UserProfileData } from '../domain/valueObjects/UserProfile';

describe('User Aggregate', () => {
    let user: User;
    const userId = 'test-user-id';
    const email = 'test@example.com';
    const passwordHash = 'hashed-password';
    const profile: UserProfileData = {
        firstName: 'John',
        lastName: 'Doe'
    };

    beforeEach(() => {
        user = User.create(userId, email, passwordHash, profile);
    });

    describe('User Creation', () => {
        it('should create a user with correct initial state', () => {
            expect(user.getId()).toBe(userId);
            expect(user.getEmail()).toBe(email);
            expect(user.getPasswordHash()).toBe(passwordHash);
            expect(user.getProfile().getFirstName()).toBe(profile.firstName);
            expect(user.getProfile().getLastName()).toBe(profile.lastName);
            expect(user.isActive()).toBe(true);
            expect(user.isEmailVerified()).toBe(false);
        });

        it('should generate UserRegistered event', () => {
            const events = user.getUncommittedEvents();
            expect(events).toHaveLength(1);
            expect(events[0].eventType).toBe('UserRegistered');
            expect(events[0].data.email).toBe(email);
        });
    });

    describe('Profile Updates', () => {
        it('should update user profile', () => {
            const updatedProfile = {
                firstName: 'Jane',
                lastName: 'Smith',
                phone: '+1234567890'
            };

            user.updateProfile(updatedProfile);

            expect(user.getProfile().getFirstName()).toBe(updatedProfile.firstName);
            expect(user.getProfile().getLastName()).toBe(updatedProfile.lastName);
            expect(user.getProfile().getPhone()).toBe(updatedProfile.phone);
        });

        it('should generate UserProfileUpdated event', () => {
            user.updateProfile({ firstName: 'Jane' });

            const events = user.getUncommittedEvents();
            const profileEvent = events.find(e => e.eventType === 'UserProfileUpdated');
            expect(profileEvent).toBeDefined();
            expect(profileEvent!.data.firstName).toBe('Jane');
        });
    });

    describe('Password Changes', () => {
        it('should change password', () => {
            const newPasswordHash = 'new-hashed-password';
            user.changePassword(newPasswordHash);

            expect(user.getPasswordHash()).toBe(newPasswordHash);
        });

        it('should generate UserPasswordChanged event', () => {
            user.changePassword('new-hashed-password');

            const events = user.getUncommittedEvents();
            const passwordEvent = events.find(e => e.eventType === 'UserPasswordChanged');
            expect(passwordEvent).toBeDefined();
            expect(passwordEvent!.data.passwordHash).toBe('new-hashed-password');
        });
    });

    describe('Email Verification', () => {
        it('should verify email', () => {
            user.verifyEmail();

            expect(user.isEmailVerified()).toBe(true);
        });

        it('should generate UserEmailVerified event', () => {
            user.verifyEmail();

            const events = user.getUncommittedEvents();
            const emailEvent = events.find(e => e.eventType === 'UserEmailVerified');
            expect(emailEvent).toBeDefined();
        });
    });

    describe('User Deactivation', () => {
        it('should deactivate user', () => {
            user.deactivate('Test reason');

            expect(user.isActive()).toBe(false);
        });

        it('should generate UserDeactivated event', () => {
            user.deactivate('Test reason');

            const events = user.getUncommittedEvents();
            const deactivatedEvent = events.find(e => e.eventType === 'UserDeactivated');
            expect(deactivatedEvent).toBeDefined();
            expect(deactivatedEvent!.data.reason).toBe('Test reason');
        });

        it('should not allow operations on deactivated user', () => {
            user.deactivate('Test reason');

            expect(() => user.updateProfile({ firstName: 'Jane' })).toThrow('Cannot update profile of inactive user');
            expect(() => user.changePassword('new-password')).toThrow('Cannot change password of inactive user');
        });
    });

    describe('User Reactivation', () => {
        it('should reactivate user', () => {
            user.deactivate('Test reason');
            user.reactivate();

            expect(user.isActive()).toBe(true);
        });

        it('should generate UserReactivated event', () => {
            user.deactivate('Test reason');
            user.reactivate();

            const events = user.getUncommittedEvents();
            const reactivatedEvent = events.find(e => e.eventType === 'UserReactivated');
            expect(reactivatedEvent).toBeDefined();
        });
    });

    describe('Address Management', () => {
        it('should add address', () => {
            const addressData = {
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                country: 'USA',
                isDefault: true
            };

            user.addAddress(addressData);

            const addresses = user.getAddresses();
            expect(addresses).toHaveLength(1);
            expect(addresses[0].getStreet()).toBe(addressData.street);
            expect(addresses[0].getCity()).toBe(addressData.city);
        });

        it('should generate UserAddressAdded event', () => {
            user.addAddress({
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                country: 'USA',
                isDefault: true
            });

            const events = user.getUncommittedEvents();
            const addressEvent = events.find(e => e.eventType === 'UserAddressAdded');
            expect(addressEvent).toBeDefined();
        });

        it('should update address', () => {
            user.addAddress({
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                country: 'USA',
                isDefault: true
            });

            const addresses = user.getAddresses();
            const addressId = addresses[0].getId();

            user.updateAddress(addressId, { city: 'Los Angeles' });

            const updatedAddress = user.getAddressById(addressId);
            expect(updatedAddress!.getCity()).toBe('Los Angeles');
        });

        it('should remove address', () => {
            user.addAddress({
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                country: 'USA',
                isDefault: true
            });

            const addresses = user.getAddresses();
            const addressId = addresses[0].getId();

            user.removeAddress(addressId);

            expect(user.getAddresses()).toHaveLength(0);
        });
    });

    describe('Event Sourcing', () => {
        it('should reconstruct user from events', () => {
            // Create initial user
            const originalUser = User.create(userId, email, passwordHash, profile);

            // Apply some changes
            originalUser.updateProfile({ firstName: 'Jane' });
            originalUser.verifyEmail();
            originalUser.addAddress({
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                country: 'USA',
                isDefault: true
            });

            // Get all events
            const events = originalUser.getUncommittedEvents();

            // Reconstruct user from events
            const reconstructedUser = User.fromEvents(userId, events);

            // Verify state is the same
            expect(reconstructedUser.getId()).toBe(originalUser.getId());
            expect(reconstructedUser.getEmail()).toBe(originalUser.getEmail());
            expect(reconstructedUser.getProfile().getFirstName()).toBe('Jane');
            expect(reconstructedUser.isEmailVerified()).toBe(true);
            expect(reconstructedUser.getAddresses()).toHaveLength(1);
        });
    });
});
