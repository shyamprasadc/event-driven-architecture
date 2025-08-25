import { User } from '../../domain/aggregates/User';
import { EventStore, StoredEvent } from '@ecommerce/shared';
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
import logger from '@ecommerce/shared/lib/utils/logger';

export interface UserRepository {
    save(user: User): Promise<void>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(page?: number, limit?: number): Promise<{ users: User[]; total: number }>;
    search(query: string, page?: number, limit?: number): Promise<{ users: User[]; total: number }>;
}

export class EventSourcedUserRepository implements UserRepository {
    constructor(private eventStore: EventStore) { }

    async save(user: User): Promise<void> {
        try {
            const events = user.getUncommittedEvents();
            if (events.length > 0) {
                await this.eventStore.saveEvents(user.getId(), events, user.getVersion());
                user.markEventsAsCommitted();
            }
        } catch (error) {
            logger.error('Error saving user to event store:', error);
            throw error;
        }
    }

    async findById(id: string): Promise<User | null> {
        try {
            const events = await this.eventStore.getEvents(id);
            if (events.length === 0) {
                return null;
            }

            const domainEvents = events.map(event => this.mapStoredEventToDomainEvent(event));
            return User.fromEvents(id, domainEvents);
        } catch (error) {
            logger.error('Error finding user by ID:', error);
            throw error;
        }
    }

    async findByEmail(email: string): Promise<User | null> {
        try {
            // This is a simplified implementation
            // In a real system, you'd have a read model or projection for this query
            const allEvents = await this.eventStore.getAllEvents(0, 1000);

            // Group events by aggregate ID
            const eventsByUser: { [key: string]: StoredEvent[] } = {};
            allEvents.forEach(event => {
                if (!eventsByUser[event.aggregateId]) {
                    eventsByUser[event.aggregateId] = [];
                }
                eventsByUser[event.aggregateId].push(event);
            });

            // Find user with matching email
            for (const [userId, events] of Object.entries(eventsByUser)) {
                const domainEvents = events.map(event => this.mapStoredEventToDomainEvent(event));
                const user = User.fromEvents(userId, domainEvents);

                if (user.getEmail() === email) {
                    return user;
                }
            }

            return null;
        } catch (error) {
            logger.error('Error finding user by email:', error);
            throw error;
        }
    }

    async findAll(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
        try {
            const offset = (page - 1) * limit;
            const allEvents = await this.eventStore.getAllEvents(offset, limit * 10); // Get more events to ensure we have enough users

            // Group events by aggregate ID
            const eventsByUser: { [key: string]: StoredEvent[] } = {};
            allEvents.forEach(event => {
                if (!eventsByUser[event.aggregateId]) {
                    eventsByUser[event.aggregateId] = [];
                }
                eventsByUser[event.aggregateId].push(event);
            });

            // Convert to User aggregates
            const users: User[] = [];
            for (const [userId, events] of Object.entries(eventsByUser)) {
                const domainEvents = events.map(event => this.mapStoredEventToDomainEvent(event));
                const user = User.fromEvents(userId, domainEvents);
                users.push(user);
            }

            // Apply pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedUsers = users.slice(startIndex, endIndex);

            return {
                users: paginatedUsers,
                total: users.length
            };
        } catch (error) {
            logger.error('Error finding all users:', error);
            throw error;
        }
    }

    async search(query: string, page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
        try {
            const allEvents = await this.eventStore.getAllEvents(0, 1000);

            // Group events by aggregate ID
            const eventsByUser: { [key: string]: StoredEvent[] } = {};
            allEvents.forEach(event => {
                if (!eventsByUser[event.aggregateId]) {
                    eventsByUser[event.aggregateId] = [];
                }
                eventsByUser[event.aggregateId].push(event);
            });

            // Convert to User aggregates and filter by query
            const users: User[] = [];
            for (const [userId, events] of Object.entries(eventsByUser)) {
                const domainEvents = events.map(event => this.mapStoredEventToDomainEvent(event));
                const user = User.fromEvents(userId, domainEvents);

                // Search in email, first name, and last name
                const searchFields = [
                    user.getEmail().toLowerCase(),
                    user.getProfile().getFirstName().toLowerCase(),
                    user.getProfile().getLastName().toLowerCase()
                ];

                if (searchFields.some(field => field.includes(query.toLowerCase()))) {
                    users.push(user);
                }
            }

            // Apply pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedUsers = users.slice(startIndex, endIndex);

            return {
                users: paginatedUsers,
                total: users.length
            };
        } catch (error) {
            logger.error('Error searching users:', error);
            throw error;
        }
    }

    private mapStoredEventToDomainEvent(storedEvent: StoredEvent): any {
        const eventData = storedEvent.eventData;
        const metadata = storedEvent.metadata;

        switch (storedEvent.eventType) {
            case 'UserRegistered':
                return new UserRegistered(storedEvent.aggregateId, eventData, metadata);
            case 'UserProfileUpdated':
                return new UserProfileUpdated(storedEvent.aggregateId, eventData, metadata);
            case 'UserPasswordChanged':
                return new UserPasswordChanged(storedEvent.aggregateId, eventData, metadata);
            case 'UserEmailVerified':
                return new UserEmailVerified(storedEvent.aggregateId, eventData, metadata);
            case 'UserDeactivated':
                return new UserDeactivated(storedEvent.aggregateId, eventData, metadata);
            case 'UserReactivated':
                return new UserReactivated(storedEvent.aggregateId, eventData, metadata);
            case 'UserAddressAdded':
                return new UserAddressAdded(storedEvent.aggregateId, eventData, metadata);
            case 'UserAddressUpdated':
                return new UserAddressUpdated(storedEvent.aggregateId, eventData, metadata);
            case 'UserAddressRemoved':
                return new UserAddressRemoved(storedEvent.aggregateId, eventData, metadata);
            default:
                throw new Error(`Unknown event type: ${storedEvent.eventType}`);
        }
    }
}
