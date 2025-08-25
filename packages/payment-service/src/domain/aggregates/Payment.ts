import { Event } from '@ecommerce/shared';
import {
    PaymentRequested,
    PaymentProcessed,
    PaymentFailed,
    PaymentRefunded,
    PaymentCancelled,
} from '@ecommerce/shared';

export type PaymentStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'refunded';

export interface PaymentState {
    id: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: PaymentStatus;
    paymentDetails: {
        cardNumber?: string;
        cardType?: string;
        billingAddress: any;
    };
    transactionId?: string;
    gatewayResponse?: any;
    failureReason?: string;
    errorCode?: string;
    refundId?: string;
    refundAmount?: number;
    refundReason?: string;
    refundMethod?: string;
    createdAt: Date;
    updatedAt: Date;
    processedAt?: Date;
    failedAt?: Date;
    refundedAt?: Date;
    cancelledAt?: Date;
}

export class Payment {
    private id: string;
    private orderId: string;
    private userId: string;
    private amount: number;
    private currency: string;
    private paymentMethod: string;
    private status: PaymentStatus;
    private paymentDetails: {
        cardNumber?: string;
        cardType?: string;
        billingAddress: any;
    };
    private transactionId?: string;
    private gatewayResponse?: any;
    private failureReason?: string;
    private errorCode?: string;
    private refundId?: string;
    private refundAmount?: number;
    private refundReason?: string;
    private refundMethod?: string;
    private createdAt: Date;
    private updatedAt: Date;
    private processedAt?: Date;
    private failedAt?: Date;
    private refundedAt?: Date;
    private cancelledAt?: Date;
    private version: number = 0;
    private uncommittedEvents: Event[] = [];

