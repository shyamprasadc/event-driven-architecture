import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '@ecommerce/shared';
import { Product } from '../../domain/aggregates/Product';
import { ProductRepository } from '../../infrastructure/repositories/ProductRepository';
import { ProductPriceData } from '../../domain/valueObjects/ProductPrice';
import { ProductAttributesData } from '../../domain/valueObjects/ProductAttributes';
import { logger } from '@ecommerce/shared';

export interface CreateProductCommand {
    name: string;
    description: string;
    price: ProductPriceData;
    categoryId: string;
    sku: string;
    images?: string[];
    attributes?: ProductAttributesData;
}

export interface UpdateProductCommand {
    productId: string;
    name?: string;
    description?: string;
    categoryId?: string;
    images?: string[];
    attributes?: ProductAttributesData;
    isActive?: boolean;
}

export interface ChangePriceCommand {
    productId: string;
    newPrice: number;
    reason?: string;
}

export interface UpdateStockCommand {
    productId: string;
    newStock: number;
    changeReason: string;
}

export interface ChangeCategoryCommand {
    productId: string;
    newCategoryId: string;
}

export interface AddImageCommand {
    productId: string;
    imageUrl: string;
    isPrimary?: boolean;
}

export interface RemoveImageCommand {
    productId: string;
    imageUrl: string;
}

export interface UpdateAttributeCommand {
    productId: string;
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    displayName?: string;
    unit?: string;
}

export interface DiscontinueProductCommand {
    productId: string;
    reason?: string;
}

export interface ReactivateProductCommand {
    productId: string;
}

export class ProductCommandHandlers {
    constructor(
        private productRepository: ProductRepository,
        private eventBus: EventBus
    ) { }

    async createProduct(command: CreateProductCommand): Promise<string> {
        try {
            const productId = uuidv4();
            const product = Product.create(
                productId,
                command.name,
                command.description,
                command.price,
                command.categoryId,
                command.sku,
                command.images || [],
                command.attributes || { attributes: [] }
            );

            await this.productRepository.save(product);
            await this.publishEvents(product.getUncommittedEvents());
            product.markEventsAsCommitted();

            logger.info('Product created successfully', { productId, sku: command.sku });
            return productId;
        } catch (error) {
            logger.error('Failed to create product', { error, command });
            throw error;
        }
    }

    async updateProduct(command: UpdateProductCommand): Promise<void> {
        try {
            const product = await this.productRepository.findById(command.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            product.updateProduct(
                command.name,
                command.description,
                command.categoryId,
                command.images,
                command.attributes,
                command.isActive
            );

            await this.productRepository.save(product);
            await this.publishEvents(product.getUncommittedEvents());
            product.markEventsAsCommitted();

            logger.info('Product updated successfully', { productId: command.productId });
        } catch (error) {
            logger.error('Failed to update product', { error, command });
            throw error;
        }
    }

    async changePrice(command: ChangePriceCommand): Promise<void> {
        try {
            const product = await this.productRepository.findById(command.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            product.changePrice(command.newPrice, command.reason);

            await this.productRepository.save(product);
            await this.publishEvents(product.getUncommittedEvents());
            product.markEventsAsCommitted();

            logger.info('Product price changed successfully', {
                productId: command.productId,
                newPrice: command.newPrice
            });
        } catch (error) {
            logger.error('Failed to change product price', { error, command });
            throw error;
        }
    }

    async updateStock(command: UpdateStockCommand): Promise<void> {
        try {
            const product = await this.productRepository.findById(command.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            product.updateStock(command.newStock, command.changeReason);

            await this.productRepository.save(product);
            await this.publishEvents(product.getUncommittedEvents());
            product.markEventsAsCommitted();

            logger.info('Product stock updated successfully', {
                productId: command.productId,
                newStock: command.newStock
            });
        } catch (error) {
            logger.error('Failed to update product stock', { error, command });
            throw error;
        }
    }

    async changeCategory(command: ChangeCategoryCommand): Promise<void> {
        try {
            const product = await this.productRepository.findById(command.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            product.changeCategory(command.newCategoryId);

            await this.productRepository.save(product);
            await this.publishEvents(product.getUncommittedEvents());
            product.markEventsAsCommitted();

            logger.info('Product category changed successfully', {
                productId: command.productId,
                newCategoryId: command.newCategoryId
            });
        } catch (error) {
            logger.error('Failed to change product category', { error, command });
            throw error;
        }
    }

    async addImage(command: AddImageCommand): Promise<void> {
        try {
            const product = await this.productRepository.findById(command.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            product.addImage(command.imageUrl, command.isPrimary);

            await this.productRepository.save(product);
            await this.publishEvents(product.getUncommittedEvents());
            product.markEventsAsCommitted();

            logger.info('Product image added successfully', {
                productId: command.productId,
                imageUrl: command.imageUrl
            });
        } catch (error) {
            logger.error('Failed to add product image', { error, command });
            throw error;
        }
    }

    async removeImage(command: RemoveImageCommand): Promise<void> {
        try {
            const product = await this.productRepository.findById(command.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            product.removeImage(command.imageUrl);

            await this.productRepository.save(product);
            await this.publishEvents(product.getUncommittedEvents());
            product.markEventsAsCommitted();

            logger.info('Product image removed successfully', {
                productId: command.productId,
                imageUrl: command.imageUrl
            });
        } catch (error) {
            logger.error('Failed to remove product image', { error, command });
            throw error;
        }
    }

    async updateAttribute(command: UpdateAttributeCommand): Promise<void> {
        try {
            const product = await this.productRepository.findById(command.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            product.updateAttribute(command.key, command.value);

            await this.productRepository.save(product);
            await this.publishEvents(product.getUncommittedEvents());
            product.markEventsAsCommitted();

            logger.info('Product attribute updated successfully', {
                productId: command.productId,
                attributeKey: command.key
            });
        } catch (error) {
            logger.error('Failed to update product attribute', { error, command });
            throw error;
        }
    }

    async discontinueProduct(command: DiscontinueProductCommand): Promise<void> {
        try {
            const product = await this.productRepository.findById(command.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            product.discontinue(command.reason);

            await this.productRepository.save(product);
            await this.publishEvents(product.getUncommittedEvents());
            product.markEventsAsCommitted();

            logger.info('Product discontinued successfully', {
                productId: command.productId,
                reason: command.reason
            });
        } catch (error) {
            logger.error('Failed to discontinue product', { error, command });
            throw error;
        }
    }

    async reactivateProduct(command: ReactivateProductCommand): Promise<void> {
        try {
            const product = await this.productRepository.findById(command.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            product.reactivate();

            await this.productRepository.save(product);
            await this.publishEvents(product.getUncommittedEvents());
            product.markEventsAsCommitted();

            logger.info('Product reactivated successfully', { productId: command.productId });
        } catch (error) {
            logger.error('Failed to reactivate product', { error, command });
            throw error;
        }
    }

    private async publishEvents(events: any[]): Promise<void> {
        for (const event of events) {
            await this.eventBus.publish(event);
        }
    }
}
