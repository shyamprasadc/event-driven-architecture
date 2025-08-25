import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '@ecommerce/shared';
import { Order } from '../../domain/aggregates/Order';
import { OrderRepository } from '../../infrastructure/repositories/OrderRepository';
import { OrderItemData } from '../../domain/valueObjects/OrderItem';
import { OrderAddressData } from '../../domain/valueObjects/OrderAddress';
import { logger } from '@ecommerce/shared';

export interface CreateOrderCommand {
    userId: string;
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
        sku: string;
        name: string;
    }>;
    shippingAddress: OrderAddressData;
    billingAddress: OrderAddressData;
    paymentMethod: string;
    currency?: string;
}

export interface ConfirmOrderCommand {
    orderId: string;
    confirmedBy: string;
}

export interface RequestPaymentCommand {
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
}

export interface MarkOrderPaidCommand {
    orderId: string;
    paymentId: string;
    transactionId: string;
    amount: number;
    currency: string;
}

export interface MarkPaymentFailedCommand {
    orderId: string;
    paymentId: string;
    reason: string;
    errorCode?: string;
}

export interface ShipOrderCommand {
    orderId: string;
    trackingNumber: string;
    carrier: string;
    estimatedDelivery: Date;
}

export interface DeliverOrderCommand {
    orderId: string;
    deliveredTo: string;
    signature?: string;
}

export interface CancelOrderCommand {
    orderId: string;
    cancelledBy: string;
    reason: string;
    refundAmount?: number;
}

export interface RefundOrderCommand {
    orderId: string;
    refundId: string;
    refundAmount: number;
    currency: string;
    reason: string;
    refundMethod: string;
}

export interface UpdateOrderItemCommand {
    orderId: string;
    itemId: string;
    newQuantity: number;
}

export interface RemoveOrderItemCommand {
    orderId: string;
    itemId: string;
    reason?: string;
}

export interface UpdateOrderAddressCommand {
    orderId: string;
    addressType: 'shipping' | 'billing';
    newAddress: OrderAddressData;
}

export class OrderCommandHandlers {
    constructor(
        private orderRepository: OrderRepository,
        private eventBus: EventBus
    ) { }

    async createOrder(command: CreateOrderCommand): Promise<string> {
        try {
            const orderId = uuidv4();
            const currency = command.currency || 'USD';

            // Convert items to OrderItemData format
            const orderItems: OrderItemData[] = command.items.map(item => ({
                id: `${orderId}-${item.productId}`,
                productId: item.productId,
                sku: item.sku,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.price * item.quantity,
                currency,
            }));

            const order = Order.create(
                orderId,
                command.userId,
                orderItems,
                command.shippingAddress,
                command.billingAddress,
                command.paymentMethod
            );

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Order created successfully', { orderId, userId: command.userId });
            return orderId;
        } catch (error) {
            logger.error('Failed to create order', { error, command });
            throw error;
        }
    }

    async confirmOrder(command: ConfirmOrderCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.confirm(command.confirmedBy);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Order confirmed successfully', { orderId: command.orderId });
        } catch (error) {
            logger.error('Failed to confirm order', { error, command });
            throw error;
        }
    }

    async requestPayment(command: RequestPaymentCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.requestPayment(command.paymentId, command.amount, command.currency);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Payment requested successfully', { orderId: command.orderId, paymentId: command.paymentId });
        } catch (error) {
            logger.error('Failed to request payment', { error, command });
            throw error;
        }
    }

    async markOrderPaid(command: MarkOrderPaidCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.markAsPaid(command.paymentId, command.transactionId, command.amount, command.currency);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Order marked as paid successfully', { orderId: command.orderId, paymentId: command.paymentId });
        } catch (error) {
            logger.error('Failed to mark order as paid', { error, command });
            throw error;
        }
    }

    async markPaymentFailed(command: MarkPaymentFailedCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.markPaymentFailed(command.paymentId, command.reason, command.errorCode);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Payment marked as failed', { orderId: command.orderId, paymentId: command.paymentId });
        } catch (error) {
            logger.error('Failed to mark payment as failed', { error, command });
            throw error;
        }
    }

    async shipOrder(command: ShipOrderCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.ship(command.trackingNumber, command.carrier, command.estimatedDelivery);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Order shipped successfully', { orderId: command.orderId, trackingNumber: command.trackingNumber });
        } catch (error) {
            logger.error('Failed to ship order', { error, command });
            throw error;
        }
    }

    async deliverOrder(command: DeliverOrderCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.deliver(command.deliveredTo, command.signature);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Order delivered successfully', { orderId: command.orderId });
        } catch (error) {
            logger.error('Failed to deliver order', { error, command });
            throw error;
        }
    }

    async cancelOrder(command: CancelOrderCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.cancel(command.cancelledBy, command.reason, command.refundAmount);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Order cancelled successfully', { orderId: command.orderId });
        } catch (error) {
            logger.error('Failed to cancel order', { error, command });
            throw error;
        }
    }

    async refundOrder(command: RefundOrderCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.refund(command.refundId, command.refundAmount, command.currency, command.reason, command.refundMethod);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Order refunded successfully', { orderId: command.orderId, refundId: command.refundId });
        } catch (error) {
            logger.error('Failed to refund order', { error, command });
            throw error;
        }
    }

    async updateOrderItem(command: UpdateOrderItemCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.updateItemQuantity(command.itemId, command.newQuantity);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Order item updated successfully', { orderId: command.orderId, itemId: command.itemId });
        } catch (error) {
            logger.error('Failed to update order item', { error, command });
            throw error;
        }
    }

    async removeOrderItem(command: RemoveOrderItemCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.removeItem(command.itemId, command.reason);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Order item removed successfully', { orderId: command.orderId, itemId: command.itemId });
        } catch (error) {
            logger.error('Failed to remove order item', { error, command });
            throw error;
        }
    }

    async updateOrderAddress(command: UpdateOrderAddressCommand): Promise<void> {
        try {
            const order = await this.orderRepository.findById(command.orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            order.updateAddress(command.addressType, command.newAddress);

            await this.orderRepository.save(order);
            await this.publishEvents(order.getUncommittedEvents());
            order.markEventsAsCommitted();

            logger.info('Order address updated successfully', { orderId: command.orderId, addressType: command.addressType });
        } catch (error) {
            logger.error('Failed to update order address', { error, command });
            throw error;
        }
    }

    private async publishEvents(events: any[]): Promise<void> {
        for (const event of events) {
            await this.eventBus.publish(event);
        }
    }
}
