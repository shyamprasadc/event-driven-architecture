import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { protect, authorize } from '@ecommerce/shared';
import {
    createProductSchema,
    updateProductSchema,
    changePriceSchema,
    updateStockSchema,
    changeCategorySchema,
    addImageSchema,
    removeImageSchema,
    updateAttributeSchema,
    discontinueProductSchema,
    reactivateProductSchema,
} from '../../commands/validators/productValidators';

export function createProductRoutes(controller: ProductController): Router {
    const router = Router();

    // Health check
    router.get('/health', controller.healthCheck.bind(controller));

    // Public routes (read-only)
    router.get('/products', controller.getProducts.bind(controller));
    router.get('/products/search', controller.searchProducts.bind(controller));
    router.get('/products/price-range', controller.getProductsByPriceRange.bind(controller));
    router.get('/products/in-stock', controller.getProductsInStock.bind(controller));
    router.get('/products/:productId', controller.getProduct.bind(controller));
    router.get('/products/:productId/inventory', controller.getProductInventory.bind(controller));

    // Protected routes (admin only)
    router.use(protect);
    router.use(authorize('admin'));

    // Product management
    router.post('/products', createProductSchema, controller.createProduct.bind(controller));
    router.put('/products/:productId', updateProductSchema, controller.updateProduct.bind(controller));
    router.patch('/products/:productId/price', changePriceSchema, controller.changePrice.bind(controller));
    router.patch('/products/:productId/stock', updateStockSchema, controller.updateStock.bind(controller));
    router.patch('/products/:productId/category', changeCategorySchema, controller.changeCategory.bind(controller));

    // Image management
    router.post('/products/:productId/images', addImageSchema, controller.addImage.bind(controller));
    router.delete('/products/:productId/images', removeImageSchema, controller.removeImage.bind(controller));

    // Attribute management
    router.patch('/products/:productId/attributes', updateAttributeSchema, controller.updateAttribute.bind(controller));

    // Product status
    router.post('/products/:productId/discontinue', discontinueProductSchema, controller.discontinueProduct.bind(controller));
    router.post('/products/:productId/reactivate', reactivateProductSchema, controller.reactivateProduct.bind(controller));

    // Admin-only queries
    router.get('/products/low-stock', controller.getLowStockProducts.bind(controller));

    return router;
}
