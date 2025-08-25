import Joi from 'joi';

export interface ProductAttribute {
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    displayName?: string;
    unit?: string;
}

export interface ProductAttributesData {
    attributes: ProductAttribute[];
}

export class ProductAttributes {
    private readonly attributes: Map<string, ProductAttribute>;

    constructor(data: ProductAttributesData) {
        const { error } = ProductAttributes.schema.validate(data);
        if (error) {
            throw new Error(`Invalid product attributes: ${error.message}`);
        }

        this.attributes = new Map();
        data.attributes.forEach(attr => {
            this.attributes.set(attr.key, attr);
        });
    }

    static get schema(): Joi.ObjectSchema {
        return Joi.object({
            attributes: Joi.array().items(
                Joi.object({
                    key: Joi.string().required(),
                    value: Joi.any().required(),
                    type: Joi.string().valid('string', 'number', 'boolean', 'array', 'object').required(),
                    displayName: Joi.string().optional(),
                    unit: Joi.string().optional(),
                })
            ).required(),
        });
    }

    getAttribute(key: string): ProductAttribute | undefined {
        return this.attributes.get(key);
    }

    getAttributeValue(key: string): any {
        const attr = this.attributes.get(key);
        return attr ? attr.value : undefined;
    }

    setAttribute(key: string, value: any, type: ProductAttribute['type'], displayName?: string, unit?: string): void {
        this.attributes.set(key, {
            key,
            value,
            type,
            displayName,
            unit,
        });
    }

    removeAttribute(key: string): boolean {
        return this.attributes.delete(key);
    }

    hasAttribute(key: string): boolean {
        return this.attributes.has(key);
    }

    getAllAttributes(): ProductAttribute[] {
        return Array.from(this.attributes.values());
    }

    getAttributesByType(type: ProductAttribute['type']): ProductAttribute[] {
        return Array.from(this.attributes.values()).filter(attr => attr.type === type);
    }

    getStringAttributes(): Record<string, string> {
        const result: Record<string, string> = {};
        this.getAttributesByType('string').forEach(attr => {
            result[attr.key] = attr.value;
        });
        return result;
    }

    getNumericAttributes(): Record<string, number> {
        const result: Record<string, number> = {};
        this.getAttributesByType('number').forEach(attr => {
            result[attr.key] = attr.value;
        });
        return result;
    }

    getBooleanAttributes(): Record<string, boolean> {
        const result: Record<string, boolean> = {};
        this.getAttributesByType('boolean').forEach(attr => {
            result[attr.key] = attr.value;
        });
        return result;
    }

    toJSON(): ProductAttributesData {
        return {
            attributes: this.getAllAttributes(),
        };
    }

    static fromJSON(data: ProductAttributesData): ProductAttributes {
        return new ProductAttributes(data);
    }
}
