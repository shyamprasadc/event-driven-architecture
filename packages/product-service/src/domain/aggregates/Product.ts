import { Event } from '@ecommerce/shared';
import {
    ProductCreated,
    ProductUpdated,
    ProductPriceChanged,
    ProductDiscontinued,
    ProductReactivated,
    ProductStockUpdated,
    ProductCategoryChanged,
    ProductImageAdded,
    ProductImageRemoved,
    ProductAttributeUpdated,
} from '@ecommerce/shared';
import { ProductPrice, ProductPriceData } from '../valueObjects/ProductPrice';
import { ProductAttributes, ProductAttributesData } from '../valueObjects/ProductAttributes';

export interface ProductState {
    id: string;
    name: string;
    description: string;
    price: ProductPriceData;
    categoryId: string;
    sku: string;
    images: string[];
    attributes: ProductAttributesData;
    isActive: boolean;
    stock: number;
    createdAt: Date;
    updatedAt: Date;
    discontinuedAt?: Date;
}

export class Product {
    private id: string;
    private name: string;
    private description: string;
    private price: ProductPrice;
    private categoryId: string;
    private sku: string;
    private images: string[];
    private attributes: ProductAttributes;
    private isActive: boolean;
    private stock: number;
    private createdAt: Date;
    private updatedAt: Date;
    private discontinuedAt?: Date;
    private version: number = 0;
    private uncommittedEvents: Event[] = [];

