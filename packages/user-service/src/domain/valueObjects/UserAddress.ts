export interface UserAddressData {
    id: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
    label?: string; // e.g., "Home", "Work", "Shipping"
}

export class UserAddress {
    private readonly id: string;
    private readonly street: string;
    private readonly city: string;
    private readonly state: string;
    private readonly zipCode: string;
    private readonly country: string;
    private readonly isDefault: boolean;
    private readonly label?: string;

    constructor(data: UserAddressData) {
        this.validate(data);

        this.id = data.id;
        this.street = data.street;
        this.city = data.city;
        this.state = data.state;
        this.zipCode = data.zipCode;
        this.country = data.country;
        this.isDefault = data.isDefault;
        this.label = data.label;
    }

    private validate(data: UserAddressData): void {
        if (!data.street || data.street.trim().length === 0) {
            throw new Error('Street address is required');
        }

        if (!data.city || data.city.trim().length === 0) {
            throw new Error('City is required');
        }

        if (!data.state || data.state.trim().length === 0) {
            throw new Error('State is required');
        }

        if (!data.zipCode || data.zipCode.trim().length === 0) {
            throw new Error('ZIP code is required');
        }

        if (!data.country || data.country.trim().length === 0) {
            throw new Error('Country is required');
        }

        if (data.street.length > 200) {
            throw new Error('Street address cannot exceed 200 characters');
        }

        if (data.city.length > 100) {
            throw new Error('City cannot exceed 100 characters');
        }

        if (data.state.length > 100) {
            throw new Error('State cannot exceed 100 characters');
        }

        if (data.zipCode.length > 20) {
            throw new Error('ZIP code cannot exceed 20 characters');
        }

        if (data.country.length > 100) {
            throw new Error('Country cannot exceed 100 characters');
        }
    }

    getId(): string {
        return this.id;
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

    isDefaultAddress(): boolean {
        return this.isDefault;
    }

    getLabel(): string | undefined {
        return this.label;
    }

    getFullAddress(): string {
        return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`;
    }

    toJSON(): UserAddressData {
        return {
            id: this.id,
            street: this.street,
            city: this.city,
            state: this.state,
            zipCode: this.zipCode,
            country: this.country,
            isDefault: this.isDefault,
            label: this.label,
        };
    }

    static fromJSON(data: UserAddressData): UserAddress {
        return new UserAddress(data);
    }
}
