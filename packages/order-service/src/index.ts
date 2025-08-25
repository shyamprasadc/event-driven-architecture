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

// Order service imports
import { OrderCommandHandlers } from './commands/handlers/OrderCommandHandlers';
import { OrderQueryHandlers } from './queries/handlers/OrderQueryHandlers';
import { PostgreSQLEventStoreOrderRepository } from './infrastructure/repositories/OrderRepository';
import { MongoDBOrderProjection } from './infrastructure/projections/OrderProjection';
import { OrderController } from './api/controllers/OrderController';
import { createOrderRoutes } from './api/routes/orderRoutes';

class OrderService {
    private app: express.Application;
    private port: number;
    private eventStore: PostgreSQLEventStore;
    private eventBus: RabbitMQEventBus;
    private orderRepository: PostgreSQLEventStoreOrderRepository;
    private orderProjection: MongoDBOrderProjection;
    private orderCommandHandlers: OrderCommandHandlers;
    private orderQueryHandlers: OrderQueryHandlers;
    private orderController: OrderController;

    constructor() {
        this.port = parseInt(process.env.ORDER_SERVICE_PORT || '3003');
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
                'order-service'
            );

            // Initialize repositories and projections
            this.orderRepository = new PostgreSQLEventStoreOrderRepository(this.eventStore);
            this.orderProjection = new MongoDBOrderProjection(mongoDb);

            // Connect to event bus
            await this.eventBus.connect();

            logger.info('Order service infrastructure initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize order service infrastructure', { error });
            throw error;
        }
    }

    private setupHandlers(): void {
        this.orderCommandHandlers = new OrderCommandHandlers(
            this.orderRepository,
            this.eventBus
        );

        this.orderQueryHandlers = new OrderQueryHandlers(
            this.orderRepository,
            this.orderProjection
        );

        this.orderController = new OrderController(
            this.orderCommandHandlers,
            this.orderQueryHandlers
        );

        logger.info('Order service handlers initialized successfully');
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                service: 'order-service',
                timestamp: new Date().toISOString()
            });
        });

        // API routes
        this.app.use('/api/orders', createOrderRoutes(this.orderController));

        logger.info('Order service routes initialized successfully');
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
                logger.info(`Order service started on port ${this.port}`);
            });
        } catch (error) {
            logger.error('Failed to start order service', { error });
            throw error;
        }
    }

    public async stop(): Promise<void> {
        try {
            // Graceful shutdown logic here
            logger.info('Order service stopped');
        } catch (error) {
            logger.error('Error during order service shutdown', { error });
        }
    }
}

// Start the service
if (require.main === module) {
    const orderService = new OrderService();

    orderService.start().catch((error) => {
        logger.error('Failed to start order service', { error });
        process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully');
        await orderService.stop();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down gracefully');
        await orderService.stop();
        process.exit(0);
    });
}

export default OrderService;
