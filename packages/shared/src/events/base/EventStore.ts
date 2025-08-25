import { Event } from './Event';
import { Pool, PoolClient } from 'pg';

export interface StoredEvent {
    id: string;
    aggregateId: string;
    eventType: string;
    eventData: any;
    metadata: any;
    version: number;
    timestamp: Date;
}

export interface EventStore {
    saveEvents(aggregateId: string, events: Event[], expectedVersion: number): Promise<void>;
    getEvents(aggregateId: string, fromVersion?: number): Promise<StoredEvent[]>;
    getAllEvents(fromPosition?: number, limit?: number): Promise<StoredEvent[]>;
    getEventsByType(eventType: string, fromPosition?: number, limit?: number): Promise<StoredEvent[]>;
}

export class PostgreSQLEventStore implements EventStore {
    private pool: Pool;

    constructor(connectionString: string) {
        this.pool = new Pool({ connectionString });
        this.initializeTables();
    }

    private async initializeTables(): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query(`
        CREATE TABLE IF NOT EXISTS events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          aggregate_id VARCHAR(255) NOT NULL,
          event_type VARCHAR(255) NOT NULL,
          event_data JSONB NOT NULL,
          metadata JSONB NOT NULL,
          version INTEGER NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_events_aggregate_id ON events(aggregate_id);
        CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_events_version ON events(version);
        
        CREATE TABLE IF NOT EXISTS snapshots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          aggregate_id VARCHAR(255) NOT NULL,
          aggregate_type VARCHAR(255) NOT NULL,
          snapshot_data JSONB NOT NULL,
          version INTEGER NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(aggregate_id, version)
        );
        
        CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate_id ON snapshots(aggregate_id);
      `);
        } finally {
            client.release();
        }
    }

    async saveEvents(aggregateId: string, events: Event[], expectedVersion: number): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Check current version
            const currentVersionResult = await client.query(
                'SELECT COALESCE(MAX(version), 0) as current_version FROM events WHERE aggregate_id = $1',
                [aggregateId]
            );
            const currentVersion = parseInt(currentVersionResult.rows[0].current_version);

            if (currentVersion !== expectedVersion) {
                throw new Error(`Concurrency conflict: expected version ${expectedVersion}, but current version is ${currentVersion}`);
            }

            // Insert events
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const version = expectedVersion + i + 1;

                await client.query(
                    `INSERT INTO events (aggregate_id, event_type, event_data, metadata, version)
           VALUES ($1, $2, $3, $4, $5)`,
                    [
                        aggregateId,
                        event.eventType,
                        JSON.stringify(event.data),
                        JSON.stringify(event.metadata),
                        version
                    ]
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getEvents(aggregateId: string, fromVersion: number = 0): Promise<StoredEvent[]> {
        const result = await this.pool.query(
            `SELECT id, aggregate_id, event_type, event_data, metadata, version, timestamp
       FROM events 
       WHERE aggregate_id = $1 AND version > $2
       ORDER BY version ASC`,
            [aggregateId, fromVersion]
        );

        return result.rows.map(row => ({
            id: row.id,
            aggregateId: row.aggregate_id,
            eventType: row.event_type,
            eventData: row.event_data,
            metadata: row.metadata,
            version: row.version,
            timestamp: row.timestamp
        }));
    }

    async getAllEvents(fromPosition: number = 0, limit: number = 100): Promise<StoredEvent[]> {
        const result = await this.pool.query(
            `SELECT id, aggregate_id, event_type, event_data, metadata, version, timestamp
       FROM events 
       WHERE id > $1
       ORDER BY timestamp ASC, version ASC
       LIMIT $2`,
            [fromPosition, limit]
        );

        return result.rows.map(row => ({
            id: row.id,
            aggregateId: row.aggregate_id,
            eventType: row.event_type,
            eventData: row.event_data,
            metadata: row.metadata,
            version: row.version,
            timestamp: row.timestamp
        }));
    }

    async getEventsByType(eventType: string, fromPosition: number = 0, limit: number = 100): Promise<StoredEvent[]> {
        const result = await this.pool.query(
            `SELECT id, aggregate_id, event_type, event_data, metadata, version, timestamp
       FROM events 
       WHERE event_type = $1 AND id > $2
       ORDER BY timestamp ASC, version ASC
       LIMIT $3`,
            [eventType, fromPosition, limit]
        );

        return result.rows.map(row => ({
            id: row.id,
            aggregateId: row.aggregate_id,
            eventType: row.event_type,
            eventData: row.event_data,
            metadata: row.metadata,
            version: row.version,
            timestamp: row.timestamp
        }));
    }

    async saveSnapshot(aggregateId: string, aggregateType: string, snapshotData: any, version: number): Promise<void> {
        await this.pool.query(
            `INSERT INTO snapshots (aggregate_id, aggregate_type, snapshot_data, version)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (aggregate_id, version) DO UPDATE SET
         snapshot_data = EXCLUDED.snapshot_data,
         timestamp = NOW()`,
            [aggregateId, aggregateType, JSON.stringify(snapshotData), version]
        );
    }

    async getLatestSnapshot(aggregateId: string): Promise<{ snapshotData: any; version: number } | null> {
        const result = await this.pool.query(
            `SELECT snapshot_data, version
       FROM snapshots 
       WHERE aggregate_id = $1
       ORDER BY version DESC
       LIMIT 1`,
            [aggregateId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return {
            snapshotData: result.rows[0].snapshot_data,
            version: result.rows[0].version
        };
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
