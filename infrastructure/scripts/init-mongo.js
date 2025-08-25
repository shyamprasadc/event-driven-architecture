// MongoDB Read Models Initialization Script

// Switch to ecommerce database
db = db.getSiblingDB('ecommerce');

// Create collections for read models
db.createCollection('users');
db.createCollection('products');
db.createCollection('orders');
db.createCollection('payments');
db.createCollection('inventory');

// Create indexes for efficient querying

// Users collection indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "status": 1 });
db.users.createIndex({ "createdAt": -1 });
db.users.createIndex({ "role": 1 });

// Products collection indexes
db.products.createIndex({ "sku": 1 }, { unique: true });
db.products.createIndex({ "categoryId": 1 });
db.products.createIndex({ "status": 1 });
db.products.createIndex({ "price": 1 });
db.products.createIndex({ "createdAt": -1 });
db.products.createIndex({ "name": "text", "description": "text" });

// Orders collection indexes
db.orders.createIndex({ "userId": 1 });
db.orders.createIndex({ "status": 1 });
db.orders.createIndex({ "createdAt": -1 });
db.orders.createIndex({ "paymentId": 1 });
db.orders.createIndex({ "totalAmount": 1 });

// Payments collection indexes
db.payments.createIndex({ "orderId": 1 });
db.payments.createIndex({ "userId": 1 });
db.payments.createIndex({ "status": 1 });
db.payments.createIndex({ "createdAt": -1 });
db.payments.createIndex({ "transactionId": 1 });

// Inventory collection indexes
db.inventory.createIndex({ "productId": 1 }, { unique: true });
db.inventory.createIndex({ "sku": 1 }, { unique: true });
db.inventory.createIndex({ "currentStock": 1 });
db.inventory.createIndex({ "isLowStock": 1 });
db.inventory.createIndex({ "isOutOfStock": 1 });

// Create compound indexes for common queries
db.orders.createIndex({ "userId": 1, "status": 1 });
db.orders.createIndex({ "userId": 1, "createdAt": -1 });
db.products.createIndex({ "categoryId": 1, "status": 1 });
db.products.createIndex({ "price": 1, "status": 1 });

// Create TTL indexes for temporary data
db.orders.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

// Create capped collections for event streams (optional)
db.createCollection('event_streams', { capped: true, size: 10000000 });

// Insert sample data for testing (optional)
if (db.users.countDocuments() === 0) {
    db.users.insertOne({
        _id: ObjectId(),
        email: "admin@example.com",
        password: "$2b$10$hashedpassword",
        role: "admin",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    });
}

if (db.products.countDocuments() === 0) {
    db.products.insertOne({
        _id: ObjectId(),
        name: "Sample Product",
        sku: "SAMPLE-001",
        description: "A sample product for testing",
        price: 99.99,
        categoryId: "electronics",
        status: "active",
        stock: 100,
        createdAt: new Date(),
        updatedAt: new Date()
    });
}

print("MongoDB initialization completed successfully!");
