import Joi from 'joi';

export interface OrderAddressData {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
    email?: string;
}

export class OrderAddress {
    private readonly street: string;
    private readonly city: string;
    private readonly state: string;
    private readonly zipCode: string;
    private readonly country: string;
    private readonly phone?: string;
    private readonly email?: string;

    constructor(data: OrderAddressData) {
        const { error } = OrderAddress.schema.validate(data);
        if (error) {
            throw new Error(`Invalid order address: ${error.message}`);
        }

        this.street = data.street;
        this.city = data.city;
        this.state = data.state;
        this.zipCode = data.zipCode;
        this.country = data.country;
        this.phone = data.phone;
        this.email = data.email;
    }

    static get schema(): Joi.ObjectSchema {
        return Joi.object({
            street: Joi.string().min(1).max(255).required(),
            city: Joi.string().min(1).max(100).required(),
            state: Joi.string().min(1).max(100).required(),
            zipCode: Joi.string().min(1).max(20).required(),
            country: Joi.string().min(1).max(100).required(),
            phone: Joi.string().max(20).optional(),
            email: Joi.string().email().optional(),
        });
    }

    getStreet(): string {
        return this.street;
    }

    getCity(): string {
        return this.city;
    }

    getState(): string {
        return this.state;
    }

    getZipCode(): string {
        return this.zipCode;
    }

    getCountry(): string {
        return this.country;
    }

    getPhone(): string | undefined {
        return this.phone;
    }

    getEmail(): string | undefined {
        return this.email;
    }

    getFullAddress(): string {
        const parts = [
            this.street,
            this.city,
            this.state,
            this.zipCode,
            this.country,
        ].filter(Boolean);
        return parts.join(', ');
    }

    toJSON(): OrderAddressData {
        return {
            street: this.street,
            city: this.city,
            state: this.state,
            zipCode: this.zipCode,
            country: this.country,
            phone: this.phone,
            email: this.email,
        };
    }

    static fromJSON(data: OrderAddressData): OrderAddress {
        return new OrderAddress(data);
    }
}
