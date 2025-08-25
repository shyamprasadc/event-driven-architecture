import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import * as amqp from 'amqplib';

// Shared imports
import {
    PostgreSQLEventStore,
    RabbitMQEventBus,
    errorHandler,
    notFound,
    logger
} from '@ecommerce/shared';

// Inventory service imports
import { InventoryCommandHandlers } from './commands/handlers/InventoryCommandHandlers';
import { PostgreSQLEventStoreInventoryRepository } from './infrastructure/repositories/InventoryRepository';
import { InventoryController } from './api/controllers/InventoryController';
import { createInventoryRoutes } from './api/routes/inventoryRoutes';

class InventoryService {
    private app: express.Application;
    private port: number;
    private eventStore: PostgreSQLEventStore;
    private eventBus: RabbitMQEventBus;
    private inventoryRepository: PostgreSQLEventStoreInventoryRepository;
    private inventoryCommandHandlers: InventoryCommandHandlers;
    private inventoryController: InventoryController;

    constructor() {
        this.port = parseInt(process.env.INVENTORY_SERVICE_PORT || '3005');
        this.app = express();
        this.setupMiddleware();
        this.setupInfrastructure();
        this.setupHandlers();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private setupMiddleware(): void {
        // Security middleware
        this.app.use(helmet());
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.'
        });
        this.app.use('/api', limiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Compression
        this.app.use(compression());

        // Logging
        this.app.use(morgan('combined', {
            stream: {
                write: (message: string) => logger.info(message.trim())
            }
        }));
    }

    private async setupInfrastructure(): Promise<void> {
        try {
            // PostgreSQL connection for event store
            const postgresPool = new Pool({
                connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/eventstore',
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // MongoDB connection for read models
            const mongoClient = new MongoClient(process.env.MONGODB_URL || 'mongodb://admin:password@localhost:27017/ecommerce');
            await mongoClient.connect();
            const mongoDb = mongoClient.db();

            // Redis connection
            const redisClient = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });
            await redisClient.connect();

            // Initialize event store and event bus
            this.eventStore = new PostgreSQLEventStore(process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/eventstore');
            this.eventBus = new RabbitMQEventBus(
                process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
                process.env.REDIS_URL || 'redis://localhost:6379',
                'inventory-service'
            );

            // Initialize repositories
            this.inventoryRepository = new PostgreSQLEventStoreInventoryRepository(this.eventStore);

            // Connect to event bus
            await this.eventBus.connect();

            logger.info('Inventory service infrastructure initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize inventory service infrastructure', { error });
            throw error;
        }
    }

    private setupHandlers(): void {
        this.inventoryCommandHandlers = new InventoryCommandHandlers(
            this.inventoryRepository,
            this.eventBus
        );

        this.inventoryController = new InventoryController(
            this.inventoryCommandHandlers
        );

        logger.info('Inventory service handlers initialized successfully');
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                service: 'inventory-service',
                timestamp: new Date().toISOString()
            });
        });

        // API routes
        this.app.use('/api/inventory', createInventoryRoutes(this.inventoryController));

        logger.info('Inventory service routes initialized successfully');
    }

    private setupErrorHandling(): void {
        // 404 handler
        this.app.use(notFound);

        // Global error handler
        this.app.use(errorHandler);
    }

    public async start(): Promise<void> {
        try {
            this.app.listen(this.port, () => {
                logger.info(`Inventory service started on port ${this.port}`);
            });
        } catch (error) {
            logger.error('Failed to start inventory service', { error });
            throw error;
        }
    }

    public async stop(): Promise<void> {
        try {
            // Graceful shutdown logic here
            logger.info('Inventory service stopped');
        } catch (error) {
            logger.error('Error during inventory service shutdown', { error });
        }
    }
}

// Start the service
if (require.main === module) {
    const inventoryService = new InventoryService();

    inventoryService.start().catch((error) => {
        logger.error('Failed to start inventory service', { error });
        process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully');
        await inventoryService.stop();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down gracefully');
        await inventoryService.stop();
        process.exit(0);
    });
}

export default InventoryService;
