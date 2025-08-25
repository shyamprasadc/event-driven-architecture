import { Event } from '../base/Event';

// Payment Events
export class PaymentRequested extends Event {
    constructor(
        aggregateId: string,
        data: {
            orderId: string;
            userId: string;
            amount: number;
            currency: string;
            paymentMethod: string;
            paymentDetails: {
                cardNumber?: string;
                cardType?: string;
                billingAddress: any;
            };
        }
    ) {
        super('PaymentRequested', aggregateId, data);
    }
}

export class PaymentProcessed extends Event {
    constructor(
        aggregateId: string,
        data: {
            orderId: string;
            transactionId: string;
            amount: number;
            currency: string;
            paymentMethod: string;
            processedAt: Date;
            gatewayResponse: any;
        }
    ) {
        super('PaymentProcessed', aggregateId, data);
    }
}

export class PaymentFailed extends Event {
    constructor(
        aggregateId: string,
        data: {
            orderId: string;
            failureReason: string;
            errorCode: string;
            failedAt: Date;
            gatewayResponse?: any;
        }
    ) {
        super('PaymentFailed', aggregateId, data);
    }
}

export class PaymentRefunded extends Event {
    constructor(
        aggregateId: string,
        data: {
            orderId: string;
            refundId: string;
            refundAmount: number;
            currency: string;
            refundReason: string;
            refundedAt: Date;
            gatewayResponse?: any;
        }
    ) {
        super('PaymentRefunded', aggregateId, data);
    }
}

export class PaymentCancelled extends Event {
    constructor(
        aggregateId: string,
        data: {
            orderId: string;
            cancelledAt: Date;
            cancelledBy: string;
            reason: string;
        }
    ) {
        super('PaymentCancelled', aggregateId, data);
    }
}

export class PaymentDisputed extends Event {
    constructor(
        aggregateId: string,
        data: {
            orderId: string;
            disputeId: string;
            disputeReason: string;
            disputedAmount: number;
            currency: string;
            disputedAt: string;
        },
        metadata?: any
    ) {
        super('PaymentDisputed', aggregateId, data, metadata);
    }
}

export class PaymentDisputeResolved extends Event {
    constructor(
        aggregateId: string,
        data: {
            orderId: string;
            disputeId: string;
            resolution: 'won' | 'lost' | 'partial';
            resolvedAmount?: number;
            currency: string;
            resolvedAt: string;
        },
        metadata?: any
    ) {
        super('PaymentDisputeResolved', aggregateId, data, metadata);
    }
}

export class PaymentMethodAdded extends Event {
    constructor(
        aggregateId: string,
        data: {
            userId: string;
            paymentMethodId: string;
            paymentMethodType: string;
            paymentMethodDetails: {
                cardLast4?: string;
                cardBrand?: string;
                expiryMonth?: number;
                expiryYear?: number;
                bankAccount?: string;
                paypalEmail?: string;
            };
            isDefault: boolean;
        },
        metadata?: any
    ) {
        super('PaymentMethodAdded', aggregateId, data, metadata);
    }
}

export class PaymentMethodUpdated extends Event {
    constructor(
        aggregateId: string,
        data: {
            paymentMethodId: string;
            paymentMethodDetails: {
                cardLast4?: string;
                cardBrand?: string;
                expiryMonth?: number;
                expiryYear?: number;
                bankAccount?: string;
                paypalEmail?: string;
            };
            isDefault?: boolean;
        },
        metadata?: any
    ) {
        super('PaymentMethodUpdated', aggregateId, data, metadata);
    }
}

export class PaymentMethodRemoved extends Event {
    constructor(
        aggregateId: string,
        data: {
            paymentMethodId: string;
            removedAt: string;
            removedBy: string;
        },
        metadata?: any
    ) {
        super('PaymentMethodRemoved', aggregateId, data, metadata);
    }
}

export class PaymentScheduled extends Event {
    constructor(
        aggregateId: string,
        data: {
            orderId: string;
            scheduledDate: string;
            amount: number;
            currency: string;
            paymentMethod: string;
        },
        metadata?: any
    ) {
        super('PaymentScheduled', aggregateId, data, metadata);
    }
}

export class PaymentScheduledProcessed extends Event {
    constructor(
        aggregateId: string,
        data: {
            orderId: string;
            transactionId: string;
            amount: number;
            currency: string;
            processedAt: string;
        },
        metadata?: any
    ) {
        super('PaymentScheduledProcessed', aggregateId, data, metadata);
    }
}
