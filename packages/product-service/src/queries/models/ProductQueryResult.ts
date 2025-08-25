export interface ProductQueryResult {
    id: string;
    name: string;
    description: string;
    price: {
        amount: number;
        currency: string;
        compareAtPrice?: number;
        discountPercentage?: number;
        isOnSale: boolean;
        discountedAmount: number;
        savingsAmount: number;
    };
    categoryId: string;
    sku: string;
    images: string[];
    attributes: Array<{
        key: string;
        value: any;
        type: 'string' | 'number' | 'boolean' | 'array' | 'object';
        displayName?: string;
        unit?: string;
    }>;
    isActive: boolean;
    stock: number;
    createdAt: Date;
    updatedAt: Date;
    discontinuedAt?: Date;
}

export interface ProductListQueryResult {
    products: ProductQueryResult[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

export interface ProductSearchQueryResult {
    products: ProductQueryResult[];
    total: number;
    query: string;
    filters: {
        categoryId?: string;
        minPrice?: number;
        maxPrice?: number;
        inStock?: boolean;
    };
}

export interface ProductCategoryQueryResult {
    id: string;
    name: string;
    description?: string;
    parentId?: string;
    productCount: number;
    isActive: boolean;
}

export interface ProductInventoryQueryResult {
    productId: string;
    sku: string;
    name: string;
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    lastUpdated: Date;
}

export interface ProductPriceHistoryQueryResult {
    productId: string;
    priceHistory: Array<{
        price: number;
        currency: string;
        changedAt: Date;
        reason?: string;
    }>;
}

export interface ProductAttributeQueryResult {
    productId: string;
    attributes: Array<{
        key: string;
        value: any;
        type: 'string' | 'number' | 'boolean' | 'array' | 'object';
        displayName?: string;
        unit?: string;
    }>;
}

export interface ProductImageQueryResult {
    productId: string;
    images: Array<{
        url: string;
        isPrimary: boolean;
        altText?: string;
        order: number;
    }>;
}
