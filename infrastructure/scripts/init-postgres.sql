-- PostgreSQL Event Store Initialization Script

-- Create event store tables
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    event_metadata JSONB NOT NULL,
    version INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_events_aggregate_id ON events(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_aggregate_version ON events(aggregate_id, version);

-- Create snapshots table for performance optimization
CREATE TABLE IF NOT EXISTS snapshots (
    id SERIAL PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL UNIQUE,
    aggregate_type VARCHAR(255) NOT NULL,
    snapshot_data JSONB NOT NULL,
    version INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate_id ON snapshots(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate_type ON snapshots(aggregate_type);

-- Create projections table for read models
CREATE TABLE IF NOT EXISTS projections (
    id SERIAL PRIMARY KEY,
    projection_name VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    projection_data JSONB NOT NULL,
    version INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for projections
CREATE INDEX IF NOT EXISTS idx_projections_name ON projections(projection_name);
CREATE INDEX IF NOT EXISTS idx_projections_aggregate_id ON projections(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_projections_name_aggregate ON projections(projection_name, aggregate_id);

-- Create event store functions
CREATE OR REPLACE FUNCTION get_events_by_aggregate_id(
    p_aggregate_id VARCHAR(255),
    p_from_version INTEGER DEFAULT 0
) RETURNS TABLE (
    id INTEGER,
    aggregate_id VARCHAR(255),
    event_type VARCHAR(255),
    event_data JSONB,
    event_metadata JSONB,
    version INTEGER,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.aggregate_id, e.event_type, e.event_data, e.event_metadata, e.version, e.created_at
    FROM events e
    WHERE e.aggregate_id = p_aggregate_id AND e.version > p_from_version
    ORDER BY e.version ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to save events with optimistic concurrency control
CREATE OR REPLACE FUNCTION save_events(
    p_aggregate_id VARCHAR(255),
    p_events JSONB,
    p_expected_version INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    event_record JSONB;
    current_version INTEGER;
BEGIN
    -- Get current version
    SELECT COALESCE(MAX(version), 0) INTO current_version
    FROM events
    WHERE aggregate_id = p_aggregate_id;
    
    -- Check optimistic concurrency
    IF current_version != p_expected_version THEN
        RETURN FALSE;
    END IF;
    
    -- Insert events
    FOR event_record IN SELECT * FROM jsonb_array_elements(p_events)
    LOOP
        INSERT INTO events (aggregate_id, event_type, event_data, event_metadata, version)
        VALUES (
            p_aggregate_id,
            event_record->>'eventType',
            event_record->'data',
            event_record->'metadata',
            (event_record->>'version')::INTEGER
        );
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
