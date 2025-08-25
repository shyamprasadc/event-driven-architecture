import Joi from 'joi';

export interface OrderItemData {
    id: string;
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency: string;
}

export class OrderItem {
    private readonly id: string;
    private readonly productId: string;
    private readonly sku: string;
    private readonly name: string;
    private readonly quantity: number;
    private readonly unitPrice: number;
    private readonly totalPrice: number;
    private readonly currency: string;

    constructor(data: OrderItemData) {
        const { error } = OrderItem.schema.validate(data);
        if (error) {
            throw new Error(`Invalid order item: ${error.message}`);
        }

        this.id = data.id;
        this.productId = data.productId;
        this.sku = data.sku;
        this.name = data.name;
        this.quantity = data.quantity;
        this.unitPrice = data.unitPrice;
        this.totalPrice = data.totalPrice;
        this.currency = data.currency;
    }

    static get schema(): Joi.ObjectSchema {
        return Joi.object({
            id: Joi.string().uuid().required(),
            productId: Joi.string().uuid().required(),
            sku: Joi.string().min(1).max(100).required(),
            name: Joi.string().min(1).max(255).required(),
            quantity: Joi.number().integer().min(1).required(),
            unitPrice: Joi.number().positive().precision(2).required(),
            totalPrice: Joi.number().positive().precision(2).required(),
            currency: Joi.string().length(3).uppercase().required(),
        });
    }

    getId(): string {
        return this.id;
    }

    getProductId(): string {
        return this.productId;
    }

    getSku(): string {
        return this.sku;
    }

    getName(): string {
        return this.name;
    }

    getQuantity(): number {
        return this.quantity;
    }

    getUnitPrice(): number {
        return this.unitPrice;
    }

    getTotalPrice(): number {
        return this.totalPrice;
    }

    getCurrency(): string {
        return this.currency;
    }

    updateQuantity(newQuantity: number): OrderItem {
        if (newQuantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        const newTotalPrice = this.unitPrice * newQuantity;
        return new OrderItem({
            ...this.toJSON(),
            quantity: newQuantity,
            totalPrice: newTotalPrice,
        });
    }

    updateUnitPrice(newUnitPrice: number): OrderItem {
        if (newUnitPrice <= 0) {
            throw new Error('Unit price must be greater than zero');
        }

        const newTotalPrice = newUnitPrice * this.quantity;
        return new OrderItem({
            ...this.toJSON(),
            unitPrice: newUnitPrice,
            totalPrice: newTotalPrice,
        });
    }

    toJSON(): OrderItemData {
        return {
            id: this.id,
            productId: this.productId,
            sku: this.sku,
            name: this.name,
            quantity: this.quantity,
            unitPrice: this.unitPrice,
            totalPrice: this.totalPrice,
            currency: this.currency,
        };
    }

    static fromJSON(data: OrderItemData): OrderItem {
        return new OrderItem(data);
    }
}
