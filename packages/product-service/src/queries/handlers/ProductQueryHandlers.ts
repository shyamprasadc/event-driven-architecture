import { ProductRepository } from '../../infrastructure/repositories/ProductRepository';
import {
    ProductQueryResult,
    ProductListQueryResult,
    ProductSearchQueryResult,
    ProductInventoryQueryResult,
} from '../models/ProductQueryResult';
import { logger } from '@ecommerce/shared';

export interface GetProductQuery {
    productId: string;
}

export interface GetProductsQuery {
    page?: number;
    limit?: number;
    categoryId?: string;
    isActive?: boolean;
}

export interface SearchProductsQuery {
    query: string;
    page?: number;
    limit?: number;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
}

export interface GetProductsByPriceRangeQuery {
    minPrice: number;
    maxPrice: number;
    page?: number;
    limit?: number;
}

export interface GetProductsInStockQuery {
    page?: number;
    limit?: number;
}

export interface GetLowStockProductsQuery {
    threshold: number;
    page?: number;
    limit?: number;
}

export interface GetProductInventoryQuery {
    productId: string;
}

export class ProductQueryHandlers {
    constructor(private productRepository: ProductRepository) { }

    async getProduct(query: GetProductQuery): Promise<ProductQueryResult | null> {
        try {
            const product = await this.productRepository.findById(query.productId);
            if (!product) {
                return null;
            }

            return this.mapToProductQueryResult(product);
        } catch (error) {
            logger.error('Failed to get product', { error, query });
            throw error;
        }
    }

    async getProducts(query: GetProductsQuery): Promise<ProductListQueryResult> {
        try {
            const page = query.page || 1;
            const limit = query.limit || 20;
            const offset = (page - 1) * limit;

            let products: any[] = [];

            if (query.categoryId) {
                products = await this.productRepository.findByCategory(query.categoryId);
            } else if (query.isActive !== undefined) {
                if (query.isActive) {
                    products = await this.productRepository.findActiveProducts();
                } else {
                    // For inactive products, we would need a different method
                    // This is a simplified implementation
                    products = [];
                }
            } else {
                products = await this.productRepository.findActiveProducts();
            }

            // Apply pagination
            const total = products.length;
            const paginatedProducts = products.slice(offset, offset + limit);

            const productResults = paginatedProducts.map(product => this.mapToProductQueryResult(product));

            return {
                products: productResults,
                total,
                page,
                limit,
                hasNext: offset + limit < total,
                hasPrevious: page > 1,
            };
        } catch (error) {
            logger.error('Failed to get products', { error, query });
            throw error;
        }
    }

    async searchProducts(query: SearchProductsQuery): Promise<ProductSearchQueryResult> {
        try {
            const page = query.page || 1;
            const limit = query.limit || 20;
            const offset = (page - 1) * limit;

            let products = await this.productRepository.searchProducts(query.query);

            // Apply filters
            if (query.categoryId) {
                products = products.filter(p => p.getCategoryId() === query.categoryId);
            }

            if (query.minPrice !== undefined || query.maxPrice !== undefined) {
                products = products.filter(p => {
                    const price = p.getPrice().getAmount();
                    const minPrice = query.minPrice ?? 0;
                    const maxPrice = query.maxPrice ?? Number.MAX_VALUE;
                    return price >= minPrice && price <= maxPrice;
                });
            }

            if (query.inStock !== undefined) {
                if (query.inStock) {
                    products = products.filter(p => p.getStock() > 0);
                } else {
                    products = products.filter(p => p.getStock() === 0);
                }
            }

            const total = products.length;
            const paginatedProducts = products.slice(offset, offset + limit);

            const productResults = paginatedProducts.map(product => this.mapToProductQueryResult(product));

            return {
                products: productResults,
                total,
                query: query.query,
                filters: {
                    categoryId: query.categoryId,
                    minPrice: query.minPrice,
                    maxPrice: query.maxPrice,
                    inStock: query.inStock,
                },
            };
        } catch (error) {
            logger.error('Failed to search products', { error, query });
            throw error;
        }
    }

