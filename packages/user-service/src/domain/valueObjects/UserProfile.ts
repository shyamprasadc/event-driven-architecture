export interface UserProfileData {
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    avatar?: string;
}

export class UserProfile {
    private readonly firstName: string;
    private readonly lastName: string;
    private readonly phone?: string;
    private readonly dateOfBirth?: string;
    private readonly gender?: 'male' | 'female' | 'other';
    private readonly avatar?: string;

    constructor(data: UserProfileData) {
        this.validate(data);

        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.phone = data.phone;
        this.dateOfBirth = data.dateOfBirth;
        this.gender = data.gender;
        this.avatar = data.avatar;
    }

    private validate(data: UserProfileData): void {
        if (!data.firstName || data.firstName.trim().length === 0) {
            throw new Error('First name is required');
        }

        if (!data.lastName || data.lastName.trim().length === 0) {
            throw new Error('Last name is required');
        }

        if (data.firstName.length > 50) {
            throw new Error('First name cannot exceed 50 characters');
        }

        if (data.lastName.length > 50) {
            throw new Error('Last name cannot exceed 50 characters');
        }

        if (data.phone && !this.isValidPhone(data.phone)) {
            throw new Error('Invalid phone number format');
        }

        if (data.dateOfBirth && !this.isValidDate(data.dateOfBirth)) {
            throw new Error('Invalid date of birth format');
        }
    }

    private isValidPhone(phone: string): boolean {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    private isValidDate(date: string): boolean {
        const dateObj = new Date(date);
        return !isNaN(dateObj.getTime()) && dateObj <= new Date();
    }

    getFullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    getFirstName(): string {
        return this.firstName;
    }

    getLastName(): string {
        return this.lastName;
    }

    getPhone(): string | undefined {
        return this.phone;
    }

    getDateOfBirth(): string | undefined {
        return this.dateOfBirth;
    }

    getGender(): 'male' | 'female' | 'other' | undefined {
        return this.gender;
    }

    getAvatar(): string | undefined {
        return this.avatar;
    }

    toJSON(): UserProfileData {
        return {
            firstName: this.firstName,
            lastName: this.lastName,
            phone: this.phone,
            dateOfBirth: this.dateOfBirth,
            gender: this.gender,
            avatar: this.avatar,
        };
    }

    static fromJSON(data: UserProfileData): UserProfile {
        return new UserProfile(data);
    }
}
