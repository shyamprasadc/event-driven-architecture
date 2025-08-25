import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { EventBus } from '@ecommerce/shared';
import { Payment } from '../../domain/aggregates/Payment';
import { PaymentRepository } from '../../infrastructure/repositories/PaymentRepository';
import { logger } from '@ecommerce/shared';

export interface ProcessPaymentCommand {
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentDetails: {
        cardNumber?: string;
        cardType?: string;
        billingAddress: any;
        stripeToken?: string;
        stripePaymentMethodId?: string;
    };
}

export interface ProcessPaymentWithStripeCommand {
    paymentId: string;
    stripePaymentMethodId: string;
}

export interface RefundPaymentCommand {
    paymentId: string;
    refundAmount: number;
    refundReason: string;
    refundMethod: string;
}

export interface CancelPaymentCommand {
    paymentId: string;
    cancelledBy: string;
    reason: string;
}

export interface GetPaymentStatusCommand {
    paymentId: string;
}

export class PaymentCommandHandlers {
    private stripe: Stripe;

    constructor(
        private paymentRepository: PaymentRepository,
        private eventBus: EventBus
    ) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2023-10-16',
        });
    }

    async processPayment(command: ProcessPaymentCommand): Promise<string> {
        try {
            const paymentId = uuidv4();

            const payment = Payment.create(
                paymentId,
                command.orderId,
                command.userId,
                command.amount,
                command.currency,
                command.paymentMethod,
                command.paymentDetails
            );

            await this.paymentRepository.save(payment);
            await this.publishEvents(payment.getUncommittedEvents());
            payment.markEventsAsCommitted();

            logger.info('Payment created successfully', {
                paymentId,
                orderId: command.orderId,
                amount: command.amount
            });

            return paymentId;
        } catch (error) {
            logger.error('Failed to create payment', { error, command });
            throw error;
        }
    }

    async processPaymentWithStripe(command: ProcessPaymentWithStripeCommand): Promise<void> {
        try {
            const payment = await this.paymentRepository.findById(command.paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }

            if (payment.getStatus() !== 'pending') {
                throw new Error('Payment is not in pending status');
            }

            // Process payment with Stripe
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(payment.getAmount() * 100), // Convert to cents
                currency: payment.getCurrency().toLowerCase(),
                payment_method: command.stripePaymentMethodId,
                confirm: true,
                return_url: process.env.STRIPE_RETURN_URL,
                metadata: {
                    orderId: payment.getOrderId(),
                    userId: payment.getUserId(),
                    paymentId: payment.getId()
                }
            });

            if (paymentIntent.status === 'succeeded') {
                payment.processPayment(
                    paymentIntent.id,
                    {
                        stripePaymentIntentId: paymentIntent.id,
                        status: paymentIntent.status,
                        amount: paymentIntent.amount,
                        currency: paymentIntent.currency
                    }
                );
            } else if (paymentIntent.status === 'requires_action') {
                // Handle 3D Secure or other authentication
                payment.markAsFailed(
                    'Payment requires additional authentication',
                    'requires_action',
                    {
                        stripePaymentIntentId: paymentIntent.id,
                        status: paymentIntent.status,
                        nextAction: paymentIntent.next_action
                    }
                );
            } else {
                payment.markAsFailed(
                    'Payment failed',
                    'payment_failed',
                    {
                        stripePaymentIntentId: paymentIntent.id,
                        status: paymentIntent.status
                    }
                );
            }

            await this.paymentRepository.save(payment);
            await this.publishEvents(payment.getUncommittedEvents());
            payment.markEventsAsCommitted();

            logger.info('Payment processed with Stripe', {
                paymentId: command.paymentId,
                stripePaymentIntentId: paymentIntent.id,
                status: paymentIntent.status
            });
        } catch (error) {
            logger.error('Failed to process payment with Stripe', { error, command });

            // Mark payment as failed if Stripe processing fails
            try {
                const payment = await this.paymentRepository.findById(command.paymentId);
                if (payment && payment.getStatus() === 'pending') {
                    payment.markAsFailed(
                        error instanceof Error ? error.message : 'Payment processing failed',
                        'stripe_error',
                        { error: error instanceof Error ? error.message : 'Unknown error' }
                    );
                    await this.paymentRepository.save(payment);
                    await this.publishEvents(payment.getUncommittedEvents());
                    payment.markEventsAsCommitted();
                }
            } catch (saveError) {
                logger.error('Failed to mark payment as failed', { saveError, paymentId: command.paymentId });
            }

            throw error;
        }
    }

    async refundPayment(command: RefundPaymentCommand): Promise<void> {
        try {
            const payment = await this.paymentRepository.findById(command.paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }

            if (payment.getStatus() !== 'completed') {
                throw new Error('Payment must be completed to be refunded');
            }

            if (command.refundAmount > payment.getAmount()) {
                throw new Error('Refund amount cannot exceed payment amount');
            }

            const refundId = uuidv4();

            // Process refund with Stripe if payment was processed with Stripe
            if (payment.getTransactionId() && payment.getTransactionId()!.startsWith('pi_')) {
                const refund = await this.stripe.refunds.create({
                    payment_intent: payment.getTransactionId()!,
                    amount: Math.round(command.refundAmount * 100), // Convert to cents
                    reason: command.refundReason === 'requested_by_customer' ? 'requested_by_customer' : 'duplicate',
                    metadata: {
                        refundId,
                        orderId: payment.getOrderId(),
                        paymentId: payment.getId()
                    }
                });

                payment.refund(
                    refundId,
                    command.refundAmount,
                    command.refundReason,
                    command.refundMethod,
                    {
                        stripeRefundId: refund.id,
                        status: refund.status,
                        amount: refund.amount
                    }
                );
            } else {
                // Manual refund for non-Stripe payments
                payment.refund(
                    refundId,
                    command.refundAmount,
                    command.refundReason,
                    command.refundMethod
                );
            }

            await this.paymentRepository.save(payment);
            await this.publishEvents(payment.getUncommittedEvents());
            payment.markEventsAsCommitted();

            logger.info('Payment refunded successfully', {
                paymentId: command.paymentId,
                refundId,
                refundAmount: command.refundAmount
            });
        } catch (error) {
            logger.error('Failed to refund payment', { error, command });
            throw error;
        }
    }

    async cancelPayment(command: CancelPaymentCommand): Promise<void> {
        try {
            const payment = await this.paymentRepository.findById(command.paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }

            if (payment.getStatus() !== 'pending') {
                throw new Error('Payment can only be cancelled when pending');
            }

            payment.cancel(command.cancelledBy, command.reason);

            await this.paymentRepository.save(payment);
            await this.publishEvents(payment.getUncommittedEvents());
            payment.markEventsAsCommitted();

            logger.info('Payment cancelled successfully', {
                paymentId: command.paymentId,
                cancelledBy: command.cancelledBy
            });
        } catch (error) {
            logger.error('Failed to cancel payment', { error, command });
            throw error;
        }
    }

    async getPaymentStatus(command: GetPaymentStatusCommand): Promise<any> {
        try {
            const payment = await this.paymentRepository.findById(command.paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }

            return {
                paymentId: payment.getId(),
                orderId: payment.getOrderId(),
                status: payment.getStatus(),
                amount: payment.getAmount(),
                currency: payment.getCurrency(),
                transactionId: payment.getTransactionId(),
                createdAt: payment.getCreatedAt(),
                updatedAt: payment.getUpdatedAt()
            };
        } catch (error) {
            logger.error('Failed to get payment status', { error, command });
            throw error;
        }
    }

    async createStripePaymentMethod(cardDetails: {
        number: string;
        expMonth: number;
        expYear: number;
        cvc: string;
    }): Promise<string> {
        try {
            const paymentMethod = await this.stripe.paymentMethods.create({
                type: 'card',
                card: {
                    number: cardDetails.number,
                    exp_month: cardDetails.expMonth,
                    exp_year: cardDetails.expYear,
                    cvc: cardDetails.cvc,
                },
            });

            logger.info('Stripe payment method created', { paymentMethodId: paymentMethod.id });
            return paymentMethod.id;
        } catch (error) {
            logger.error('Failed to create Stripe payment method', { error });
            throw error;
        }
    }

    private async publishEvents(events: any[]): Promise<void> {
        for (const event of events) {
            await this.eventBus.publish(event);
        }
    }
}
