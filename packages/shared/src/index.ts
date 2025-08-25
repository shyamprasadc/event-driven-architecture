// Base Event Infrastructure
export { Event, EventMetadata, EventData } from './events/base/Event';
export { EventStore, PostgreSQLEventStore, StoredEvent } from './events/base/EventStore';
export { EventBus, RabbitMQEventBus, EventHandler } from './events/base/EventBus';

// User Events
export {
    UserRegistered,
    UserProfileUpdated,
    UserPasswordChanged,
    UserEmailVerified,
    UserDeactivated,
    UserReactivated,
    UserLoginAttempted,
    UserAddressAdded,
    UserAddressUpdated,
    UserAddressRemoved
} from './events/user/UserEvents';

// Product Events
export {
    ProductCreated,
    ProductUpdated,
    ProductPriceChanged,
    ProductDiscontinued,
    ProductReactivated,
    ProductStockUpdated,
    ProductCategoryChanged,
    ProductImageAdded,
    ProductImageRemoved,
    ProductAttributeUpdated
} from './events/product/ProductEvents';

// Order Events
export {
    OrderCreated,
    OrderConfirmed,
    OrderPaymentRequested,
    OrderPaid,
    OrderPaymentFailed,
    OrderShipped,
    OrderDelivered,
    OrderCancelled,
    OrderRefunded,
    OrderItemUpdated,
    OrderItemRemoved,
    OrderStatusChanged,
    OrderAddressUpdated
} from './events/order/OrderEvents';

// Payment Events
export {
    PaymentRequested,
    PaymentProcessed,
    PaymentFailed,
    PaymentRefunded,
    PaymentCancelled
} from './events/payment/PaymentEvents';

// Middleware
export { errorHandler, notFound, asyncHandler, CustomError, AppError } from './middleware/errorHandler';
export { protect, authorize, generateToken, verifyToken, AuthRequest } from './middleware/auth';

// Inventory Events
export {
    InventoryItemCreated,
    StockUpdated,
    StockReserved,
    StockReleased,
    StockAllocated,
    LowStockAlert,
    OutOfStockAlert,
    InventoryThresholdUpdated
} from './events/inventory/InventoryEvents';

// Utilities
export { default as logger } from './utils/logger';

// Database Configuration
export { DatabaseConfig } from './config/database';
