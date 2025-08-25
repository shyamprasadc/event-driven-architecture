import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { protect, authorize } from '@ecommerce/shared';

export function createInventoryRoutes(inventoryController: InventoryController): Router {
    const router = Router();

    // Apply authentication middleware to all routes
    router.use(protect);

    // Inventory CRUD operations
    router.post('/', authorize('admin'), inventoryController.createInventoryItem);
    router.get('/:inventoryId', inventoryController.getInventoryStatus);
    router.get('/product/:productId', inventoryController.getInventoryByProduct);

    // Stock management routes
    router.put('/:inventoryId/stock', authorize('admin'), inventoryController.updateStock);
    router.post('/:inventoryId/reserve', inventoryController.reserveStock);
    router.post('/:inventoryId/release', inventoryController.releaseStock);
    router.post('/:inventoryId/allocate', authorize('admin'), inventoryController.allocateStock);

    // Configuration routes
    router.put('/:inventoryId/threshold', authorize('admin'), inventoryController.updateLowStockThreshold);

    return router;
}
