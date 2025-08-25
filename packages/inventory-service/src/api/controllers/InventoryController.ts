import { Request, Response } from 'express';
import { InventoryCommandHandlers } from '../../commands/handlers/InventoryCommandHandlers';
import { AuthRequest } from '@ecommerce/shared';
import { asyncHandler } from '@ecommerce/shared';
import { logger } from '@ecommerce/shared';

export class InventoryController {
    constructor(
        private commandHandlers: InventoryCommandHandlers
    ) { }

    // Create inventory item
    createInventoryItem = asyncHandler(async (req: Request, res: Response) => {
        const inventoryId = await this.commandHandlers.createInventoryItem(req.body);

        res.status(201).json({
            success: true,
            data: { inventoryId },
            message: 'Inventory item created successfully'
        });
    });

    // Get inventory status
    getInventoryStatus = asyncHandler(async (req: Request, res: Response) => {
        const { inventoryId } = req.params;
        const status = await this.commandHandlers.getInventoryStatus({ inventoryId });

        res.status(200).json({
            success: true,
            data: status
        });
    });

    // Get inventory by product
    getInventoryByProduct = asyncHandler(async (req: Request, res: Response) => {
        const { productId } = req.params;
        const inventory = await this.commandHandlers.getInventoryByProduct({ productId });

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory not found for this product'
            });
        }

        res.status(200).json({
            success: true,
            data: inventory
        });
    });

    // Update stock
    updateStock = asyncHandler(async (req: Request, res: Response) => {
        const { inventoryId } = req.params;
        const { newStock, changeReason, changeType } = req.body;

        await this.commandHandlers.updateStock({
            inventoryId,
            newStock,
            changeReason,
            changeType
        });

        res.status(200).json({
            success: true,
            message: 'Stock updated successfully'
        });
    });

    // Reserve stock
    reserveStock = asyncHandler(async (req: Request, res: Response) => {
        const { inventoryId } = req.params;
        const { orderId, quantity, expiresAt } = req.body;

        await this.commandHandlers.reserveStock({
            inventoryId,
            orderId,
            quantity,
            expiresAt: new Date(expiresAt)
        });

        res.status(200).json({
            success: true,
            message: 'Stock reserved successfully'
        });
    });

    // Release stock
    releaseStock = asyncHandler(async (req: Request, res: Response) => {
        const { inventoryId } = req.params;
        const { orderId, reason } = req.body;

        await this.commandHandlers.releaseStock({
            inventoryId,
            orderId,
            reason
        });

        res.status(200).json({
            success: true,
            message: 'Stock released successfully'
        });
    });

    // Allocate stock
    allocateStock = asyncHandler(async (req: Request, res: Response) => {
        const { inventoryId } = req.params;
        const { orderId, quantity } = req.body;

        await this.commandHandlers.allocateStock({
            inventoryId,
            orderId,
            quantity
        });

        res.status(200).json({
            success: true,
            message: 'Stock allocated successfully'
        });
    });

    // Update low stock threshold
    updateLowStockThreshold = asyncHandler(async (req: Request, res: Response) => {
        const { inventoryId } = req.params;
        const { newThreshold } = req.body;

        await this.commandHandlers.updateLowStockThreshold({
            inventoryId,
            newThreshold
        });

        res.status(200).json({
            success: true,
            message: 'Low stock threshold updated successfully'
        });
    });
}
