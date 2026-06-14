-- Migration 001: Advisory Agent support
-- Adds reason column to appointments and advisory_templates table

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason TEXT;

CREATE TABLE IF NOT EXISTS advisory_templates (
    id SERIAL PRIMARY KEY,
    specialization TEXT NOT NULL,
    category TEXT NOT NULL,
    condition_keywords TEXT[] NOT NULL DEFAULT '{}',
    content TEXT NOT NULL,
    priority INT DEFAULT 0
);
