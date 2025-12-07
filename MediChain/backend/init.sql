-- MediChain Database Initialization Script
-- This script runs when the PostgreSQL container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application user with limited privileges (optional for prod)
-- CREATE USER medichain_app WITH PASSWORD 'app_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE medichain TO medichain;

-- Create schema
CREATE SCHEMA IF NOT EXISTS medichain;

-- Set search path
SET search_path TO medichain, public;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'MediChain database initialized successfully';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, vector, pg_trgm';
END $$;
