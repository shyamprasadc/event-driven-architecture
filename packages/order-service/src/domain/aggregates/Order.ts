import { Event } from '@ecommerce/shared';
import {
    OrderCreated,
    OrderConfirmed,
    OrderPaymentRequested,
    OrderPaid,
    OrderPaymentFailed,
    OrderShipped,
    OrderDelivered,
    OrderCancelled,
    OrderRefunded,
    OrderItemUpdated,
    OrderItemRemoved,
    OrderStatusChanged,
    OrderAddressUpdated,
} from '@ecommerce/shared';
import { OrderItem, OrderItemData } from '../valueObjects/OrderItem';
import { OrderAddress, OrderAddressData } from '../valueObjects/OrderAddress';

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'payment_pending'
    | 'paid'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded';

export interface OrderState {
    id: string;
    userId: string;
    items: OrderItemData[];
    totalAmount: number;
    currency: string;
    status: OrderStatus;
    shippingAddress: OrderAddressData;
    billingAddress: OrderAddressData;
    paymentMethod: string;
    paymentId?: string;
    trackingNumber?: string;
    carrier?: string;
    createdAt: Date;
    updatedAt: Date;
    confirmedAt?: Date;
    paidAt?: Date;
    shippedAt?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;
    refundedAt?: Date;
}

export class Order {
    private id: string;
    private userId: string;
    private items: Map<string, OrderItem>;
    private totalAmount: number;
    private currency: string;
    private status: OrderStatus;
    private shippingAddress: OrderAddress;
    private billingAddress: OrderAddress;
    private paymentMethod: string;
    private paymentId?: string;
    private trackingNumber?: string;
    private carrier?: string;
    private createdAt: Date;
    private updatedAt: Date;
    private confirmedAt?: Date;
    private paidAt?: Date;
    private shippedAt?: Date;
    private deliveredAt?: Date;
    private cancelledAt?: Date;
    private refundedAt?: Date;
    private version: number = 0;
    private uncommittedEvents: Event[] = [];

