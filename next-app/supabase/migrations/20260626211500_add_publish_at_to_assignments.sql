-- Add publish_at column to track scheduled publish times
ALTER TABLE assignments
ADD COLUMN publish_at TIMESTAMPTZ DEFAULT NULL;
