import { Event } from '@ecommerce/shared';
import {
    InventoryItemCreated,
    StockUpdated,
    StockReserved,
    StockReleased,
    StockAllocated,
    LowStockAlert,
    OutOfStockAlert,
    InventoryThresholdUpdated,
} from '@ecommerce/shared';

export interface InventoryState {
    id: string;
    productId: string;
    sku: string;
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface StockReservation {
    id: string;
    orderId: string;
    quantity: number;
    reservedAt: Date;
    expiresAt: Date;
    isAllocated: boolean;
}

export class Inventory {
    private id: string;
    private productId: string;
    private sku: string;
    private currentStock: number;
    private reservedStock: number;
    private lowStockThreshold: number;
    private reservations: Map<string, StockReservation>;
    private createdAt: Date;
    private updatedAt: Date;
    private version: number = 0;
    private uncommittedEvents: Event[] = [];

    constructor(id: string) {
        this.id = id;
        this.productId = '';
        this.sku = '';
        this.currentStock = 0;
        this.reservedStock = 0;
        this.lowStockThreshold = 10;
        this.reservations = new Map();
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    static create(
        id: string,
        productId: string,
        sku: string,
        initialStock: number,
        lowStockThreshold: number = 10
    ): Inventory {
        const inventory = new Inventory(id);
        inventory.applyEvent(
            new InventoryItemCreated(id, {
                productId,
                sku,
                initialStock,
                lowStockThreshold,
                reservedStock: 0,
            })
        );
        return inventory;
    }

    static fromEvents(id: string, events: Event[]): Inventory {
        const inventory = new Inventory(id);
        events.forEach(event => inventory.applyEvent(event));
        return inventory;
    }

    private applyEvent(event: Event): void {
        this.apply(event);
        this.version++;
        this.uncommittedEvents.push(event);
    }

    private apply(event: Event): void {
        switch (event.eventType) {
            case 'InventoryItemCreated':
                this.applyInventoryItemCreated(event);
                break;
            case 'StockUpdated':
                this.applyStockUpdated(event);
                break;
            case 'StockReserved':
                this.applyStockReserved(event);
                break;
            case 'StockReleased':
                this.applyStockReleased(event);
                break;
            case 'StockAllocated':
                this.applyStockAllocated(event);
                break;
            case 'LowStockAlert':
                this.applyLowStockAlert(event);
                break;
            case 'OutOfStockAlert':
                this.applyOutOfStockAlert(event);
                break;
            case 'InventoryThresholdUpdated':
                this.applyInventoryThresholdUpdated(event);
                break;
        }
    }

    private applyInventoryItemCreated(event: InventoryItemCreated): void {
        const data = event.data;
        this.productId = data.productId;
        this.sku = data.sku;
        this.currentStock = data.initialStock;
        this.lowStockThreshold = data.lowStockThreshold;
        this.createdAt = event.metadata.timestamp;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyStockUpdated(event: StockUpdated): void {
        const data = event.data;
        this.currentStock = data.newStock;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyStockReserved(event: StockReserved): void {
        const data = event.data;
        const reservation: StockReservation = {
            id: `${this.id}-${data.orderId}`,
            orderId: data.orderId,
            quantity: data.quantity,
            reservedAt: data.reservedAt,
            expiresAt: data.expiresAt,
            isAllocated: false,
        };
        this.reservations.set(reservation.id, reservation);
        this.reservedStock += data.quantity;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyStockReleased(event: StockReleased): void {
        const data = event.data;
        const reservationId = `${this.id}-${data.orderId}`;
        const reservation = this.reservations.get(reservationId);
        if (reservation) {
            this.reservedStock -= reservation.quantity;
            this.reservations.delete(reservationId);
        }
        this.updatedAt = event.metadata.timestamp;
    }

    private applyStockAllocated(event: StockAllocated): void {
        const data = event.data;
        const reservationId = `${this.id}-${data.orderId}`;
        const reservation = this.reservations.get(reservationId);
        if (reservation) {
            reservation.isAllocated = true;
            this.currentStock -= data.quantity;
            this.reservedStock -= data.quantity;
        }
        this.updatedAt = event.metadata.timestamp;
    }

    private applyLowStockAlert(event: LowStockAlert): void {
        // This event is informational and doesn't change state
        this.updatedAt = event.metadata.timestamp;
    }

    private applyOutOfStockAlert(event: OutOfStockAlert): void {
        // This event is informational and doesn't change state
        this.updatedAt = event.metadata.timestamp;
    }

    private applyInventoryThresholdUpdated(event: InventoryThresholdUpdated): void {
        const data = event.data;
        this.lowStockThreshold = data.newThreshold;
        this.updatedAt = event.metadata.timestamp;
    }

    // Command methods
    updateStock(newStock: number, changeReason: string, changeType: 'increment' | 'decrement' | 'set' = 'set'): void {
        const oldStock = this.currentStock;
        let newStockValue: number;

        switch (changeType) {
            case 'increment':
                newStockValue = this.currentStock + newStock;
                break;
            case 'decrement':
                newStockValue = Math.max(0, this.currentStock - newStock);
                break;
            case 'set':
            default:
                newStockValue = Math.max(0, newStock);
                break;
        }

        this.applyEvent(
            new StockUpdated(this.id, {
                productId: this.productId,
                oldStock,
                newStock: newStockValue,
                changeReason,
                changeType,
            })
        );

        // Check for low stock or out of stock conditions
        this.checkStockAlerts();
    }

    reserveStock(orderId: string, quantity: number, expiresAt: Date): void {
        if (quantity <= 0) {
            throw new Error('Reservation quantity must be greater than zero');
        }

        if (this.getAvailableStock() < quantity) {
            throw new Error('Insufficient available stock for reservation');
        }

        this.applyEvent(
            new StockReserved(this.id, {
                productId: this.productId,
                orderId,
                quantity,
                reservedAt: new Date(),
                expiresAt,
            })
        );
    }

    releaseStock(orderId: string, reason: string): void {
        const reservationId = `${this.id}-${orderId}`;
        const reservation = this.reservations.get(reservationId);

        if (!reservation) {
            throw new Error('Stock reservation not found');
        }

        this.applyEvent(
            new StockReleased(this.id, {
                productId: this.productId,
                orderId,
                quantity: reservation.quantity,
                releasedAt: new Date(),
                reason,
            })
        );
    }

    allocateStock(orderId: string, quantity: number): void {
        const reservationId = `${this.id}-${orderId}`;
        const reservation = this.reservations.get(reservationId);

        if (!reservation) {
            throw new Error('Stock reservation not found');
        }

        if (reservation.quantity < quantity) {
            throw new Error('Allocation quantity cannot exceed reserved quantity');
        }

        this.applyEvent(
            new StockAllocated(this.id, {
                productId: this.productId,
                orderId,
                quantity,
                allocatedAt: new Date(),
            })
        );
    }

    updateLowStockThreshold(newThreshold: number): void {
        if (newThreshold < 0) {
            throw new Error('Low stock threshold cannot be negative');
        }

        const oldThreshold = this.lowStockThreshold;
        this.applyEvent(
            new InventoryThresholdUpdated(this.id, {
                productId: this.productId,
                oldThreshold,
                newThreshold,
                updatedAt: new Date(),
            })
        );
    }

    private checkStockAlerts(): void {
        const availableStock = this.getAvailableStock();

        if (availableStock === 0) {
            this.applyEvent(
                new OutOfStockAlert(this.id, {
                    productId: this.productId,
                    alertedAt: new Date(),
                })
            );
        } else if (availableStock <= this.lowStockThreshold) {
            this.applyEvent(
                new LowStockAlert(this.id, {
                    productId: this.productId,
                    currentStock: availableStock,
                    threshold: this.lowStockThreshold,
                    alertedAt: new Date(),
                })
            );
        }
    }

    // Query methods (getters)
    getId(): string {
        return this.id;
    }

    getProductId(): string {
        return this.productId;
    }

    getSku(): string {
        return this.sku;
    }

    getCurrentStock(): number {
        return this.currentStock;
    }

    getReservedStock(): number {
        return this.reservedStock;
    }

    getAvailableStock(): number {
        return Math.max(0, this.currentStock - this.reservedStock);
    }

    getLowStockThreshold(): number {
        return this.lowStockThreshold;
    }

    isLowStock(): boolean {
        return this.getAvailableStock() <= this.lowStockThreshold && this.getAvailableStock() > 0;
    }

    isOutOfStock(): boolean {
        return this.getAvailableStock() === 0;
    }

    getReservations(): StockReservation[] {
        return Array.from(this.reservations.values());
    }

    getReservation(orderId: string): StockReservation | undefined {
        const reservationId = `${this.id}-${orderId}`;
        return this.reservations.get(reservationId);
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    getUpdatedAt(): Date {
        return this.updatedAt;
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

    toJSON(): InventoryState {
        return {
            id: this.id,
            productId: this.productId,
            sku: this.sku,
            currentStock: this.currentStock,
            reservedStock: this.reservedStock,
            availableStock: this.getAvailableStock(),
            lowStockThreshold: this.lowStockThreshold,
            isLowStock: this.isLowStock(),
            isOutOfStock: this.isOutOfStock(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
