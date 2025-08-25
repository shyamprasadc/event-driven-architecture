import { Request, Response } from 'express';
import { OrderCommandHandlers } from '../../commands/handlers/OrderCommandHandlers';
import { OrderQueryHandlers } from '../../queries/handlers/OrderQueryHandlers';
import { AuthRequest } from '@ecommerce/shared';
import { asyncHandler } from '@ecommerce/shared';
import { logger } from '@ecommerce/shared';

export class OrderController {
    constructor(
        private commandHandlers: OrderCommandHandlers,
        private queryHandlers: OrderQueryHandlers
    ) { }

    // Create a new order
    createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const orderId = await this.commandHandlers.createOrder({
            userId,
            ...req.body
        });

        res.status(201).json({
            success: true,
            data: { orderId },
            message: 'Order created successfully'
        });
    });

    // Get order by ID
    getOrderById = asyncHandler(async (req: Request, res: Response) => {
        const { orderId } = req.params;
        const order = await this.queryHandlers.getOrderById({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    });

    // Get orders by user ID
    getOrdersByUserId = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const { page, limit, status } = req.query;

        const result = await this.queryHandlers.getOrdersByUserId({
            userId,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            status: status as string
        });

        res.status(200).json({
            success: true,
            data: result
        });
    });

    // Get orders by status (admin only)
    getOrdersByStatus = asyncHandler(async (req: Request, res: Response) => {
        const { status } = req.params;
        const { page, limit, startDate, endDate } = req.query;

        const result = await this.queryHandlers.getOrdersByStatus({
            status,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined
        });

        res.status(200).json({
            success: true,
            data: result
        });
    });

    // Search orders
    searchOrders = asyncHandler(async (req: Request, res: Response) => {
        const { searchTerm } = req.params;
        const { page, limit, ...filters } = req.query;

        const result = await this.queryHandlers.searchOrders({
            searchTerm,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            filters: filters as any
        });

        res.status(200).json({
            success: true,
            data: result
        });
    });

    // Get order statistics
    getOrderStatistics = asyncHandler(async (req: Request, res: Response) => {
        const { startDate, endDate, userId } = req.query;

        const statistics = await this.queryHandlers.getOrderStatistics({
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            userId: userId as string
        });

        res.status(200).json({
            success: true,
            data: statistics
        });
    });

    // Confirm order (admin only)
    confirmOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
        const { orderId } = req.params;
        const confirmedBy = req.user!.id;

        await this.commandHandlers.confirmOrder({
            orderId,
            confirmedBy
        });

        res.status(200).json({
            success: true,
            message: 'Order confirmed successfully'
        });
    });

    // Request payment
    requestPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
        const { orderId } = req.params;
        const { paymentId, amount, currency } = req.body;

        await this.commandHandlers.requestPayment({
            orderId,
            paymentId,
            amount,
            currency
        });

        res.status(200).json({
            success: true,
            message: 'Payment requested successfully'
        });
    });

    // Mark order as paid
    markOrderPaid = asyncHandler(async (req: Request, res: Response) => {
        const { orderId } = req.params;
        const { paymentId, transactionId, amount, currency } = req.body;

        await this.commandHandlers.markOrderPaid({
            orderId,
            paymentId,
            transactionId,
            amount,
            currency
        });

        res.status(200).json({
            success: true,
            message: 'Order marked as paid successfully'
        });
    });

    // Mark payment as failed
    markPaymentFailed = asyncHandler(async (req: Request, res: Response) => {
        const { orderId } = req.params;
        const { paymentId, reason, errorCode } = req.body;

        await this.commandHandlers.markPaymentFailed({
            orderId,
            paymentId,
            reason,
            errorCode
        });

        res.status(200).json({
            success: true,
            message: 'Payment marked as failed'
        });
    });

    // Ship order
    shipOrder = asyncHandler(async (req: Request, res: Response) => {
        const { orderId } = req.params;
        const { trackingNumber, carrier, estimatedDelivery } = req.body;

        await this.commandHandlers.shipOrder({
            orderId,
            trackingNumber,
            carrier,
            estimatedDelivery: new Date(estimatedDelivery)
        });

        res.status(200).json({
            success: true,
            message: 'Order shipped successfully'
        });
    });

    // Deliver order
    deliverOrder = asyncHandler(async (req: Request, res: Response) => {
        const { orderId } = req.params;
        const { deliveredTo, signature } = req.body;

        await this.commandHandlers.deliverOrder({
            orderId,
            deliveredTo,
            signature
        });

        res.status(200).json({
            success: true,
            message: 'Order delivered successfully'
        });
    });

    // Cancel order
    cancelOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
        const { orderId } = req.params;
        const { reason, refundAmount } = req.body;
        const cancelledBy = req.user!.id;

        await this.commandHandlers.cancelOrder({
            orderId,
            cancelledBy,
            reason,
            refundAmount
        });

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully'
        });
    });

    // Refund order
    refundOrder = asyncHandler(async (req: Request, res: Response) => {
        const { orderId } = req.params;
        const { refundId, refundAmount, currency, reason, refundMethod } = req.body;

        await this.commandHandlers.refundOrder({
            orderId,
            refundId,
            refundAmount,
            currency,
            reason,
            refundMethod
        });

        res.status(200).json({
            success: true,
            message: 'Order refunded successfully'
        });
    });

    // Update order item quantity
    updateOrderItem = asyncHandler(async (req: AuthRequest, res: Response) => {
        const { orderId, itemId } = req.params;
        const { newQuantity } = req.body;

        await this.commandHandlers.updateOrderItem({
            orderId,
            itemId,
            newQuantity
        });

        res.status(200).json({
            success: true,
            message: 'Order item updated successfully'
        });
    });

    // Remove order item
    removeOrderItem = asyncHandler(async (req: AuthRequest, res: Response) => {
        const { orderId, itemId } = req.params;
        const { reason } = req.body;

        await this.commandHandlers.removeOrderItem({
            orderId,
            itemId,
            reason
        });

        res.status(200).json({
            success: true,
            message: 'Order item removed successfully'
        });
    });

    // Update order address
    updateOrderAddress = asyncHandler(async (req: AuthRequest, res: Response) => {
        const { orderId } = req.params;
        const { addressType, newAddress } = req.body;

        await this.commandHandlers.updateOrderAddress({
            orderId,
            addressType,
            newAddress
        });

        res.status(200).json({
            success: true,
            message: 'Order address updated successfully'
        });
    });
}
