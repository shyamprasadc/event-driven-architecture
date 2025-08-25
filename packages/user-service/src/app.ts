import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

// Load environment variables
config();

// Import shared utilities
import {
    errorHandler,
    notFound,
    DatabaseConfig,
    RabbitMQEventBus,
    PostgreSQLEventStore,
    logger
} from '@ecommerce/shared';

// Import domain and infrastructure
import { UserCommandHandlers } from './commands/handlers/UserCommandHandlers';
import { UserQueryHandlers } from './queries/handlers/UserQueryHandlers';
import { EventSourcedUserRepository } from './infrastructure/repositories/UserRepository';
import { UserController } from './api/controllers/UserController';
import { userRoutes } from './api/routes/userRoutes';

class UserService {
    private app: express.Application;
    private eventBus: RabbitMQEventBus;
    private eventStore: PostgreSQLEventStore;
    private userRepository: EventSourcedUserRepository;
    private commandHandlers: UserCommandHandlers;
    private queryHandlers: UserQueryHandlers;
    private userController: UserController;

    constructor() {
        this.app = express();
        this.initializeServices();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private async initializeServices(): Promise<void> {
        try {
            // Initialize databases
            await DatabaseConfig.connectPostgreSQL();
            await DatabaseConfig.connectMongoDB();
            await DatabaseConfig.connectRedis();

            // Initialize event store
            const postgresConnectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
            this.eventStore = new PostgreSQLEventStore(postgresConnectionString);

            // Initialize event bus
            this.eventBus = new RabbitMQEventBus(
                process.env.RABBITMQ_URL!,
                process.env.REDIS_URL!,
                'user-service'
            );
            await this.eventBus.connect();

            // Initialize repositories
            this.userRepository = new EventSourcedUserRepository(this.eventStore);

            // Initialize handlers
            this.commandHandlers = new UserCommandHandlers(this.userRepository, this.eventBus);
            this.queryHandlers = new UserQueryHandlers(this.userRepository);

            // Initialize controllers
            this.userController = new UserController(this.commandHandlers, this.queryHandlers);

            logger.info('User service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize user service:', error);
            throw error;
        }
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
        this.app.use('/api/', limiter);

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Compression middleware
        this.app.use(compression());

        // Logging middleware
        this.app.use(morgan('combined', {
            stream: {
                write: (message: string) => logger.info(message.trim())
            }
        }));

        // Request logging
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
            next();
        });
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', this.userController.health);

        // API routes
        this.app.use('/api/users', userRoutes(this.userController));

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: 'User Service',
                version: '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString()
            });
        });
    }

    private setupErrorHandling(): void {
        // 404 handler
        this.app.use(notFound);

        // Global error handler
        this.app.use(errorHandler);

        // Graceful shutdown
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('SIGINT', this.gracefulShutdown.bind(this));
    }

    private async gracefulShutdown(): Promise<void> {
        logger.info('Received shutdown signal, starting graceful shutdown...');

        try {
            // Close event bus connection
            if (this.eventBus) {
                await this.eventBus.disconnect();
            }

            // Close database connections
            await DatabaseConfig.disconnect();

            logger.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    }

    public start(): void {
        const port = process.env.USER_SERVICE_PORT || 3001;

        this.app.listen(port, () => {
            logger.info(`User service started on port ${port}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }

    public getApp(): express.Application {
        return this.app;
    }
}

// Start the service
if (require.main === module) {
    const userService = new UserService();
    userService.start();
}

export default UserService;
