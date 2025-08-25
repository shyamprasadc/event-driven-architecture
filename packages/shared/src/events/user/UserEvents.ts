import { Event } from '../base/Event';

export class UserRegistered extends Event {
    constructor(
        aggregateId: string,
        data: {
            email: string;
            firstName: string;
            lastName: string;
            passwordHash: string;
        },
        metadata?: any
    ) {
        super('UserRegistered', aggregateId, data, metadata);
    }
}

export class UserProfileUpdated extends Event {
    constructor(
        aggregateId: string,
        data: {
            firstName?: string;
            lastName?: string;
            phone?: string;
            address?: {
                street: string;
                city: string;
                state: string;
                zipCode: string;
                country: string;
            };
        },
        metadata?: any
    ) {
        super('UserProfileUpdated', aggregateId, data, metadata);
    }
}

export class UserPasswordChanged extends Event {
    constructor(
        aggregateId: string,
        data: {
            passwordHash: string;
            changedAt: string;
        },
        metadata?: any
    ) {
        super('UserPasswordChanged', aggregateId, data, metadata);
    }
}

export class UserEmailVerified extends Event {
    constructor(
        aggregateId: string,
        data: {
            verifiedAt: string;
        },
        metadata?: any
    ) {
        super('UserEmailVerified', aggregateId, data, metadata);
    }
}

export class UserDeactivated extends Event {
    constructor(
        aggregateId: string,
        data: {
            reason?: string;
            deactivatedAt: string;
        },
        metadata?: any
    ) {
        super('UserDeactivated', aggregateId, data, metadata);
    }
}

export class UserReactivated extends Event {
    constructor(
        aggregateId: string,
        data: {
            reactivatedAt: string;
        },
        metadata?: any
    ) {
        super('UserReactivated', aggregateId, data, metadata);
    }
}

export class UserLoginAttempted extends Event {
    constructor(
        aggregateId: string,
        data: {
            success: boolean;
            ipAddress: string;
            userAgent: string;
            attemptedAt: string;
        },
        metadata?: any
    ) {
        super('UserLoginAttempted', aggregateId, data, metadata);
    }
}

export class UserAddressAdded extends Event {
    constructor(
        aggregateId: string,
        data: {
            addressId: string;
            address: {
                street: string;
                city: string;
                state: string;
                zipCode: string;
                country: string;
                isDefault: boolean;
            };
        },
        metadata?: any
    ) {
        super('UserAddressAdded', aggregateId, data, metadata);
    }
}

export class UserAddressUpdated extends Event {
    constructor(
        aggregateId: string,
        data: {
            addressId: string;
            address: {
                street?: string;
                city?: string;
                state?: string;
                zipCode?: string;
                country?: string;
                isDefault?: boolean;
            };
        },
        metadata?: any
    ) {
        super('UserAddressUpdated', aggregateId, data, metadata);
    }
}

export class UserAddressRemoved extends Event {
    constructor(
        aggregateId: string,
        data: {
            addressId: string;
        },
        metadata?: any
    ) {
        super('UserAddressRemoved', aggregateId, data, metadata);
    }
}
