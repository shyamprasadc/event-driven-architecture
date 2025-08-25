import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { protect, authorize } from '@ecommerce/shared';

export function createOrderRoutes(orderController: OrderController): Router {
    const router = Router();

    // Apply authentication middleware to all routes
    router.use(protect);

    // Order CRUD operations
    router.post('/', orderController.createOrder);
    router.get('/:orderId', orderController.getOrderById);
    router.get('/user/orders', orderController.getOrdersByUserId);

    // Admin routes
    router.get('/status/:status', authorize('admin'), orderController.getOrdersByStatus);
    router.get('/search/:searchTerm', authorize('admin'), orderController.searchOrders);
    router.get('/statistics', authorize('admin'), orderController.getOrderStatistics);

    // Order lifecycle management
    router.post('/:orderId/confirm', authorize('admin'), orderController.confirmOrder);
    router.post('/:orderId/payment/request', orderController.requestPayment);
    router.post('/:orderId/payment/paid', authorize('admin'), orderController.markOrderPaid);
    router.post('/:orderId/payment/failed', authorize('admin'), orderController.markPaymentFailed);
    router.post('/:orderId/ship', authorize('admin'), orderController.shipOrder);
    router.post('/:orderId/deliver', authorize('admin'), orderController.deliverOrder);
    router.post('/:orderId/cancel', orderController.cancelOrder);
    router.post('/:orderId/refund', authorize('admin'), orderController.refundOrder);

    // Order item management
    router.put('/:orderId/items/:itemId', orderController.updateOrderItem);
    router.delete('/:orderId/items/:itemId', orderController.removeOrderItem);

    // Order address management
    router.put('/:orderId/address', orderController.updateOrderAddress);

    return router;
}
