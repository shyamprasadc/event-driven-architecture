import Joi from 'joi';

export const createProductSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().min(1).max(2000).required(),
    price: Joi.object({
        amount: Joi.number().positive().precision(2).required(),
        currency: Joi.string().length(3).uppercase().default('USD'),
        compareAtPrice: Joi.number().positive().precision(2).optional(),
        discountPercentage: Joi.number().min(0).max(100).precision(2).optional(),
    }).required(),
    categoryId: Joi.string().uuid().required(),
    sku: Joi.string().min(1).max(100).required(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    attributes: Joi.array().items(
        Joi.object({
            key: Joi.string().required(),
            value: Joi.any().required(),
            type: Joi.string().valid('string', 'number', 'boolean', 'array', 'object').required(),
            displayName: Joi.string().optional(),
            unit: Joi.string().optional(),
        })
    ).optional(),
});

export const updateProductSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().min(1).max(2000).optional(),
    categoryId: Joi.string().uuid().optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    attributes: Joi.array().items(
        Joi.object({
            key: Joi.string().required(),
            value: Joi.any().required(),
            type: Joi.string().valid('string', 'number', 'boolean', 'array', 'object').required(),
            displayName: Joi.string().optional(),
            unit: Joi.string().optional(),
        })
    ).optional(),
    isActive: Joi.boolean().optional(),
});

export const changePriceSchema = Joi.object({
    newPrice: Joi.number().positive().precision(2).required(),
    reason: Joi.string().max(500).optional(),
});

export const updateStockSchema = Joi.object({
    newStock: Joi.number().min(0).integer().required(),
    changeReason: Joi.string().max(500).required(),
});

export const changeCategorySchema = Joi.object({
    newCategoryId: Joi.string().uuid().required(),
});

export const addImageSchema = Joi.object({
    imageUrl: Joi.string().uri().required(),
    isPrimary: Joi.boolean().default(false),
});

export const removeImageSchema = Joi.object({
    imageUrl: Joi.string().uri().required(),
});

export const updateAttributeSchema = Joi.object({
    key: Joi.string().required(),
    value: Joi.any().required(),
    type: Joi.string().valid('string', 'number', 'boolean', 'array', 'object').required(),
    displayName: Joi.string().optional(),
    unit: Joi.string().optional(),
});

export const discontinueProductSchema = Joi.object({
    reason: Joi.string().max(500).optional(),
});

export const reactivateProductSchema = Joi.object({});

export const productIdSchema = Joi.object({
    productId: Joi.string().uuid().required(),
});
