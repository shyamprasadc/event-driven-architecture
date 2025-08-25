import { Event } from './Event';
import * as amqp from 'amqplib';
import { createClient } from 'redis';

export interface EventHandler {
    (event: Event): Promise<void>;
}

export interface EventBus {
    publish(event: Event): Promise<void>;
    publishBatch(events: Event[]): Promise<void>;
    subscribe(eventType: string, handler: EventHandler): Promise<void>;
    unsubscribe(eventType: string, handler: EventHandler): Promise<void>;
}

export class RabbitMQEventBus implements EventBus {
    private connection: amqp.Connection | null = null;
    private channel: amqp.Channel | null = null;
    private handlers: Map<string, EventHandler[]> = new Map();
    private redisClient: any;

    constructor(
        private rabbitmqUrl: string,
        private redisUrl: string,
        private serviceName: string
    ) {
        this.redisClient = createClient({ url: redisUrl });
    }

    async connect(): Promise<void> {
        try {
            this.connection = await amqp.connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            // Connect to Redis
            await this.redisClient.connect();

            // Declare exchanges
            await this.channel.assertExchange('events', 'topic', { durable: true });
            await this.channel.assertExchange('commands', 'direct', { durable: true });

            // Declare queue for this service
            const queueName = `${this.serviceName}-events`;
            await this.channel.assertQueue(queueName, { durable: true });

            // Bind queue to events exchange with wildcard
            await this.channel.bindQueue(queueName, 'events', '#');

            // Start consuming messages
            await this.channel.consume(queueName, async (msg) => {
                if (msg) {
                    try {
                        const eventData = JSON.parse(msg.content.toString());
                        const event = Event.fromJSON(eventData);

                        await this.handleEvent(event);
                        this.channel?.ack(msg);
                    } catch (error) {
                        console.error('Error processing event:', error);
                        // Reject and requeue for retry
                        this.channel?.nack(msg, false, true);
                    }
                }
            });

            console.log(`EventBus connected for service: ${this.serviceName}`);
        } catch (error) {
            console.error('Failed to connect to RabbitMQ:', error);
            throw error;
        }
    }

    async publish(event: Event): Promise<void> {
        if (!this.channel) {
            throw new Error('EventBus not connected');
        }

        try {
            const eventJson = event.toJSON();
            const routingKey = event.eventType;

            await this.channel.publish(
                'events',
                routingKey,
                Buffer.from(JSON.stringify(eventJson)),
                { persistent: true }
            );

            // Store event in Redis for real-time streaming
            await this.redisClient.xAdd(
                'event-stream',
                '*',
                {
                    eventId: event.eventId,
                    eventType: event.eventType,
                    aggregateId: event.aggregateId,
                    data: JSON.stringify(event.data),
                    metadata: JSON.stringify(event.metadata),
                    timestamp: event.metadata.timestamp
                }
            );

            console.log(`Published event: ${event.eventType} for aggregate: ${event.aggregateId}`);
        } catch (error) {
            console.error('Error publishing event:', error);
            throw error;
        }
    }

    async publishBatch(events: Event[]): Promise<void> {
        if (!this.channel) {
            throw new Error('EventBus not connected');
        }

        try {
            await this.channel.assertExchange('events', 'topic', { durable: true });

            for (const event of events) {
                const eventJson = event.toJSON();
                const routingKey = event.eventType;

                await this.channel.publish(
                    'events',
                    routingKey,
                    Buffer.from(JSON.stringify(eventJson)),
                    { persistent: true }
                );

                // Store event in Redis for real-time streaming
                await this.redisClient.xAdd(
                    'event-stream',
                    '*',
                    {
                        eventId: event.eventId,
                        eventType: event.eventType,
                        aggregateId: event.aggregateId,
                        data: JSON.stringify(event.data),
                        metadata: JSON.stringify(event.metadata),
                        timestamp: event.metadata.timestamp
                    }
                );
            }

            console.log(`Published ${events.length} events in batch`);
        } catch (error) {
            console.error('Error publishing batch events:', error);
            throw error;
        }
    }

    async subscribe(eventType: string, handler: EventHandler): Promise<void> {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(handler);
        console.log(`Subscribed to event type: ${eventType}`);
    }

    async unsubscribe(eventType: string, handler: EventHandler): Promise<void> {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
                console.log(`Unsubscribed from event type: ${eventType}`);
            }
        }
    }

    private async handleEvent(event: Event): Promise<void> {
        const handlers = this.handlers.get(event.eventType) || [];

        for (const handler of handlers) {
            try {
                await handler(event);
            } catch (error) {
                console.error(`Error in event handler for ${event.eventType}:`, error);
                // Continue processing other handlers
            }
        }
    }

    async publishCommand(commandType: string, commandData: any, targetService: string): Promise<void> {
        if (!this.channel) {
            throw new Error('EventBus not connected');
        }

        try {
            const command = {
                id: require('uuid').v4(),
                type: commandType,
                data: commandData,
                timestamp: new Date().toISOString(),
                targetService
            };

            await this.channel.publish(
                'commands',
                targetService,
                Buffer.from(JSON.stringify(command)),
                { persistent: true }
            );

            console.log(`Published command: ${commandType} to service: ${targetService}`);
        } catch (error) {
            console.error('Error publishing command:', error);
            throw error;
        }
    }

    async subscribeToCommands(handler: (command: any) => Promise<void>): Promise<void> {
        if (!this.channel) {
            throw new Error('EventBus not connected');
        }

        try {
            const queueName = `${this.serviceName}-commands`;
            await this.channel.assertQueue(queueName, { durable: true });
            await this.channel.bindQueue(queueName, 'commands', this.serviceName);

            await this.channel.consume(queueName, async (msg) => {
                if (msg) {
                    try {
                        const command = JSON.parse(msg.content.toString());
                        await handler(command);
                        this.channel?.ack(msg);
                    } catch (error) {
                        console.error('Error processing command:', error);
                        this.channel?.nack(msg, false, true);
                    }
                }
            });

            console.log(`Subscribed to commands for service: ${this.serviceName}`);
        } catch (error) {
            console.error('Error subscribing to commands:', error);
            throw error;
        }
    }

    async getEventStream(fromId: string = '0', count: number = 100): Promise<any[]> {
        try {
            const events = await this.redisClient.xRead(
                { key: 'event-stream', id: fromId },
                { COUNT: count }
            );

            if (!events || events.length === 0) {
                return [];
            }

            return events[0].messages.map((msg: any) => ({
                id: msg.id,
                eventId: msg.message.eventId,
                eventType: msg.message.eventType,
                aggregateId: msg.message.aggregateId,
                data: JSON.parse(msg.message.data),
                metadata: JSON.parse(msg.message.metadata),
                timestamp: msg.message.timestamp
            }));
        } catch (error) {
            console.error('Error reading event stream:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            if (this.redisClient) {
                await this.redisClient.disconnect();
            }
            console.log('EventBus disconnected');
        } catch (error) {
            console.error('Error disconnecting EventBus:', error);
        }
    }
}
