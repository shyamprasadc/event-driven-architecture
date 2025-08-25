import { Pool } from 'pg';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import logger from '../utils/logger';

export class DatabaseConfig {
    private static postgresPool: Pool | null = null;
    private static redisClient: any = null;

    static async connectPostgreSQL(): Promise<Pool> {
        if (this.postgresPool) {
            return this.postgresPool;
        }

        const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

        this.postgresPool = new Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        try {
            await this.postgresPool.query('SELECT NOW()');
            logger.info('PostgreSQL connected successfully');
        } catch (error) {
            logger.error('PostgreSQL connection failed:', error);
            throw error;
        }

        return this.postgresPool;
    }

    static async connectMongoDB(): Promise<void> {
        try {
            await mongoose.connect(process.env.MONGODB_URI!);
            logger.info('MongoDB connected successfully');
        } catch (error) {
            logger.error('MongoDB connection failed:', error);
            throw error;
        }
    }

    static async connectRedis(): Promise<any> {
        if (this.redisClient) {
            return this.redisClient;
        }

        this.redisClient = createClient({
            url: process.env.REDIS_URL,
        });

        try {
            await this.redisClient.connect();
            logger.info('Redis connected successfully');
        } catch (error) {
            logger.error('Redis connection failed:', error);
            throw error;
        }

        return this.redisClient;
    }

    static async disconnect(): Promise<void> {
        try {
            if (this.postgresPool) {
                await this.postgresPool.end();
                this.postgresPool = null;
                logger.info('PostgreSQL disconnected');
            }

            if (this.redisClient) {
                await this.redisClient.disconnect();
                this.redisClient = null;
                logger.info('Redis disconnected');
            }

            if (mongoose.connection.readyState === 1) {
                await mongoose.disconnect();
                logger.info('MongoDB disconnected');
            }
        } catch (error) {
            logger.error('Error disconnecting databases:', error);
        }
    }

    static getPostgresPool(): Pool {
        if (!this.postgresPool) {
            throw new Error('PostgreSQL not connected. Call connectPostgreSQL() first.');
        }
        return this.postgresPool;
    }

    static getRedisClient(): any {
        if (!this.redisClient) {
            throw new Error('Redis not connected. Call connectRedis() first.');
        }
        return this.redisClient;
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Gracefully shutting down...');
    await DatabaseConfig.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Gracefully shutting down...');
    await DatabaseConfig.disconnect();
    process.exit(0);
});