    constructor(id: string) {
        this.id = id;
        this.name = '';
        this.description = '';
        this.price = new ProductPrice({ amount: 0, currency: 'USD' });
        this.categoryId = '';
        this.sku = '';
        this.images = [];
        this.attributes = new ProductAttributes({ attributes: [] });
        this.isActive = false;
        this.stock = 0;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    static create(
        id: string,
        name: string,
        description: string,
        price: ProductPriceData,
        categoryId: string,
        sku: string,
        images: string[] = [],
        attributes: ProductAttributesData = { attributes: [] }
    ): Product {
        const product = new Product(id);
        product.applyEvent(
            new ProductCreated(id, {
                name,
                description,
                price: price.amount,
                categoryId,
                sku,
                images,
                attributes: attributes.attributes,
                isActive: true,
            })
        );
        return product;
    }

    static fromEvents(id: string, events: Event[]): Product {
        const product = new Product(id);
        events.forEach(event => product.applyEvent(event));
        return product;
    }

    private applyEvent(event: Event): void {
        this.apply(event);
        this.version++;
        this.uncommittedEvents.push(event);
    }

    private apply(event: Event): void {
        switch (event.eventType) {
            case 'ProductCreated':
                this.applyProductCreated(event);
                break;
            case 'ProductUpdated':
                this.applyProductUpdated(event);
                break;
            case 'ProductPriceChanged':
                this.applyProductPriceChanged(event);
                break;
            case 'ProductDiscontinued':
                this.applyProductDiscontinued(event);
                break;
            case 'ProductReactivated':
                this.applyProductReactivated(event);
                break;
            case 'ProductStockUpdated':
                this.applyProductStockUpdated(event);
                break;
            case 'ProductCategoryChanged':
                this.applyProductCategoryChanged(event);
                break;
            case 'ProductImageAdded':
                this.applyProductImageAdded(event);
                break;
            case 'ProductImageRemoved':
                this.applyProductImageRemoved(event);
                break;
            case 'ProductAttributeUpdated':
                this.applyProductAttributeUpdated(event);
                break;
        }
    }

    private applyProductCreated(event: ProductCreated): void {
        const data = event.data;
        this.name = data.name;
        this.description = data.description;
        this.price = new ProductPrice({ amount: data.price, currency: 'USD' });
        this.categoryId = data.categoryId;
        this.sku = data.sku;
        this.images = data.images;
        this.attributes = new ProductAttributes({ attributes: data.attributes });
        this.isActive = data.isActive;
        this.createdAt = event.metadata.timestamp;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyProductUpdated(event: ProductUpdated): void {
        const data = event.data;
        if (data.name !== undefined) this.name = data.name;
        if (data.description !== undefined) this.description = data.description;
        if (data.categoryId !== undefined) this.categoryId = data.categoryId;
        if (data.images !== undefined) this.images = data.images;
        if (data.attributes !== undefined) {
            this.attributes = new ProductAttributes({ attributes: data.attributes });
        }
        if (data.isActive !== undefined) this.isActive = data.isActive;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyProductPriceChanged(event: ProductPriceChanged): void {
        const data = event.data;
        this.price = new ProductPrice({ amount: data.newPrice, currency: 'USD' });
        this.updatedAt = event.metadata.timestamp;
    }

    private applyProductDiscontinued(event: ProductDiscontinued): void {
        const data = event.data;
        this.isActive = false;
        this.discontinuedAt = data.discontinuedAt;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyProductReactivated(event: ProductReactivated): void {
        const data = event.data;
        this.isActive = true;
        this.discontinuedAt = undefined;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyProductStockUpdated(event: ProductStockUpdated): void {
        const data = event.data;
        this.stock = data.newStock;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyProductCategoryChanged(event: ProductCategoryChanged): void {
        const data = event.data;
        this.categoryId = data.newCategoryId;
        this.updatedAt = event.metadata.timestamp;
    }

    private applyProductImageAdded(event: ProductImageAdded): void {
        const data = event.data;
        this.images.push(data.imageUrl);
        this.updatedAt = event.metadata.timestamp;
    }

    private applyProductImageRemoved(event: ProductImageRemoved): void {
        const data = event.data;
        this.images = this.images.filter(img => img !== data.imageUrl);
        this.updatedAt = event.metadata.timestamp;
    }

    private applyProductAttributeUpdated(event: ProductAttributeUpdated): void {
        const data = event.data;
        this.attributes.setAttribute(data.attributeKey, data.newValue, 'string');
        this.updatedAt = event.metadata.timestamp;
    }

    // Command methods
    updateProduct(
        name?: string,
        description?: string,
        categoryId?: string,
        images?: string[],
        attributes?: ProductAttributesData,
        isActive?: boolean
    ): void {
        if (!this.isActive) {
            throw new Error('Cannot update a discontinued product');
        }

        this.applyEvent(
            new ProductUpdated(this.id, {
                name,
                description,
                categoryId,
                images,
                attributes: attributes?.attributes,
                isActive,
            })
        );
    }

    changePrice(newPrice: number, reason?: string): void {
        if (!this.isActive) {
            throw new Error('Cannot change price of a discontinued product');
        }

        if (newPrice <= 0) {
            throw new Error('Price must be greater than zero');
        }

        this.applyEvent(
            new ProductPriceChanged(this.id, {
                oldPrice: this.price.getAmount(),
                newPrice,
                reason,
            })
        );
    }

    discontinue(reason?: string): void {
        if (!this.isActive) {
            throw new Error('Product is already discontinued');
        }

        this.applyEvent(
            new ProductDiscontinued(this.id, {
                reason,
                discontinuedAt: new Date(),
            })
        );
    }

    reactivate(): void {
        if (this.isActive) {
            throw new Error('Product is already active');
        }

        this.applyEvent(
            new ProductReactivated(this.id, {
                reactivatedAt: new Date(),
            })
        );
    }

    updateStock(newStock: number, changeReason: string): void {
        if (newStock < 0) {
            throw new Error('Stock cannot be negative');
        }

        this.applyEvent(
            new ProductStockUpdated(this.id, {
                oldStock: this.stock,
                newStock,
                changeReason,
            })
        );
    }

    changeCategory(newCategoryId: string): void {
        if (!this.isActive) {
            throw new Error('Cannot change category of a discontinued product');
        }

        this.applyEvent(
            new ProductCategoryChanged(this.id, {
                oldCategoryId: this.categoryId,
                newCategoryId,
            })
        );
    }

    addImage(imageUrl: string, isPrimary: boolean = false): void {
        if (!this.isActive) {
            throw new Error('Cannot add image to a discontinued product');
        }

        this.applyEvent(
            new ProductImageAdded(this.id, {
                imageUrl,
                isPrimary,
            })
        );
    }

    removeImage(imageUrl: string): void {
        if (!this.images.includes(imageUrl)) {
            throw new Error('Image not found');
        }

        this.applyEvent(
            new ProductImageRemoved(this.id, {
                imageUrl,
            })
        );
    }

    updateAttribute(key: string, value: any): void {
        if (!this.isActive) {
            throw new Error('Cannot update attributes of a discontinued product');
        }

        const oldValue = this.attributes.getAttributeValue(key);
        this.applyEvent(
            new ProductAttributeUpdated(this.id, {
                attributeKey: key,
                oldValue,
                newValue: value,
            })
        );
    }

    // Query methods
    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getDescription(): string {
        return this.description;
    }

    getPrice(): ProductPrice {
        return this.price;
    }

    getCategoryId(): string {
        return this.categoryId;
    }

    getSku(): string {
        return this.sku;
    }

    getImages(): string[] {
        return [...this.images];
    }

    getAttributes(): ProductAttributes {
        return this.attributes;
    }

    isProductActive(): boolean {
        return this.isActive;
    }

    getStock(): number {
        return this.stock;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    getUpdatedAt(): Date {
        return this.updatedAt;
    }

    getDiscontinuedAt(): Date | undefined {
        return this.discontinuedAt;
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

    toJSON(): ProductState {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            price: this.price.toJSON(),
            categoryId: this.categoryId,
            sku: this.sku,
            images: this.images,
            attributes: this.attributes.toJSON(),
            isActive: this.isActive,
            stock: this.stock,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            discontinuedAt: this.discontinuedAt,
        };
    }
}
