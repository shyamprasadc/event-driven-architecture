import Joi from 'joi';

export interface ProductPriceData {
    amount: number;
    currency: string;
    compareAtPrice?: number;
    discountPercentage?: number;
}

export class ProductPrice {
    private readonly amount: number;
    private readonly currency: string;
    private readonly compareAtPrice?: number;
    private readonly discountPercentage?: number;

    constructor(data: ProductPriceData) {
        const { error } = ProductPrice.schema.validate(data);
        if (error) {
            throw new Error(`Invalid product price: ${error.message}`);
        }

        this.amount = data.amount;
        this.currency = data.currency;
        this.compareAtPrice = data.compareAtPrice;
        this.discountPercentage = data.discountPercentage;
    }

    static get schema(): Joi.ObjectSchema {
        return Joi.object({
            amount: Joi.number().positive().precision(2).required(),
            currency: Joi.string().length(3).uppercase().required(),
            compareAtPrice: Joi.number().positive().precision(2).optional(),
            discountPercentage: Joi.number().min(0).max(100).precision(2).optional(),
        });
    }

    getAmount(): number {
        return this.amount;
    }

    getCurrency(): string {
        return this.currency;
    }

    getCompareAtPrice(): number | undefined {
        return this.compareAtPrice;
    }

    getDiscountPercentage(): number | undefined {
        return this.discountPercentage;
    }

    isOnSale(): boolean {
        return this.compareAtPrice !== undefined && this.amount < this.compareAtPrice;
    }

    getDiscountedAmount(): number {
        if (this.discountPercentage) {
            return this.amount * (1 - this.discountPercentage / 100);
        }
        return this.amount;
    }

    getSavingsAmount(): number {
        if (this.compareAtPrice && this.amount < this.compareAtPrice) {
            return this.compareAtPrice - this.amount;
        }
        return 0;
    }

    toJSON(): ProductPriceData {
        return {
            amount: this.amount,
            currency: this.currency,
            compareAtPrice: this.compareAtPrice,
            discountPercentage: this.discountPercentage,
        };
    }

    static fromJSON(data: ProductPriceData): ProductPrice {
        return new ProductPrice(data);
    }
}
