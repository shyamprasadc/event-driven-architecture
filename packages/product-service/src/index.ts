import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

// Load environment variables
config();

// Import shared components
import {
    Database,
    PostgreSQLEventStore,
    RabbitMQEventBus,
    logger,
    errorHandler,
    asyncHandler,
} from '@ecommerce/shared';

// Import product service components
import { Product } from './domain/aggregates/Product';
import { ProductCommandHandlers } from './commands/handlers/ProductCommandHandlers';
import { ProductQueryHandlers } from './queries/handlers/ProductQueryHandlers';
import { EventSourcedProductRepository } from './infrastructure/repositories/ProductRepository';
import { ProductController } from './api/controllers/ProductController';
import { createProductRoutes } from './api/routes/productRoutes';

class ProductService {
    private app: express.Application;
    private database: Database;
    private eventStore: PostgreSQLEventStore;
    private eventBus: RabbitMQEventBus;
    private productRepository: EventSourcedProductRepository;
    private commandHandlers: ProductCommandHandlers;
    private queryHandlers: ProductQueryHandlers;
    private controller: ProductController;

    constructor() {
        this.app = express();
        this.initializeComponents();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private async initializeComponents(): Promise<void> {
        try {
            // Initialize database connections
            this.database = new Database();
            await this.database.connect();

            // Initialize event store
            this.eventStore = new PostgreSQLEventStore(process.env.POSTGRES_URL!);
            await this.eventStore.connect();

            // Initialize event bus
            this.eventBus = new RabbitMQEventBus(
                process.env.RABBITMQ_URL!,
                process.env.REDIS_URL!,
                'product-service'
            );
            await this.eventBus.connect();

            // Initialize repository
            this.productRepository = new EventSourcedProductRepository(this.eventStore);

            // Initialize handlers
            this.commandHandlers = new ProductCommandHandlers(this.productRepository, this.eventBus);
            this.queryHandlers = new ProductQueryHandlers(this.productRepository);

            // Initialize controller
            this.controller = new ProductController(this.commandHandlers, this.queryHandlers);

            logger.info('Product service components initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize product service components', { error });
            throw error;
        }
    }

    private setupMiddleware(): void {
        // Security middleware
        this.app.use(helmet());
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true,
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.',
        });
        this.app.use('/api/', limiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Compression
        this.app.use(compression());

        // Logging
        this.app.use(morgan('combined', {
            stream: {
                write: (message: string) => logger.info(message.trim()),
            },
        }));

        // Request logging
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path}`, {
                method: req.method,
                path: req.path,
                query: req.query,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            next();
        });
    }

    private setupRoutes(): void {
        // API routes
        this.app.use('/api/v1/products', createProductRoutes(this.controller));

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Product Service',
                version: '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString(),
            });
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                service: 'Product Service',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Route not found',
                path: req.originalUrl,
            });
        });
    }

    private setupErrorHandling(): void {
        // Global error handler
        this.app.use(errorHandler);

        // Unhandled promise rejection handler
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        // Uncaught exception handler
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });
    }

    public async start(): Promise<void> {
        const port = process.env.PRODUCT_SERVICE_PORT || 3002;

        try {
            this.app.listen(port, () => {
                logger.info(`Product service started on port ${port}`);
                logger.info(`Health check available at http://localhost:${port}/health`);
                logger.info(`API documentation available at http://localhost:${port}/api/v1/products`);
            });
        } catch (error) {
            logger.error('Failed to start product service', { error });
            throw error;
        }
    }

    public async stop(): Promise<void> {
        try {
            await this.eventBus.disconnect();
            await this.database.disconnect();
            logger.info('Product service stopped gracefully');
        } catch (error) {
            logger.error('Error stopping product service', { error });
        }
    }
}

// Start the service
const productService = new ProductService();

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await productService.stop();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await productService.stop();
    process.exit(0);
});

// Start the service
productService.start().catch((error) => {
    logger.error('Failed to start product service', { error });
    process.exit(1);
});