    constructor(id: string) {
        this.id = id;
        this.userId = '';
        this.items = new Map();
        this.totalAmount = 0;
        this.currency = 'USD';
        this.status = 'pending';
        this.shippingAddress = new OrderAddress({
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
        });
        this.billingAddress = new OrderAddress({
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
        });
        this.paymentMethod = '';
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    static create(
        id: string,
        userId: string,
        items: OrderItemData[],
        shippingAddress: OrderAddressData,
        billingAddress: OrderAddressData,
        paymentMethod: string
    ): Order {
        const order = new Order(id);
        const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

        order.applyEvent(
            new OrderCreated(id, {
                userId,
                items: items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    sku: item.sku,
                })),
                totalAmount,
                currency: items[0]?.currency || 'USD',
                shippingAddress,
                billingAddress,
                paymentMethod,
            })
        );
        return order;
    }

    static fromEvents(id: string, events: Event[]): Order {
        const order = new Order(id);
        events.forEach(event => order.applyEvent(event));
        return order;
    }

    private applyEvent(event: Event): void {
        this.apply(event);
        this.version++;
        this.uncommittedEvents.push(event);
    }

    private apply(event: Event): void {
        switch (event.eventType) {
            case 'OrderCreated':
                this.applyOrderCreated(event);
                break;
            case 'OrderConfirmed':
                this.applyOrderConfirmed(event);
                break;
            case 'OrderPaymentRequested':
                this.applyOrderPaymentRequested(event);
                break;
            case 'OrderPaid':
                this.applyOrderPaid(event);
                break;
            case 'OrderPaymentFailed':
                this.applyOrderPaymentFailed(event);
                break;
            case 'OrderShipped':
                this.applyOrderShipped(event);
                break;
            case 'OrderDelivered':
                this.applyOrderDelivered(event);
                break;
            case 'OrderCancelled':
                this.applyOrderCancelled(event);
                break;
            case 'OrderRefunded':
                this.applyOrderRefunded(event);
                break;
            case 'OrderItemUpdated':
                this.applyOrderItemUpdated(event);
                break;
            case 'OrderItemRemoved':
                this.applyOrderItemRemoved(event);
                break;
            case 'OrderStatusChanged':
                this.applyOrderStatusChanged(event);
                break;
            case 'OrderAddressUpdated':
                this.applyOrderAddressUpdated(event);
                break;
        }
    }

    private applyOrderCreated(event: OrderCreated): void {
        const data = event.data;
        this.userId = data.userId;
        this.currency = data.currency;
        this.shippingAddress = new OrderAddress(data.shippingAddress);
        this.billingAddress = new OrderAddress(data.billingAddress);
        this.paymentMethod = data.paymentMethod;
        this.createdAt = event.metadata.timestamp;
        this.updatedAt = event.metadata.timestamp;

        // Add items
        data.items.forEach(item => {
            const orderItem = new OrderItem({
                id: `${this.id}-${item.productId}`,
                productId: item.productId,
                sku: item.sku,
                name: '', // This would be populated from product service
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.price * item.quantity,
                currency: this.currency,
            });
            this.items.set(orderItem.getId(), orderItem);
        });

        this.totalAmount = data.totalAmount;
    }

    private applyOrderConfirmed(event: OrderConfirmed): void {
        const data = event.data;
        this.status = 'confirmed';
        this.confirmedAt = data.confirmedAt;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderPaymentRequested(event: OrderPaymentRequested): void {
        const data = event.data;
        this.status = 'payment_pending';
        this.paymentId = data.paymentId;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderPaid(event: OrderPaid): void {
        const data = event.data;
        this.status = 'paid';
        this.paymentId = data.paymentId;
        this.paidAt = data.paidAt;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderPaymentFailed(event: OrderPaymentFailed): void {
        const data = event.data;
        this.status = 'pending';
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderShipped(event: OrderShipped): void {
        const data = event.data;
        this.status = 'shipped';
        this.trackingNumber = data.trackingNumber;
        this.carrier = data.carrier;
        this.shippedAt = data.shippedAt;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderDelivered(event: OrderDelivered): void {
        const data = event.data;
        this.status = 'delivered';
        this.deliveredAt = data.deliveredAt;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderCancelled(event: OrderCancelled): void {
        const data = event.data;
        this.status = 'cancelled';
        this.cancelledAt = data.cancelledAt;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderRefunded(event: OrderRefunded): void {
        const data = event.data;
        this.status = 'refunded';
        this.refundedAt = data.refundedAt;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderItemUpdated(event: OrderItemUpdated): void {
        const data = event.data;
        const item = this.items.get(data.itemId);
        if (item) {
            const updatedItem = item.updateQuantity(data.quantity);
            this.items.set(data.itemId, updatedItem);
            this.recalculateTotal();
        }
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderItemRemoved(event: OrderItemRemoved): void {
        const data = event.data;
        this.items.delete(data.itemId);
        this.recalculateTotal();
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderStatusChanged(event: OrderStatusChanged): void {
        const data = event.data;
        this.status = data.newStatus as OrderStatus;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOrderAddressUpdated(event: OrderAddressUpdated): void {
        const data = event.data;
        if (data.addressType === 'shipping') {
            this.shippingAddress = new OrderAddress(data.newAddress);
        } else {
            this.billingAddress = new OrderAddress(data.newAddress);
        }
        this.updatedAt = event.metadata.timestamp;
    }

    private recalculateTotal(): void {
        this.totalAmount = Array.from(this.items.values()).reduce(
            (sum, item) => sum + item.getTotalPrice(),
            0
        );
    }

    // Command methods
    confirm(confirmedBy: string): void {
        if (this.status !== 'pending') {
            throw new Error('Order can only be confirmed when in pending status');
        }

        this.applyEvent(
            new OrderConfirmed(this.id, {
                confirmedAt: new Date(),
                confirmedBy,
            })
        );
    }

    requestPayment(paymentId: string, amount: number, currency: string): void {
        if (this.status !== 'confirmed') {
            throw new Error('Order can only request payment when confirmed');
        }

        this.applyEvent(
            new OrderPaymentRequested(this.id, {
                paymentId,
                amount,
                currency,
                paymentMethod: this.paymentMethod,
            })
        );
    }

    markAsPaid(paymentId: string, transactionId: string, amount: number, currency: string): void {
        if (this.status !== 'payment_pending') {
            throw new Error('Order can only be marked as paid when payment is pending');
        }

        this.applyEvent(
            new OrderPaid(this.id, {
                paymentId,
                paidAt: new Date(),
                transactionId,
                amount,
                currency,
            })
        );
    }

    markPaymentFailed(paymentId: string, reason: string, errorCode?: string): void {
        if (this.status !== 'payment_pending') {
            throw new Error('Order can only mark payment failed when payment is pending');
        }

        this.applyEvent(
            new OrderPaymentFailed(this.id, {
                paymentId,
                failedAt: new Date(),
                reason,
                errorCode,
            })
        );
    }

    ship(trackingNumber: string, carrier: string, estimatedDelivery: Date): void {
        if (this.status !== 'paid') {
            throw new Error('Order can only be shipped when paid');
        }

        this.applyEvent(
            new OrderShipped(this.id, {
                trackingNumber,
                carrier,
                shippedAt: new Date(),
                estimatedDelivery,
            })
        );
    }

    deliver(deliveredTo: string, signature?: string): void {
        if (this.status !== 'shipped') {
            throw new Error('Order can only be delivered when shipped');
        }

        this.applyEvent(
            new OrderDelivered(this.id, {
                deliveredAt: new Date(),
                deliveredTo,
                signature,
            })
        );
    }

    cancel(cancelledBy: string, reason: string, refundAmount?: number): void {
        if (['cancelled', 'delivered', 'refunded'].includes(this.status)) {
            throw new Error('Order cannot be cancelled in current status');
        }

        this.applyEvent(
            new OrderCancelled(this.id, {
                cancelledAt: new Date(),
                cancelledBy,
                reason,
                refundAmount,
            })
        );
    }

    refund(refundId: string, refundAmount: number, currency: string, reason: string, refundMethod: string): void {
        if (this.status !== 'paid' && this.status !== 'shipped' && this.status !== 'delivered') {
            throw new Error('Order can only be refunded when paid, shipped, or delivered');
        }

        this.applyEvent(
            new OrderRefunded(this.id, {
                refundId,
                refundedAt: new Date(),
                refundAmount,
                currency,
                reason,
                refundMethod,
            })
        );
    }

    updateItemQuantity(itemId: string, newQuantity: number): void {
        if (['cancelled', 'delivered', 'refunded'].includes(this.status)) {
            throw new Error('Cannot update items in current order status');
        }

        const item = this.items.get(itemId);
        if (!item) {
            throw new Error('Order item not found');
        }

        this.applyEvent(
            new OrderItemUpdated(this.id, {
                itemId,
                productId: item.getProductId(),
                quantity: newQuantity,
                price: item.getUnitPrice(),
                updatedAt: new Date(),
            })
        );
    }

    removeItem(itemId: string, reason?: string): void {
        if (['cancelled', 'delivered', 'refunded'].includes(this.status)) {
            throw new Error('Cannot remove items in current order status');
        }

        const item = this.items.get(itemId);
        if (!item) {
            throw new Error('Order item not found');
        }

        this.applyEvent(
            new OrderItemRemoved(this.id, {
                itemId,
                productId: item.getProductId(),
                removedAt: new Date(),
                reason,
            })
        );
    }

    updateAddress(addressType: 'shipping' | 'billing', newAddress: OrderAddressData): void {
        if (['cancelled', 'delivered', 'refunded'].includes(this.status)) {
            throw new Error('Cannot update address in current order status');
        }

        const oldAddress = addressType === 'shipping' ? this.shippingAddress : this.billingAddress;

        this.applyEvent(
            new OrderAddressUpdated(this.id, {
                addressType,
                oldAddress: oldAddress.toJSON(),
                newAddress,
                updatedAt: new Date(),
            })
        );
    }

    // Query methods
    getId(): string {
        return this.id;
    }

    getUserId(): string {
        return this.userId;
    }

    getItems(): OrderItem[] {
        return Array.from(this.items.values());
    }

    getItem(itemId: string): OrderItem | undefined {
        return this.items.get(itemId);
    }

    getTotalAmount(): number {
        return this.totalAmount;
    }

    getCurrency(): string {
        return this.currency;
    }

    getStatus(): OrderStatus {
        return this.status;
    }

    getShippingAddress(): OrderAddress {
        return this.shippingAddress;
    }

    getBillingAddress(): OrderAddress {
        return this.billingAddress;
    }

    getPaymentMethod(): string {
        return this.paymentMethod;
    }

    getPaymentId(): string | undefined {
        return this.paymentId;
    }

    getTrackingNumber(): string | undefined {
        return this.trackingNumber;
    }

    getCarrier(): string | undefined {
        return this.carrier;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    getUpdatedAt(): Date {
        return this.updatedAt;
    }

    getConfirmedAt(): Date | undefined {
        return this.confirmedAt;
    }

    getPaidAt(): Date | undefined {
        return this.paidAt;
    }

    getShippedAt(): Date | undefined {
        return this.shippedAt;
    }

    getDeliveredAt(): Date | undefined {
        return this.deliveredAt;
    }

    getCancelledAt(): Date | undefined {
        return this.cancelledAt;
    }

    getRefundedAt(): Date | undefined {
        return this.refundedAt;
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

    toJSON(): OrderState {
        return {
            id: this.id,
            userId: this.userId,
            items: this.getItems().map(item => item.toJSON()),
            totalAmount: this.totalAmount,
            currency: this.currency,
            status: this.status,
            shippingAddress: this.shippingAddress.toJSON(),
            billingAddress: this.billingAddress.toJSON(),
            paymentMethod: this.paymentMethod,
            paymentId: this.paymentId,
            trackingNumber: this.trackingNumber,
            carrier: this.carrier,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            confirmedAt: this.confirmedAt,
            paidAt: this.paidAt,
            shippedAt: this.shippedAt,
            deliveredAt: this.deliveredAt,
            cancelledAt: this.cancelledAt,
            refundedAt: this.refundedAt,
        };
    }
}
