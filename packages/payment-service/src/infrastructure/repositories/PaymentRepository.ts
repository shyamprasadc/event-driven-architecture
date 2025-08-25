import { Payment } from '../../domain/aggregates/Payment';
import { EventStore } from '@ecommerce/shared';
import { logger } from '@ecommerce/shared';

export interface PaymentRepository {
    save(payment: Payment): Promise<void>;
    findById(id: string): Promise<Payment | null>;
    findByOrderId(orderId: string): Promise<Payment | null>;
    findByUserId(userId: string): Promise<Payment[]>;
    findByStatus(status: string): Promise<Payment[]>;
    delete(id: string): Promise<void>;
}

export class PostgreSQLEventStorePaymentRepository implements PaymentRepository {
    constructor(private eventStore: EventStore) { }

    async save(payment: Payment): Promise<void> {
        try {
            const events = payment.getUncommittedEvents();
            if (events.length === 0) {
                return;
            }

            const expectedVersion = payment.getVersion() - events.length;
            await this.eventStore.saveEvents(payment.getId(), events, expectedVersion);

            logger.info('Payment saved to event store', {
                paymentId: payment.getId(),
                eventsCount: events.length,
                version: payment.getVersion()
            });
        } catch (error) {
            logger.error('Failed to save payment to event store', {
                error,
                paymentId: payment.getId()
            });
            throw error;
        }
    }

    async findById(id: string): Promise<Payment | null> {
        try {
            const events = await this.eventStore.getEvents(id);
            if (events.length === 0) {
                return null;
            }

            const payment = Payment.fromEvents(id, events);
            logger.info('Payment loaded from event store', {
                paymentId: id,
                eventsCount: events.length
            });

            return payment;
        } catch (error) {
            logger.error('Failed to load payment from event store', { error, paymentId: id });
            throw error;
        }
    }

    async findByOrderId(orderId: string): Promise<Payment | null> {
        try {
            // This would require a projection or index to efficiently query by orderId
            // For now, we'll return null as this is typically handled by projections
            logger.warn('findByOrderId not implemented - use projections instead', { orderId });
            return null;
        } catch (error) {
            logger.error('Failed to find payment by order ID', { error, orderId });
            throw error;
        }
    }

    async findByUserId(userId: string): Promise<Payment[]> {
        try {
            // This would require a projection or index to efficiently query by userId
            // For now, we'll return an empty array as this is typically handled by projections
            logger.warn('findByUserId not implemented - use projections instead', { userId });
            return [];
        } catch (error) {
            logger.error('Failed to find payments by user ID', { error, userId });
            throw error;
        }
    }

    async findByStatus(status: string): Promise<Payment[]> {
        try {
            // This would require a projection or index to efficiently query by status
            // For now, we'll return an empty array as this is typically handled by projections
            logger.warn('findByStatus not implemented - use projections instead', { status });
            return [];
        } catch (error) {
            logger.error('Failed to find payments by status', { error, status });
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            // In event sourcing, we typically don't delete aggregates
            // Instead, we might mark them as deleted or archived
            logger.warn('Delete not implemented in event sourcing - consider soft delete', { paymentId: id });
            throw new Error('Delete not supported in event sourcing');
        } catch (error) {
            logger.error('Failed to delete payment', { error, paymentId: id });
            throw error;
        }
    }
}
