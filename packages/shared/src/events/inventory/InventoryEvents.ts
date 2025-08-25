import { Event } from '../base/Event';

// Inventory Events
export class InventoryItemCreated extends Event {
    constructor(
        aggregateId: string,
        data: {
            productId: string;
            sku: string;
            initialStock: number;
            lowStockThreshold: number;
            reservedStock: number;
        }
    ) {
        super('InventoryItemCreated', aggregateId, data);
    }
}

export class StockUpdated extends Event {
    constructor(
        aggregateId: string,
        data: {
            productId: string;
            oldStock: number;
            newStock: number;
            changeReason: string;
            changeType: 'increment' | 'decrement' | 'set';
        }
    ) {
        super('StockUpdated', aggregateId, data);
    }
}

export class StockReserved extends Event {
    constructor(
        aggregateId: string,
        data: {
            productId: string;
            orderId: string;
            quantity: number;
            reservedAt: Date;
            expiresAt: Date;
        }
    ) {
        super('StockReserved', aggregateId, data);
    }
}

export class StockReleased extends Event {
    constructor(
        aggregateId: string,
        data: {
            productId: string;
            orderId: string;
            quantity: number;
            releasedAt: Date;
            reason: string;
        }
    ) {
        super('StockReleased', aggregateId, data);
    }
}

export class StockAllocated extends Event {
    constructor(
        aggregateId: string,
        data: {
            productId: string;
            orderId: string;
            quantity: number;
            allocatedAt: Date;
        }
    ) {
        super('StockAllocated', aggregateId, data);
    }
}

export class LowStockAlert extends Event {
    constructor(
        aggregateId: string,
        data: {
            productId: string;
            currentStock: number;
            threshold: number;
            alertedAt: Date;
        }
    ) {
        super('LowStockAlert', aggregateId, data);
    }
}

export class OutOfStockAlert extends Event {
    constructor(
        aggregateId: string,
        data: {
            productId: string;
            alertedAt: Date;
        }
    ) {
        super('OutOfStockAlert', aggregateId, data);
    }
}

export class InventoryThresholdUpdated extends Event {
    constructor(
        aggregateId: string,
        data: {
            productId: string;
            oldThreshold: number;
            newThreshold: number;
            updatedAt: Date;
        }
    ) {
        super('InventoryThresholdUpdated', aggregateId, data);
    }
}
