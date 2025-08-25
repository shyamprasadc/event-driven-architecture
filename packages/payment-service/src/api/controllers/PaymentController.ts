import { Request, Response } from 'express';
import { PaymentCommandHandlers } from '../../commands/handlers/PaymentCommandHandlers';
import { AuthRequest } from '@ecommerce/shared';
import { asyncHandler } from '@ecommerce/shared';
import { logger } from '@ecommerce/shared';

export class PaymentController {
    constructor(
        private commandHandlers: PaymentCommandHandlers
    ) { }

    // Process payment
    processPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const paymentId = await this.commandHandlers.processPayment({
            userId,
            ...req.body
        });

        res.status(201).json({
            success: true,
            data: { paymentId },
            message: 'Payment created successfully'
        });
    });

    // Process payment with Stripe
    processPaymentWithStripe = asyncHandler(async (req: Request, res: Response) => {
        const { paymentId } = req.params;
        const { stripePaymentMethodId } = req.body;

        await this.commandHandlers.processPaymentWithStripe({
            paymentId,
            stripePaymentMethodId
        });

        res.status(200).json({
            success: true,
            message: 'Payment processed with Stripe successfully'
        });
    });

    // Get payment status
    getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
        const { paymentId } = req.params;
        const status = await this.commandHandlers.getPaymentStatus({ paymentId });

        res.status(200).json({
            success: true,
            data: status
        });
    });

    // Refund payment
    refundPayment = asyncHandler(async (req: Request, res: Response) => {
        const { paymentId } = req.params;
        const { refundAmount, refundReason, refundMethod } = req.body;

        await this.commandHandlers.refundPayment({
            paymentId,
            refundAmount,
            refundReason,
            refundMethod
        });

        res.status(200).json({
            success: true,
            message: 'Payment refunded successfully'
        });
    });

    // Cancel payment
    cancelPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
        const { paymentId } = req.params;
        const { reason } = req.body;
        const cancelledBy = req.user!.id;

        await this.commandHandlers.cancelPayment({
            paymentId,
            cancelledBy,
            reason
        });

        res.status(200).json({
            success: true,
            message: 'Payment cancelled successfully'
        });
    });

    // Create Stripe payment method
    createStripePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
        const { number, expMonth, expYear, cvc } = req.body;

        const paymentMethodId = await this.commandHandlers.createStripePaymentMethod({
            number,
            expMonth,
            expYear,
            cvc
        });

        res.status(201).json({
            success: true,
            data: { paymentMethodId },
            message: 'Stripe payment method created successfully'
        });
    });

    // Webhook for Stripe events
    handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!sig || !endpointSecret) {
            return res.status(400).json({
                success: false,
                message: 'Missing stripe signature or webhook secret'
            });
        }

        try {
            // Verify webhook signature
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

            // Handle different event types
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentIntentSucceeded(event.data.object);
                    break;
                case 'payment_intent.payment_failed':
                    await this.handlePaymentIntentFailed(event.data.object);
                    break;
                case 'charge.refunded':
                    await this.handleChargeRefunded(event.data.object);
                    break;
                default:
                    logger.info('Unhandled Stripe event type', { type: event.type });
            }

            res.status(200).json({ received: true });
        } catch (error) {
            logger.error('Webhook signature verification failed', { error });
            res.status(400).json({
                success: false,
                message: 'Webhook signature verification failed'
            });
        }
    });

    private async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
        try {
            const paymentId = paymentIntent.metadata.paymentId;
            if (!paymentId) {
                logger.warn('Payment intent missing paymentId metadata', { paymentIntentId: paymentIntent.id });
                return;
            }

            // Update payment status
            await this.commandHandlers.processPaymentWithStripe({
                paymentId,
                stripePaymentMethodId: paymentIntent.payment_method
            });

            logger.info('Payment intent succeeded', {
                paymentIntentId: paymentIntent.id,
                paymentId
            });
        } catch (error) {
            logger.error('Failed to handle payment intent succeeded', { error, paymentIntent });
        }
    }

    private async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
        try {
            const paymentId = paymentIntent.metadata.paymentId;
            if (!paymentId) {
                logger.warn('Payment intent missing paymentId metadata', { paymentIntentId: paymentIntent.id });
                return;
            }

            // Mark payment as failed
            const payment = await this.commandHandlers.getPaymentStatus({ paymentId });
            if (payment && payment.status === 'pending') {
                await this.commandHandlers.processPaymentWithStripe({
                    paymentId,
                    stripePaymentMethodId: paymentIntent.payment_method
                });
            }

            logger.info('Payment intent failed', {
                paymentIntentId: paymentIntent.id,
                paymentId,
                failureReason: paymentIntent.last_payment_error?.message
            });
        } catch (error) {
            logger.error('Failed to handle payment intent failed', { error, paymentIntent });
        }
    }

    private async handleChargeRefunded(charge: any): Promise<void> {
        try {
            const paymentId = charge.metadata.paymentId;
            if (!paymentId) {
                logger.warn('Charge missing paymentId metadata', { chargeId: charge.id });
                return;
            }

            logger.info('Charge refunded', {
                chargeId: charge.id,
                paymentId,
                refundAmount: charge.amount_refunded
            });
        } catch (error) {
            logger.error('Failed to handle charge refunded', { error, charge });
        }
    }
}
