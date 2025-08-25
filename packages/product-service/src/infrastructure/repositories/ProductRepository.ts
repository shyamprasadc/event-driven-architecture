import { EventStore } from '@ecommerce/shared';
import { Product } from '../../domain/aggregates/Product';

export interface ProductRepository {
    save(product: Product): Promise<void>;
    findById(id: string): Promise<Product | null>;
    findBySku(sku: string): Promise<Product | null>;
    findByCategory(categoryId: string): Promise<Product[]>;
    findActiveProducts(): Promise<Product[]>;
    searchProducts(query: string): Promise<Product[]>;
    findProductsByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]>;
    findProductsInStock(): Promise<Product[]>;
    findLowStockProducts(threshold: number): Promise<Product[]>;
}

export class EventSourcedProductRepository implements ProductRepository {
    constructor(private eventStore: EventStore) { }

    async save(product: Product): Promise<void> {
        const events = product.getUncommittedEvents();
        if (events.length > 0) {
            await this.eventStore.saveEvents(product.getId(), events, product.getVersion());
            product.markEventsAsCommitted();
        }
    }

    async findById(id: string): Promise<Product | null> {
        try {
            const events = await this.eventStore.getEvents(id);
            if (events.length === 0) {
                return null;
            }
            return Product.fromEvents(id, events);
        } catch (error) {
            throw new Error(`Failed to find product by ID: ${error}`);
        }
    }

    async findBySku(sku: string): Promise<Product | null> {
        try {
            // This is a simplified implementation
            // In a real scenario, you would have a read model or index for SKU lookups
            const allEvents = await this.eventStore.getAllEvents();
            const productEvents = new Map<string, any[]>();

            for (const event of allEvents) {
                if (!productEvents.has(event.aggregateId)) {
                    productEvents.set(event.aggregateId, []);
                }
                productEvents.get(event.aggregateId)!.push(event);
            }

            for (const [productId, events] of productEvents) {
                const product = Product.fromEvents(productId, events);
                if (product.getSku() === sku) {
                    return product;
                }
            }

            return null;
        } catch (error) {
            throw new Error(`Failed to find product by SKU: ${error}`);
        }
    }

    async findByCategory(categoryId: string): Promise<Product[]> {
        try {
            const allEvents = await this.eventStore.getAllEvents();
            const productEvents = new Map<string, any[]>();

            for (const event of allEvents) {
                if (!productEvents.has(event.aggregateId)) {
                    productEvents.set(event.aggregateId, []);
                }
                productEvents.get(event.aggregateId)!.push(event);
            }

            const products: Product[] = [];
            for (const [productId, events] of productEvents) {
                const product = Product.fromEvents(productId, events);
                if (product.getCategoryId() === categoryId) {
                    products.push(product);
                }
            }

            return products;
        } catch (error) {
            throw new Error(`Failed to find products by category: ${error}`);
        }
    }

    async findActiveProducts(): Promise<Product[]> {
        try {
            const allEvents = await this.eventStore.getAllEvents();
            const productEvents = new Map<string, any[]>();

            for (const event of allEvents) {
                if (!productEvents.has(event.aggregateId)) {
                    productEvents.set(event.aggregateId, []);
                }
                productEvents.get(event.aggregateId)!.push(event);
            }

            const products: Product[] = [];
            for (const [productId, events] of productEvents) {
                const product = Product.fromEvents(productId, events);
                if (product.isProductActive()) {
                    products.push(product);
                }
            }

            return products;
        } catch (error) {
            throw new Error(`Failed to find active products: ${error}`);
        }
    }

    async searchProducts(query: string): Promise<Product[]> {
        try {
            const allEvents = await this.eventStore.getAllEvents();
            const productEvents = new Map<string, any[]>();

            for (const event of allEvents) {
                if (!productEvents.has(event.aggregateId)) {
                    productEvents.set(event.aggregateId, []);
                }
                productEvents.get(event.aggregateId)!.push(event);
            }

            const products: Product[] = [];
            const lowerQuery = query.toLowerCase();

            for (const [productId, events] of productEvents) {
                const product = Product.fromEvents(productId, events);
                if (
                    product.isProductActive() &&
                    (product.getName().toLowerCase().includes(lowerQuery) ||
                        product.getDescription().toLowerCase().includes(lowerQuery) ||
                        product.getSku().toLowerCase().includes(lowerQuery))
                ) {
                    products.push(product);
                }
            }

            return products;
        } catch (error) {
            throw new Error(`Failed to search products: ${error}`);
        }
    }

    async findProductsByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]> {
        try {
            const allEvents = await this.eventStore.getAllEvents();
            const productEvents = new Map<string, any[]>();

            for (const event of allEvents) {
                if (!productEvents.has(event.aggregateId)) {
                    productEvents.set(event.aggregateId, []);
                }
                productEvents.get(event.aggregateId)!.push(event);
            }

            const products: Product[] = [];
            for (const [productId, events] of productEvents) {
                const product = Product.fromEvents(productId, events);
                const price = product.getPrice().getAmount();
                if (product.isProductActive() && price >= minPrice && price <= maxPrice) {
                    products.push(product);
                }
            }

            return products;
        } catch (error) {
            throw new Error(`Failed to find products by price range: ${error}`);
        }
    }

    async findProductsInStock(): Promise<Product[]> {
        try {
            const allEvents = await this.eventStore.getAllEvents();
            const productEvents = new Map<string, any[]>();

            for (const event of allEvents) {
                if (!productEvents.has(event.aggregateId)) {
                    productEvents.set(event.aggregateId, []);
                }
                productEvents.get(event.aggregateId)!.push(event);
            }

            const products: Product[] = [];
            for (const [productId, events] of productEvents) {
                const product = Product.fromEvents(productId, events);
                if (product.isProductActive() && product.getStock() > 0) {
                    products.push(product);
                }
            }

            return products;
        } catch (error) {
            throw new Error(`Failed to find products in stock: ${error}`);
        }
    }

    async findLowStockProducts(threshold: number): Promise<Product[]> {
        try {
            const allEvents = await this.eventStore.getAllEvents();
            const productEvents = new Map<string, any[]>();

            for (const event of allEvents) {
                if (!productEvents.has(event.aggregateId)) {
                    productEvents.set(event.aggregateId, []);
                }
                productEvents.get(event.aggregateId)!.push(event);
            }

            const products: Product[] = [];
            for (const [productId, events] of productEvents) {
                const product = Product.fromEvents(productId, events);
                if (product.isProductActive() && product.getStock() <= threshold) {
                    products.push(product);
                }
            }

            return products;
        } catch (error) {
            throw new Error(`Failed to find low stock products: ${error}`);
        }
    }
}
