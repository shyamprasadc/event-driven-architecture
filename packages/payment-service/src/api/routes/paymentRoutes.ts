import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { protect, authorize } from '@ecommerce/shared';

export function createPaymentRoutes(paymentController: PaymentController): Router {
    const router = Router();

    // Apply authentication middleware to all routes
    router.use(protect);

    // Payment processing routes
    router.post('/', paymentController.processPayment);
    router.post('/:paymentId/stripe', paymentController.processPaymentWithStripe);
    router.get('/:paymentId/status', paymentController.getPaymentStatus);

    // Payment management routes
    router.post('/:paymentId/refund', authorize('admin'), paymentController.refundPayment);
    router.post('/:paymentId/cancel', paymentController.cancelPayment);

    // Stripe integration routes
    router.post('/stripe/payment-method', paymentController.createStripePaymentMethod);
    router.post('/stripe/webhook', paymentController.handleStripeWebhook);

    return router;
}
