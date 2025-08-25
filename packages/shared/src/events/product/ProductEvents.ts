import { Event } from '../base/Event';

// Product Creation Events
export class ProductCreated extends Event {
    constructor(
        aggregateId: string,
        data: {
            name: string;
            description: string;
            price: number;
            categoryId: string;
            sku: string;
            images: string[];
            attributes: Record<string, any>;
            isActive: boolean;
        }
    ) {
        super('ProductCreated', aggregateId, data);
    }
}

export class ProductUpdated extends Event {
    constructor(
        aggregateId: string,
        data: {
            name?: string;
            description?: string;
            price?: number;
            categoryId?: string;
            images?: string[];
            attributes?: Record<string, any>;
            isActive?: boolean;
        }
    ) {
        super('ProductUpdated', aggregateId, data);
    }
}

export class ProductPriceChanged extends Event {
    constructor(
        aggregateId: string,
        data: {
            oldPrice: number;
            newPrice: number;
            reason?: string;
        }
    ) {
        super('ProductPriceChanged', aggregateId, data);
    }
}

export class ProductDiscontinued extends Event {
    constructor(
        aggregateId: string,
        data: {
            reason?: string;
            discontinuedAt: Date;
        }
    ) {
        super('ProductDiscontinued', aggregateId, data);
    }
}

export class ProductReactivated extends Event {
    constructor(
        aggregateId: string,
        data: {
            reactivatedAt: Date;
        }
    ) {
        super('ProductReactivated', aggregateId, data);
    }
}

export class ProductStockUpdated extends Event {
    constructor(
        aggregateId: string,
        data: {
            oldStock: number;
            newStock: number;
            changeReason: string;
        }
    ) {
        super('ProductStockUpdated', aggregateId, data);
    }
}

export class ProductCategoryChanged extends Event {
    constructor(
        aggregateId: string,
        data: {
            oldCategoryId: string;
            newCategoryId: string;
        }
    ) {
        super('ProductCategoryChanged', aggregateId, data);
    }
}

export class ProductImageAdded extends Event {
    constructor(
        aggregateId: string,
        data: {
            imageUrl: string;
            isPrimary: boolean;
        }
    ) {
        super('ProductImageAdded', aggregateId, data);
    }
}

export class ProductImageRemoved extends Event {
    constructor(
        aggregateId: string,
        data: {
            imageUrl: string;
        }
    ) {
        super('ProductImageRemoved', aggregateId, data);
    }
}

export class ProductAttributeUpdated extends Event {
    constructor(
        aggregateId: string,
        data: {
            attributeKey: string;
            oldValue: any;
            newValue: any;
        }
    ) {
        super('ProductAttributeUpdated', aggregateId, data);
    }
}