    constructor(id: string) {
        this.id = id;
        this.orderId = '';
        this.userId = '';
        this.amount = 0;
        this.currency = 'USD';
        this.paymentMethod = '';
        this.status = 'pending';
        this.paymentDetails = {
            billingAddress: {}
        };
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    static create(
        id: string,
        orderId: string,
        userId: string,
        amount: number,
        currency: string,
        paymentMethod: string,
        paymentDetails: {
            cardNumber?: string;
            cardType?: string;
            billingAddress: any;
        }
    ): Payment {
        const payment = new Payment(id);
        payment.applyEvent(
            new PaymentRequested(id, {
                orderId,
                userId,
                amount,
                currency,
                paymentMethod,
                paymentDetails,
            })
        );
        return payment;
    }

    static fromEvents(id: string, events: Event[]): Payment {
        const payment = new Payment(id);
        events.forEach(event => payment.applyEvent(event));
        return payment;
    }

    private applyEvent(event: Event): void {
        this.apply(event);
        this.version++;
        this.uncommittedEvents.push(event);
    }

    private apply(event: Event): void {
        switch (event.eventType) {
            case 'PaymentRequested':
                this.applyPaymentRequested(event);
                break;
            case 'PaymentProcessed':
                this.applyPaymentProcessed(event);
                break;
            case 'PaymentFailed':
                this.applyPaymentFailed(event);
                break;
            case 'PaymentRefunded':
                this.applyPaymentRefunded(event);
                break;
            case 'PaymentCancelled':
                this.applyPaymentCancelled(event);
                break;
        }
    }

    private applyPaymentRequested(event: PaymentRequested): void {
        const data = event.data;
        this.orderId = data.orderId;
        this.userId = data.userId;
        this.amount = data.amount;
        this.currency = data.currency;
        this.paymentMethod = data.paymentMethod;
        this.paymentDetails = data.paymentDetails;
        this.status = 'pending';
        this.createdAt = event.metadata.timestamp;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyPaymentProcessed(event: PaymentProcessed): void {
        const data = event.data;
        this.status = 'completed';
        this.transactionId = data.transactionId;
        this.gatewayResponse = data.gatewayResponse;
        this.processedAt = data.processedAt;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyPaymentFailed(event: PaymentFailed): void {
        const data = event.data;
        this.status = 'failed';
        this.failureReason = data.failureReason;
        this.errorCode = data.errorCode;
        this.gatewayResponse = data.gatewayResponse;
        this.failedAt = data.failedAt;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyPaymentRefunded(event: PaymentRefunded): void {
        const data = event.data;
        this.status = 'refunded';
        this.refundId = data.refundId;
        this.refundAmount = data.refundAmount;
        this.refundReason = data.refundReason;
        this.refundMethod = data.refundMethod;
        this.gatewayResponse = data.gatewayResponse;
        this.refundedAt = data.refundedAt;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyPaymentCancelled(event: PaymentCancelled): void {
        const data = event.data;
        this.status = 'cancelled';
        this.cancelledAt = data.cancelledAt;
        this.updatedAt = event.metadata.timestamp;
    }

    // Command methods
    processPayment(transactionId: string, gatewayResponse: any): void {
        if (this.status !== 'pending') {
            throw new Error('Payment can only be processed when in pending status');
        }

        this.applyEvent(
            new PaymentProcessed(this.id, {
                orderId: this.orderId,
                transactionId,
                amount: this.amount,
                currency: this.currency,
                paymentMethod: this.paymentMethod,
                processedAt: new Date(),
                gatewayResponse,
            })
        );
    }

    markAsFailed(failureReason: string, errorCode: string, gatewayResponse?: any): void {
        if (this.status !== 'pending' && this.status !== 'processing') {
            throw new Error('Payment can only be marked as failed when pending or processing');
        }

        this.applyEvent(
            new PaymentFailed(this.id, {
                orderId: this.orderId,
                failureReason,
                errorCode,
                failedAt: new Date(),
                gatewayResponse,
            })
        );
    }

    refund(refundId: string, refundAmount: number, refundReason: string, refundMethod: string, gatewayResponse?: any): void {
        if (this.status !== 'completed') {
            throw new Error('Payment can only be refunded when completed');
        }

        if (refundAmount > this.amount) {
            throw new Error('Refund amount cannot exceed payment amount');
        }

        this.applyEvent(
            new PaymentRefunded(this.id, {
                orderId: this.orderId,
                refundId,
                refundAmount,
                currency: this.currency,
                refundReason,
                refundedAt: new Date(),
                gatewayResponse,
            })
        );
    }

    cancel(cancelledBy: string, reason: string): void {
        if (this.status !== 'pending') {
            throw new Error('Payment can only be cancelled when pending');
        }

        this.applyEvent(
            new PaymentCancelled(this.id, {
                orderId: this.orderId,
                cancelledAt: new Date(),
                cancelledBy,
                reason,
            })
        );
    }

    // Query methods (getters)
    getId(): string {
        return this.id;
    }

    getOrderId(): string {
        return this.orderId;
    }

    getUserId(): string {
        return this.userId;
    }

    getAmount(): number {
        return this.amount;
    }

    getCurrency(): string {
        return this.currency;
    }

    getPaymentMethod(): string {
        return this.paymentMethod;
    }

    getStatus(): PaymentStatus {
        return this.status;
    }

    getPaymentDetails(): any {
        return this.paymentDetails;
    }

    getTransactionId(): string | undefined {
        return this.transactionId;
    }

    getGatewayResponse(): any {
        return this.gatewayResponse;
    }

    getFailureReason(): string | undefined {
        return this.failureReason;
    }

    getErrorCode(): string | undefined {
        return this.errorCode;
    }

    getRefundId(): string | undefined {
        return this.refundId;
    }

    getRefundAmount(): number | undefined {
        return this.refundAmount;
    }

    getRefundReason(): string | undefined {
        return this.refundReason;
    }

    getRefundMethod(): string | undefined {
        return this.refundMethod;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    getUpdatedAt(): Date {
        return this.updatedAt;
    }

    getProcessedAt(): Date | undefined {
        return this.processedAt;
    }

    getFailedAt(): Date | undefined {
        return this.failedAt;
    }

    getRefundedAt(): Date | undefined {
        return this.refundedAt;
    }

    getCancelledAt(): Date | undefined {
        return this.cancelledAt;
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

    toJSON(): PaymentState {
        return {
            id: this.id,
            orderId: this.orderId,
            userId: this.userId,
            amount: this.amount,
            currency: this.currency,
            paymentMethod: this.paymentMethod,
            status: this.status,
            paymentDetails: this.paymentDetails,
            transactionId: this.transactionId,
            gatewayResponse: this.gatewayResponse,
            failureReason: this.failureReason,
            errorCode: this.errorCode,
            refundId: this.refundId,
            refundAmount: this.refundAmount,
            refundReason: this.refundReason,
            refundMethod: this.refundMethod,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            processedAt: this.processedAt,
            failedAt: this.failedAt,
            refundedAt: this.refundedAt,
            cancelledAt: this.cancelledAt,
        };
    }
}
