import { Request, Response } from 'express';
import { ProductCommandHandlers } from '../../commands/handlers/ProductCommandHandlers';
import { ProductQueryHandlers } from '../../queries/handlers/ProductQueryHandlers';
import { logger } from '@ecommerce/shared';

export class ProductController {
    constructor(
        private commandHandlers: ProductCommandHandlers,
        private queryHandlers: ProductQueryHandlers
    ) { }

    // Product Creation
    async createProduct(req: Request, res: Response): Promise<void> {
        try {
            const productId = await this.commandHandlers.createProduct(req.body);
            res.status(201).json({
                success: true,
                data: { productId },
                message: 'Product created successfully',
            });
        } catch (error) {
            logger.error('Failed to create product', { error, body: req.body });
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create product',
            });
        }
    }

    // Product Updates
    async updateProduct(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            await this.commandHandlers.updateProduct({
                productId,
                ...req.body,
            });
            res.json({
                success: true,
                message: 'Product updated successfully',
            });
        } catch (error) {
            logger.error('Failed to update product', { error, params: req.params, body: req.body });
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update product',
            });
        }
    }

    async changePrice(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            await this.commandHandlers.changePrice({
                productId,
                ...req.body,
            });
            res.json({
                success: true,
                message: 'Product price changed successfully',
            });
        } catch (error) {
            logger.error('Failed to change product price', { error, params: req.params, body: req.body });
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to change product price',
            });
        }
    }

    async updateStock(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            await this.commandHandlers.updateStock({
                productId,
                ...req.body,
            });
            res.json({
                success: true,
                message: 'Product stock updated successfully',
            });
        } catch (error) {
            logger.error('Failed to update product stock', { error, params: req.params, body: req.body });
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update product stock',
            });
        }
    }

    async changeCategory(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            await this.commandHandlers.changeCategory({
                productId,
                ...req.body,
            });
            res.json({
                success: true,
                message: 'Product category changed successfully',
            });
        } catch (error) {
            logger.error('Failed to change product category', { error, params: req.params, body: req.body });
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to change product category',
            });
        }
    }

    // Image Management
    async addImage(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            await this.commandHandlers.addImage({
                productId,
                ...req.body,
            });
            res.json({
                success: true,
                message: 'Product image added successfully',
            });
        } catch (error) {
            logger.error('Failed to add product image', { error, params: req.params, body: req.body });
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add product image',
            });
        }
    }

    async removeImage(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            await this.commandHandlers.removeImage({
                productId,
                ...req.body,
            });
            res.json({
                success: true,
                message: 'Product image removed successfully',
            });
        } catch (error) {
            logger.error('Failed to remove product image', { error, params: req.params, body: req.body });
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to remove product image',
            });
        }
    }

    // Attribute Management
    async updateAttribute(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            await this.commandHandlers.updateAttribute({
                productId,
                ...req.body,
            });
            res.json({
                success: true,
                message: 'Product attribute updated successfully',
            });
        } catch (error) {
            logger.error('Failed to update product attribute', { error, params: req.params, body: req.body });
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update product attribute',
            });
        }
    }

    // Product Status
    async discontinueProduct(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            await this.commandHandlers.discontinueProduct({
                productId,
                ...req.body,
            });
            res.json({
                success: true,
                message: 'Product discontinued successfully',
            });
        } catch (error) {
            logger.error('Failed to discontinue product', { error, params: req.params, body: req.body });
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to discontinue product',
            });
        }
    }

    async reactivateProduct(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            await this.commandHandlers.reactivateProduct({
                productId,
            });
            res.json({
                success: true,
                message: 'Product reactivated successfully',
            });
        } catch (error) {
            logger.error('Failed to reactivate product', { error, params: req.params });
            res.status(400).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to reactivate product',
            });
        }
    }

    // Product Queries
    async getProduct(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            const product = await this.queryHandlers.getProduct({ productId });

            if (!product) {
                res.status(404).json({
                    success: false,
                    error: 'Product not found',
                });
                return;
            }

            res.json({
                success: true,
                data: product,
            });
        } catch (error) {
            logger.error('Failed to get product', { error, params: req.params });
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get product',
            });
        }
    }

    async getProducts(req: Request, res: Response): Promise<void> {
        try {
            const { page, limit, categoryId, isActive } = req.query;
            const products = await this.queryHandlers.getProducts({
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                categoryId: categoryId as string,
                isActive: isActive ? isActive === 'true' : undefined,
            });

            res.json({
                success: true,
                data: products,
            });
        } catch (error) {
            logger.error('Failed to get products', { error, query: req.query });
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get products',
            });
        }
    }

    async searchProducts(req: Request, res: Response): Promise<void> {
        try {
            const { q, page, limit, categoryId, minPrice, maxPrice, inStock } = req.query;

            if (!q) {
                res.status(400).json({
                    success: false,
                    error: 'Search query is required',
                });
                return;
            }

            const products = await this.queryHandlers.searchProducts({
                query: q as string,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                categoryId: categoryId as string,
                minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
                maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
                inStock: inStock ? inStock === 'true' : undefined,
            });

            res.json({
                success: true,
                data: products,
            });
        } catch (error) {
            logger.error('Failed to search products', { error, query: req.query });
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search products',
            });
        }
    }

    async getProductsByPriceRange(req: Request, res: Response): Promise<void> {
        try {
            const { minPrice, maxPrice, page, limit } = req.query;

            if (!minPrice || !maxPrice) {
                res.status(400).json({
                    success: false,
                    error: 'Min price and max price are required',
                });
                return;
            }

            const products = await this.queryHandlers.getProductsByPriceRange({
                minPrice: parseFloat(minPrice as string),
                maxPrice: parseFloat(maxPrice as string),
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
            });

            res.json({
                success: true,
                data: products,
            });
        } catch (error) {
            logger.error('Failed to get products by price range', { error, query: req.query });
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get products by price range',
            });
        }
    }

    async getProductsInStock(req: Request, res: Response): Promise<void> {
        try {
            const { page, limit } = req.query;
            const products = await this.queryHandlers.getProductsInStock({
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
            });

            res.json({
                success: true,
                data: products,
            });
        } catch (error) {
            logger.error('Failed to get products in stock', { error, query: req.query });
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get products in stock',
            });
        }
    }

    async getLowStockProducts(req: Request, res: Response): Promise<void> {
        try {
            const { threshold, page, limit } = req.query;

            if (!threshold) {
                res.status(400).json({
                    success: false,
                    error: 'Threshold is required',
                });
                return;
            }

            const products = await this.queryHandlers.getLowStockProducts({
                threshold: parseInt(threshold as string),
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
            });

            res.json({
                success: true,
                data: products,
            });
        } catch (error) {
            logger.error('Failed to get low stock products', { error, query: req.query });
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get low stock products',
            });
        }
    }

    async getProductInventory(req: Request, res: Response): Promise<void> {
        try {
            const { productId } = req.params;
            const inventory = await this.queryHandlers.getProductInventory({ productId });

            if (!inventory) {
                res.status(404).json({
                    success: false,
                    error: 'Product not found',
                });
                return;
            }

            res.json({
                success: true,
                data: inventory,
            });
        } catch (error) {
            logger.error('Failed to get product inventory', { error, params: req.params });
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get product inventory',
            });
        }
    }

    // Health Check
    async healthCheck(req: Request, res: Response): Promise<void> {
        res.json({
            success: true,
            service: 'product-service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
        });
    }
}
