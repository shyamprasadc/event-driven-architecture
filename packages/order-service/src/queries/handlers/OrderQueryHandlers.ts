import { OrderRepository } from '../../infrastructure/repositories/OrderRepository';
import { OrderProjection } from '../../infrastructure/projections/OrderProjection';
import { logger } from '@ecommerce/shared';

export interface GetOrderByIdQuery {
    orderId: string;
}

export interface GetOrdersByUserIdQuery {
    userId: string;
    page?: number;
    limit?: number;
    status?: string;
}

export interface GetOrdersByStatusQuery {
    status: string;
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
}

export interface SearchOrdersQuery {
    searchTerm: string;
    page?: number;
    limit?: number;
    filters?: {
        status?: string;
        startDate?: Date;
        endDate?: Date;
        minAmount?: number;
        maxAmount?: number;
    };
}

export interface GetOrderStatisticsQuery {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
}

export interface OrderQueryResult {
    id: string;
    userId: string;
    items: Array<{
        id: string;
        productId: string;
        sku: string;
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        currency: string;
    }>;
    totalAmount: number;
    currency: string;
    status: string;
    shippingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        phone?: string;
        email?: string;
    };
    billingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        phone?: string;
        email?: string;
    };
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

export interface OrderListResult {
    orders: OrderQueryResult[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface OrderStatistics {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
    revenueByStatus: Record<string, number>;
    topProducts: Array<{
        productId: string;
        name: string;
        quantity: number;
        revenue: number;
    }>;
}

export class OrderQueryHandlers {
    constructor(
        private orderRepository: OrderRepository,
        private orderProjection: OrderProjection
    ) { }

    async getOrderById(query: GetOrderByIdQuery): Promise<OrderQueryResult | null> {
        try {
            const order = await this.orderRepository.findById(query.orderId);
            if (!order) {
                return null;
            }

            return this.mapOrderToQueryResult(order);
        } catch (error) {
            logger.error('Failed to get order by ID', { error, query });
            throw error;
        }
    }

    async getOrdersByUserId(query: GetOrdersByUserIdQuery): Promise<OrderListResult> {
        try {
            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;

            const filter: any = { userId: query.userId };
            if (query.status) {
                filter.status = query.status;
            }

            const [orders, total] = await Promise.all([
                this.orderProjection.findByUserId(query.userId, { page, limit, status: query.status }),
                this.orderProjection.countByUserId(query.userId, { status: query.status })
            ]);

            return {
                orders: orders.map(order => this.mapOrderToQueryResult(order)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get orders by user ID', { error, query });
            throw error;
        }
    }

    async getOrdersByStatus(query: GetOrdersByStatusQuery): Promise<OrderListResult> {
        try {
            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;

            const filter: any = { status: query.status };
            if (query.startDate) {
                filter.createdAt = { $gte: query.startDate };
            }
            if (query.endDate) {
                filter.createdAt = { ...filter.createdAt, $lte: query.endDate };
            }

            const [orders, total] = await Promise.all([
                this.orderProjection.findByStatus(query.status, { page, limit, startDate: query.startDate, endDate: query.endDate }),
                this.orderProjection.countByStatus(query.status, { startDate: query.startDate, endDate: query.endDate })
            ]);

            return {
                orders: orders.map(order => this.mapOrderToQueryResult(order)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get orders by status', { error, query });
            throw error;
        }
    }

    async searchOrders(query: SearchOrdersQuery): Promise<OrderListResult> {
        try {
            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;

            const [orders, total] = await Promise.all([
                this.orderProjection.search(query.searchTerm, { page, limit, filters: query.filters }),
                this.orderProjection.countSearch(query.searchTerm, { filters: query.filters })
            ]);

            return {
                orders: orders.map(order => this.mapOrderToQueryResult(order)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to search orders', { error, query });
            throw error;
        }
    }

    async getOrderStatistics(query: GetOrderStatisticsQuery): Promise<OrderStatistics> {
        try {
            const filter: any = {};
            if (query.startDate) {
                filter.createdAt = { $gte: query.startDate };
            }
            if (query.endDate) {
                filter.createdAt = { ...filter.createdAt, $lte: query.endDate };
            }
            if (query.userId) {
                filter.userId = query.userId;
            }

            const [
                totalOrders,
                totalRevenue,
                ordersByStatus,
                revenueByStatus,
                topProducts
            ] = await Promise.all([
                this.orderProjection.countTotal(filter),
                this.orderProjection.sumRevenue(filter),
                this.orderProjection.countByStatus(filter),
                this.orderProjection.sumRevenueByStatus(filter),
                this.orderProjection.getTopProducts(filter, 10)
            ]);

            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            return {
                totalOrders,
                totalRevenue,
                averageOrderValue,
                ordersByStatus,
                revenueByStatus,
                topProducts
            };
        } catch (error) {
            logger.error('Failed to get order statistics', { error, query });
            throw error;
        }
    }

    private mapOrderToQueryResult(order: any): OrderQueryResult {
        return {
            id: order.getId(),
            userId: order.getUserId(),
            items: order.getItems().map((item: any) => ({
                id: item.getId(),
                productId: item.getProductId(),
                sku: item.getSku(),
                name: item.getName(),
                quantity: item.getQuantity(),
                unitPrice: item.getUnitPrice(),
                totalPrice: item.getTotalPrice(),
                currency: item.getCurrency(),
            })),
            totalAmount: order.getTotalAmount(),
            currency: order.getCurrency(),
            status: order.getStatus(),
            shippingAddress: order.getShippingAddress().toJSON(),
            billingAddress: order.getBillingAddress().toJSON(),
            paymentMethod: order.getPaymentMethod(),
            paymentId: order.getPaymentId(),
            trackingNumber: order.getTrackingNumber(),
            carrier: order.getCarrier(),
            createdAt: order.getCreatedAt(),
            updatedAt: order.getUpdatedAt(),
            confirmedAt: order.getConfirmedAt(),
            paidAt: order.getPaidAt(),
            shippedAt: order.getShippedAt(),
            deliveredAt: order.getDeliveredAt(),
            cancelledAt: order.getCancelledAt(),
            refundedAt: order.getRefundedAt(),
        };
    }
}
