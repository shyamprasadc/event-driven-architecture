import { v4 as uuidv4 } from 'uuid';

export interface EventMetadata {
    timestamp: string;
    version: number;
    userId?: string;
    correlationId?: string;
    causationId?: string;
    [key: string]: any;
}

export interface EventData {
    [key: string]: any;
}

export abstract class Event {
    public readonly eventId: string;
    public readonly eventType: string;
    public readonly aggregateId: string;
    public readonly data: EventData;
    public readonly metadata: EventMetadata;

    constructor(
        eventType: string,
        aggregateId: string,
        data: EventData = {},
        metadata: Partial<EventMetadata> = {}
    ) {
        this.eventId = uuidv4();
        this.eventType = eventType;
        this.aggregateId = aggregateId;
        this.data = data;
        this.metadata = {
            timestamp: new Date().toISOString(),
            version: 1,
            ...metadata
        };
    }

    public static fromJSON(json: any): Event {
        const event = new (this as any)(
            json.eventType,
            json.aggregateId,
            json.data,
            json.metadata
        );
        event.eventId = json.eventId;
        return event;
    }

    public toJSON(): any {
        return {
            eventId: this.eventId,
            eventType: this.eventType,
            aggregateId: this.aggregateId,
            data: this.data,
            metadata: this.metadata
        };
    }

    public getTimestamp(): Date {
        return new Date(this.metadata.timestamp);
    }

    public getVersion(): number {
        return this.metadata.version;
    }

    public getCorrelationId(): string | undefined {
        return this.metadata.correlationId;
    }

    public getCausationId(): string | undefined {
        return this.metadata.causationId;
    }
}
