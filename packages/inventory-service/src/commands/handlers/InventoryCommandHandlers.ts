import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '@ecommerce/shared';
import { Inventory } from '../../domain/aggregates/Inventory';
import { InventoryRepository } from '../../infrastructure/repositories/InventoryRepository';
import { logger } from '@ecommerce/shared';

export interface CreateInventoryItemCommand {
    productId: string;
    sku: string;
    initialStock: number;
    lowStockThreshold?: number;
}

export interface UpdateStockCommand {
    inventoryId: string;
    newStock: number;
    changeReason: string;
    changeType?: 'increment' | 'decrement' | 'set';
}

export interface ReserveStockCommand {
    inventoryId: string;
    orderId: string;
    quantity: number;
    expiresAt: Date;
}

export interface ReleaseStockCommand {
    inventoryId: string;
    orderId: string;
    reason: string;
}

export interface AllocateStockCommand {
    inventoryId: string;
    orderId: string;
    quantity: number;
}

export interface UpdateLowStockThresholdCommand {
    inventoryId: string;
    newThreshold: number;
}

export interface GetInventoryStatusCommand {
    inventoryId: string;
}

export interface GetInventoryByProductCommand {
    productId: string;
}

export class InventoryCommandHandlers {
    constructor(
        private inventoryRepository: InventoryRepository,
        private eventBus: EventBus
    ) { }

    async createInventoryItem(command: CreateInventoryItemCommand): Promise<string> {
        try {
            const inventoryId = uuidv4();
            const inventory = Inventory.create(
                inventoryId,
                command.productId,
                command.sku,
                command.initialStock,
                command.lowStockThreshold || 10
            );

            await this.inventoryRepository.save(inventory);
            await this.publishEvents(inventory.getUncommittedEvents());
            inventory.markEventsAsCommitted();

            logger.info('Inventory item created successfully', {
                inventoryId,
                productId: command.productId,
                sku: command.sku,
                initialStock: command.initialStock
            });

            return inventoryId;
        } catch (error) {
            logger.error('Failed to create inventory item', { error, command });
            throw error;
        }
    }

    async updateStock(command: UpdateStockCommand): Promise<void> {
        try {
            const inventory = await this.inventoryRepository.findById(command.inventoryId);
            if (!inventory) {
                throw new Error('Inventory item not found');
            }

            inventory.updateStock(
                command.newStock,
                command.changeReason,
                command.changeType || 'set'
            );

            await this.inventoryRepository.save(inventory);
            await this.publishEvents(inventory.getUncommittedEvents());
            inventory.markEventsAsCommitted();

            logger.info('Stock updated successfully', {
                inventoryId: command.inventoryId,
                newStock: command.newStock,
                changeReason: command.changeReason
            });
        } catch (error) {
            logger.error('Failed to update stock', { error, command });
            throw error;
        }
    }

    async reserveStock(command: ReserveStockCommand): Promise<void> {
        try {
            const inventory = await this.inventoryRepository.findById(command.inventoryId);
            if (!inventory) {
                throw new Error('Inventory item not found');
            }

            inventory.reserveStock(
                command.orderId,
                command.quantity,
                command.expiresAt
            );

            await this.inventoryRepository.save(inventory);
            await this.publishEvents(inventory.getUncommittedEvents());
            inventory.markEventsAsCommitted();

            logger.info('Stock reserved successfully', {
                inventoryId: command.inventoryId,
                orderId: command.orderId,
                quantity: command.quantity
            });
        } catch (error) {
            logger.error('Failed to reserve stock', { error, command });
            throw error;
        }
    }

    async releaseStock(command: ReleaseStockCommand): Promise<void> {
        try {
            const inventory = await this.inventoryRepository.findById(command.inventoryId);
            if (!inventory) {
                throw new Error('Inventory item not found');
            }

            inventory.releaseStock(command.orderId, command.reason);

            await this.inventoryRepository.save(inventory);
            await this.publishEvents(inventory.getUncommittedEvents());
            inventory.markEventsAsCommitted();

            logger.info('Stock released successfully', {
                inventoryId: command.inventoryId,
                orderId: command.orderId,
                reason: command.reason
            });
        } catch (error) {
            logger.error('Failed to release stock', { error, command });
            throw error;
        }
    }

    async allocateStock(command: AllocateStockCommand): Promise<void> {
        try {
            const inventory = await this.inventoryRepository.findById(command.inventoryId);
            if (!inventory) {
                throw new Error('Inventory item not found');
            }

            inventory.allocateStock(command.orderId, command.quantity);

            await this.inventoryRepository.save(inventory);
            await this.publishEvents(inventory.getUncommittedEvents());
            inventory.markEventsAsCommitted();

            logger.info('Stock allocated successfully', {
                inventoryId: command.inventoryId,
                orderId: command.orderId,
                quantity: command.quantity
            });
        } catch (error) {
            logger.error('Failed to allocate stock', { error, command });
            throw error;
        }
    }

    async updateLowStockThreshold(command: UpdateLowStockThresholdCommand): Promise<void> {
        try {
            const inventory = await this.inventoryRepository.findById(command.inventoryId);
            if (!inventory) {
                throw new Error('Inventory item not found');
            }

            inventory.updateLowStockThreshold(command.newThreshold);

            await this.inventoryRepository.save(inventory);
            await this.publishEvents(inventory.getUncommittedEvents());
            inventory.markEventsAsCommitted();

            logger.info('Low stock threshold updated successfully', {
                inventoryId: command.inventoryId,
                newThreshold: command.newThreshold
            });
        } catch (error) {
            logger.error('Failed to update low stock threshold', { error, command });
            throw error;
        }
    }

    async getInventoryStatus(command: GetInventoryStatusCommand): Promise<any> {
        try {
            const inventory = await this.inventoryRepository.findById(command.inventoryId);
            if (!inventory) {
                throw new Error('Inventory item not found');
            }

            return {
                inventoryId: inventory.getId(),
                productId: inventory.getProductId(),
                sku: inventory.getSku(),
                currentStock: inventory.getCurrentStock(),
                reservedStock: inventory.getReservedStock(),
                availableStock: inventory.getAvailableStock(),
                lowStockThreshold: inventory.getLowStockThreshold(),
                isLowStock: inventory.isLowStock(),
                isOutOfStock: inventory.isOutOfStock(),
                reservations: inventory.getReservations(),
                createdAt: inventory.getCreatedAt(),
                updatedAt: inventory.getUpdatedAt()
            };
        } catch (error) {
            logger.error('Failed to get inventory status', { error, command });
            throw error;
        }
    }

    async getInventoryByProduct(command: GetInventoryByProductCommand): Promise<any> {
        try {
            const inventory = await this.inventoryRepository.findByProductId(command.productId);
            if (!inventory) {
                return null;
            }

            return {
                inventoryId: inventory.getId(),
                productId: inventory.getProductId(),
                sku: inventory.getSku(),
                currentStock: inventory.getCurrentStock(),
                reservedStock: inventory.getReservedStock(),
                availableStock: inventory.getAvailableStock(),
                lowStockThreshold: inventory.getLowStockThreshold(),
                isLowStock: inventory.isLowStock(),
                isOutOfStock: inventory.isOutOfStock(),
                createdAt: inventory.getCreatedAt(),
                updatedAt: inventory.getUpdatedAt()
            };
        } catch (error) {
            logger.error('Failed to get inventory by product', { error, command });
            throw error;
        }
    }

    private async publishEvents(events: any[]): Promise<void> {
        for (const event of events) {
            await this.eventBus.publish(event);
        }
    }
}