    async getProductsByPriceRange(query: GetProductsByPriceRangeQuery): Promise<ProductListQueryResult> {
        try {
            const page = query.page || 1;
            const limit = query.limit || 20;
            const offset = (page - 1) * limit;

            const products = await this.productRepository.findProductsByPriceRange(query.minPrice, query.maxPrice);

            const total = products.length;
            const paginatedProducts = products.slice(offset, offset + limit);

            const productResults = paginatedProducts.map(product => this.mapToProductQueryResult(product));

            return {
                products: productResults,
                total,
                page,
                limit,
                hasNext: offset + limit < total,
                hasPrevious: page > 1,
            };
        } catch (error) {
            logger.error('Failed to get products by price range', { error, query });
            throw error;
        }
    }

    async getProductsInStock(query: GetProductsInStockQuery): Promise<ProductListQueryResult> {
        try {
            const page = query.page || 1;
            const limit = query.limit || 20;
            const offset = (page - 1) * limit;

            const products = await this.productRepository.findProductsInStock();

            const total = products.length;
            const paginatedProducts = products.slice(offset, offset + limit);

            const productResults = paginatedProducts.map(product => this.mapToProductQueryResult(product));

            return {
                products: productResults,
                total,
                page,
                limit,
                hasNext: offset + limit < total,
                hasPrevious: page > 1,
            };
        } catch (error) {
            logger.error('Failed to get products in stock', { error, query });
            throw error;
        }
    }

    async getLowStockProducts(query: GetLowStockProductsQuery): Promise<ProductListQueryResult> {
        try {
            const page = query.page || 1;
            const limit = query.limit || 20;
            const offset = (page - 1) * limit;

            const products = await this.productRepository.findLowStockProducts(query.threshold);

            const total = products.length;
            const paginatedProducts = products.slice(offset, offset + limit);

            const productResults = paginatedProducts.map(product => this.mapToProductQueryResult(product));

            return {
                products: productResults,
                total,
                page,
                limit,
                hasNext: offset + limit < total,
                hasPrevious: page > 1,
            };
        } catch (error) {
            logger.error('Failed to get low stock products', { error, query });
            throw error;
        }
    }

    async getProductInventory(query: GetProductInventoryQuery): Promise<ProductInventoryQueryResult | null> {
        try {
            const product = await this.productRepository.findById(query.productId);
            if (!product) {
                return null;
            }

            const lowStockThreshold = 10; // This could be configurable
            const currentStock = product.getStock();
            const reservedStock = 0; // This would come from inventory service
            const availableStock = currentStock - reservedStock;

            return {
                productId: product.getId(),
                sku: product.getSku(),
                name: product.getName(),
                currentStock,
                reservedStock,
                availableStock,
                lowStockThreshold,
                isLowStock: currentStock <= lowStockThreshold,
                lastUpdated: product.getUpdatedAt(),
            };
        } catch (error) {
            logger.error('Failed to get product inventory', { error, query });
            throw error;
        }
    }

    private mapToProductQueryResult(product: any): ProductQueryResult {
        const price = product.getPrice();
        return {
            id: product.getId(),
            name: product.getName(),
            description: product.getDescription(),
            price: {
                amount: price.getAmount(),
                currency: price.getCurrency(),
                compareAtPrice: price.getCompareAtPrice(),
                discountPercentage: price.getDiscountPercentage(),
                isOnSale: price.isOnSale(),
                discountedAmount: price.getDiscountedAmount(),
                savingsAmount: price.getSavingsAmount(),
            },
            categoryId: product.getCategoryId(),
            sku: product.getSku(),
            images: product.getImages(),
            attributes: product.getAttributes().getAllAttributes(),
            isActive: product.isProductActive(),
            stock: product.getStock(),
            createdAt: product.getCreatedAt(),
            updatedAt: product.getUpdatedAt(),
            discontinuedAt: product.getDiscontinuedAt(),
        };
    }
}
