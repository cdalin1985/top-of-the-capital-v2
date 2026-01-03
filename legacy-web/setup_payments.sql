-- Add payment tracking columns to the matches table
ALTER TABLE matches 
ADD COLUMN p1_paid boolean DEFAULT false,
ADD COLUMN p2_paid boolean DEFAULT false;

-- Optional: Add a comment or verify
COMMENT ON COLUMN matches.p1_paid IS 'Tracks if the challenger has paid the entry fee';
COMMENT ON COLUMN matches.p2_paid IS 'Tracks if the target/opponent has paid the entry fee';
