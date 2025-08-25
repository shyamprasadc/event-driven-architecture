import { Inventory } from '../../domain/aggregates/Inventory';
import { EventStore } from '@ecommerce/shared';
import { logger } from '@ecommerce/shared';

export interface InventoryRepository {
    save(inventory: Inventory): Promise<void>;
    findById(id: string): Promise<Inventory | null>;
    findByProductId(productId: string): Promise<Inventory | null>;
    findBySku(sku: string): Promise<Inventory | null>;
    findLowStockItems(): Promise<Inventory[]>;
    findOutOfStockItems(): Promise<Inventory[]>;
    delete(id: string): Promise<void>;
}

export class PostgreSQLEventStoreInventoryRepository implements InventoryRepository {
    constructor(private eventStore: EventStore) { }

    async save(inventory: Inventory): Promise<void> {
        try {
            const events = inventory.getUncommittedEvents();
            if (events.length === 0) {
                return;
            }

            const expectedVersion = inventory.getVersion() - events.length;
            await this.eventStore.saveEvents(inventory.getId(), events, expectedVersion);

            logger.info('Inventory saved to event store', {
                inventoryId: inventory.getId(),
                eventsCount: events.length,
                version: inventory.getVersion()
            });
        } catch (error) {
            logger.error('Failed to save inventory to event store', {
                error,
                inventoryId: inventory.getId()
            });
            throw error;
        }
    }

    async findById(id: string): Promise<Inventory | null> {
        try {
            const events = await this.eventStore.getEvents(id);
            if (events.length === 0) {
                return null;
            }

            const inventory = Inventory.fromEvents(id, events);
            logger.info('Inventory loaded from event store', {
                inventoryId: id,
                eventsCount: events.length
            });

            return inventory;
        } catch (error) {
            logger.error('Failed to load inventory from event store', { error, inventoryId: id });
            throw error;
        }
    }

    async findByProductId(productId: string): Promise<Inventory | null> {
        try {
            // This would require a projection or index to efficiently query by productId
            // For now, we'll return null as this is typically handled by projections
            logger.warn('findByProductId not implemented - use projections instead', { productId });
            return null;
        } catch (error) {
            logger.error('Failed to find inventory by product ID', { error, productId });
            throw error;
        }
    }

    async findBySku(sku: string): Promise<Inventory | null> {
        try {
            // This would require a projection or index to efficiently query by sku
            // For now, we'll return null as this is typically handled by projections
            logger.warn('findBySku not implemented - use projections instead', { sku });
            return null;
        } catch (error) {
            logger.error('Failed to find inventory by SKU', { error, sku });
            throw error;
        }
    }

    async findLowStockItems(): Promise<Inventory[]> {
        try {
            // This would require a projection or index to efficiently query low stock items
            // For now, we'll return an empty array as this is typically handled by projections
            logger.warn('findLowStockItems not implemented - use projections instead');
            return [];
        } catch (error) {
            logger.error('Failed to find low stock items', { error });
            throw error;
        }
    }

    async findOutOfStockItems(): Promise<Inventory[]> {
        try {
            // This would require a projection or index to efficiently query out of stock items
            // For now, we'll return an empty array as this is typically handled by projections
            logger.warn('findOutOfStockItems not implemented - use projections instead');
            return [];
        } catch (error) {
            logger.error('Failed to find out of stock items', { error });
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            // In event sourcing, we typically don't delete aggregates
            // Instead, we might mark them as deleted or archived
            logger.warn('Delete not implemented in event sourcing - consider soft delete', { inventoryId: id });
            throw new Error('Delete not supported in event sourcing');
        } catch (error) {
            logger.error('Failed to delete inventory', { error, inventoryId: id });
            throw error;
        }
    }
}
