import { Event } from '../base/Event';

// Order Creation Events
export class OrderCreated extends Event {
    constructor(
        aggregateId: string,
        data: {
            userId: string;
            items: Array<{
                productId: string;
                quantity: number;
                price: number;
                sku: string;
            }>;
            totalAmount: number;
            currency: string;
            shippingAddress: {
                street: string;
                city: string;
                state: string;
                zipCode: string;
                country: string;
            };
            billingAddress: {
                street: string;
                city: string;
                state: string;
                zipCode: string;
                country: string;
            };
            paymentMethod: string;
        }
    ) {
        super('OrderCreated', aggregateId, data);
    }
}

export class OrderConfirmed extends Event {
    constructor(
        aggregateId: string,
        data: {
            confirmedAt: Date;
            confirmedBy: string;
        }
    ) {
        super('OrderConfirmed', aggregateId, data);
    }
}

export class OrderPaymentRequested extends Event {
    constructor(
        aggregateId: string,
        data: {
            paymentId: string;
            amount: number;
            currency: string;
            paymentMethod: string;
        }
    ) {
        super('OrderPaymentRequested', aggregateId, data);
    }
}

export class OrderPaid extends Event {
    constructor(
        aggregateId: string,
        data: {
            paymentId: string;
            paidAt: Date;
            transactionId: string;
            amount: number;
            currency: string;
        }
    ) {
        super('OrderPaid', aggregateId, data);
    }
}

export class OrderPaymentFailed extends Event {
    constructor(
        aggregateId: string,
        data: {
            paymentId: string;
            failedAt: Date;
            reason: string;
            errorCode?: string;
        }
    ) {
        super('OrderPaymentFailed', aggregateId, data);
    }
}

export class OrderShipped extends Event {
    constructor(
        aggregateId: string,
        data: {
            trackingNumber: string;
            carrier: string;
            shippedAt: Date;
            estimatedDelivery: Date;
        }
    ) {
        super('OrderShipped', aggregateId, data);
    }
}

export class OrderDelivered extends Event {
    constructor(
        aggregateId: string,
        data: {
            deliveredAt: Date;
            deliveredTo: string;
            signature?: string;
        }
    ) {
        super('OrderDelivered', aggregateId, data);
    }
}

export class OrderCancelled extends Event {
    constructor(
        aggregateId: string,
        data: {
            cancelledAt: Date;
            cancelledBy: string;
            reason: string;
            refundAmount?: number;
        }
    ) {
        super('OrderCancelled', aggregateId, data);
    }
}

export class OrderRefunded extends Event {
    constructor(
        aggregateId: string,
        data: {
            refundId: string;
            refundedAt: Date;
            refundAmount: number;
            currency: string;
            reason: string;
            refundMethod: string;
        }
    ) {
        super('OrderRefunded', aggregateId, data);
    }
}

export class OrderItemUpdated extends Event {
    constructor(
        aggregateId: string,
        data: {
            itemId: string;
            productId: string;
            quantity: number;
            price: number;
            updatedAt: Date;
        }
    ) {
        super('OrderItemUpdated', aggregateId, data);
    }
}

export class OrderItemRemoved extends Event {
    constructor(
        aggregateId: string,
        data: {
            itemId: string;
            productId: string;
            removedAt: Date;
            reason?: string;
        }
    ) {
        super('OrderItemRemoved', aggregateId, data);
    }
}

export class OrderStatusChanged extends Event {
    constructor(
        aggregateId: string,
        data: {
            oldStatus: string;
            newStatus: string;
            changedAt: Date;
            changedBy: string;
            reason?: string;
        }
    ) {
        super('OrderStatusChanged', aggregateId, data);
    }
}

export class OrderAddressUpdated extends Event {
    constructor(
        aggregateId: string,
        data: {
            addressType: 'shipping' | 'billing';
            oldAddress: any;
            newAddress: any;
            updatedAt: Date;
        }
    ) {
        super('OrderAddressUpdated', aggregateId, data);
    }
}
