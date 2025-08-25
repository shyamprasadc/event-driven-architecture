import { Order } from '../../domain/aggregates/Order';
import { EventStore } from '@ecommerce/shared';
import { logger } from '@ecommerce/shared';

export interface OrderRepository {
    save(order: Order): Promise<void>;
    findById(id: string): Promise<Order | null>;
    findByUserId(userId: string): Promise<Order[]>;
    findByStatus(status: string): Promise<Order[]>;
    delete(id: string): Promise<void>;
}

export class PostgreSQLEventStoreOrderRepository implements OrderRepository {
    constructor(private eventStore: EventStore) { }

    async save(order: Order): Promise<void> {
        try {
            const events = order.getUncommittedEvents();
            if (events.length === 0) {
                return;
            }

            const expectedVersion = order.getVersion() - events.length;
            await this.eventStore.saveEvents(order.getId(), events, expectedVersion);

            logger.info('Order saved to event store', {
                orderId: order.getId(),
                eventsCount: events.length,
                version: order.getVersion()
            });
        } catch (error) {
            logger.error('Failed to save order to event store', {
                error,
                orderId: order.getId()
            });
            throw error;
        }
    }

    async findById(id: string): Promise<Order | null> {
        try {
            const events = await this.eventStore.getEvents(id);
            if (events.length === 0) {
                return null;
            }

            const order = Order.fromEvents(id, events);
            logger.info('Order loaded from event store', {
                orderId: id,
                eventsCount: events.length
            });

            return order;
        } catch (error) {
            logger.error('Failed to load order from event store', { error, orderId: id });
            throw error;
        }
    }

    async findByUserId(userId: string): Promise<Order[]> {
        try {
            // This would require a projection or index to efficiently query by userId
            // For now, we'll return an empty array as this is typically handled by projections
            logger.warn('findByUserId not implemented - use projections instead', { userId });
            return [];
        } catch (error) {
            logger.error('Failed to find orders by user ID', { error, userId });
            throw error;
        }
    }

    async findByStatus(status: string): Promise<Order[]> {
        try {
            // This would require a projection or index to efficiently query by status
            // For now, we'll return an empty array as this is typically handled by projections
            logger.warn('findByStatus not implemented - use projections instead', { status });
            return [];
        } catch (error) {
            logger.error('Failed to find orders by status', { error, status });
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            // In event sourcing, we typically don't delete aggregates
            // Instead, we might mark them as deleted or archived
            logger.warn('Delete not implemented in event sourcing - consider soft delete', { orderId: id });
            throw new Error('Delete not supported in event sourcing');
        } catch (error) {
            logger.error('Failed to delete order', { error, orderId: id });
            throw error;
        }
    }
}
