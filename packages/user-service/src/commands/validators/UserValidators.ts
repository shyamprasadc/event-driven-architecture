import Joi from 'joi';

export const registerUserSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    phone: Joi.string().optional(),
    dateOfBirth: Joi.date().max('now').optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
});

export const updateProfileSchema = Joi.object({
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    phone: Joi.string().optional(),
    dateOfBirth: Joi.date().max('now').optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    avatar: Joi.string().uri().optional(),
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

export const addAddressSchema = Joi.object({
    street: Joi.string().min(1).max(200).required(),
    city: Joi.string().min(1).max(100).required(),
    state: Joi.string().min(1).max(100).required(),
    zipCode: Joi.string().min(1).max(20).required(),
    country: Joi.string().min(1).max(100).required(),
    isDefault: Joi.boolean().default(false),
    label: Joi.string().max(50).optional(),
});

export const updateAddressSchema = Joi.object({
    street: Joi.string().min(1).max(200).optional(),
    city: Joi.string().min(1).max(100).optional(),
    state: Joi.string().min(1).max(100).optional(),
    zipCode: Joi.string().min(1).max(20).optional(),
    country: Joi.string().min(1).max(100).optional(),
    isDefault: Joi.boolean().optional(),
    label: Joi.string().max(50).optional(),
});

export const deactivateUserSchema = Joi.object({
    reason: Joi.string().max(500).optional(),
});

export const searchUsersSchema = Joi.object({
    query: Joi.string().min(1).max(100).optional(),
    email: Joi.string().email().optional(),
    isActive: Joi.boolean().optional(),
    isEmailVerified: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'email', 'firstName', 'lastName').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});
