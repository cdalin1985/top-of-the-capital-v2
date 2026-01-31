-- SQL Migration to import legacy players into TOC1
-- Generating unique IDs for ghost profiles
DO $$ 
DECLARE 
    player_record RECORD;
    i INTEGER := 1;
BEGIN
    -- Temporary table to hold sorted players
    CREATE TEMP TABLE temp_players (
        name TEXT,
        rating INTEGER
    );

    -- Insert provided data (Top tier)
    INSERT INTO temp_players VALUES 
    ('Dan Hamper', 637), ('Frank Kincl', 626), ('David Smith', 616), 
    ('Mike Paliga', 586), ('Dave Alderman', 580), ('Josh Fava', 572), 
    ('Timmy Squires', 558), ('Chase Dalin', 540), ('Randy Hoag', 512), 
    ('Jerry Sabol', 502), ('Kurt Kubicka', 492), ('Zach Ledesma', 492),
    ('Steve Adsem', 487), ('Walter Ryan Isenhour', 478), ('Nate Welch', 476),
    ('Thomas E. Kingston', 475), ('Mike Zahn', 473), ('Christina Talbot', 469),
    ('Josh Hill', 455), ('Matt Gilbert', 450), ('Sarah Urbaniak VanCleave', 447),
    ('Jesse Chandler', 444), ('Anthony Jacobs', 440), ('Joel Selzer', 429),
    ('Jon Nash', 418), ('Joe Mackay', 417), ('Marc Sanche', 413),
    ('James Ellington', 408), ('Walker Hopkins', 407), ('Troy Jacobs', 403),
    ('Tizer Rushford', 401), ('George Cotton', 399), ('Keenen Blackbird', 388),
    ('Janice Osborne', 378), ('Chris Gomez', 372), ('Josh Waples', 369),
    ('Sady Garrison', 329), ('Kelly Smail', 303), ('Makayla Ledford', 294),
    ('Heather Jarvis', 293), ('Samantha Chase', 241), ('Courtney Norman', 230),
    ('Steven Ross Brandenburg', -90);

    -- Insert players with NULL ratings (bottom of ladder)
    INSERT INTO temp_players VALUES 
    ('Tim Webster', 0), ('Eric Croft', 0), ('Louise Broksle', 0), 
    ('Vern Carpenter', 0), ('Mike Churchill', 0), ('Gurn Blanston', 0), 
    ('Rob Millions', 0), ('Patrick Donald', 0), ('Tim Gregor', 0), 
    ('James McMasters', 0), ('James Smith', 0), ('Lea Hightshoe', 0), 
    ('Kenny Thurman', 0), ('Roger Simmons', 0), ('Justin Cavazos', 0), 
    ('Sean Royston', 0), ('Clayton Carter', 0), ('Ryan Fields', 0), 
    ('Kris Vladic', 0), ('Jennifer Lynn', 0), ('Justin Whittenberg', 0), 
    ('Kenrick Leistiko', 0), ('Richard Frankforter', 0), ('Brandon Lucas Parker', 0),
    ('Anita Scharf', 0), ('Ileana Hernandez', 0);

    -- Loop through and insert into users_profiles
    FOR player_record IN SELECT * FROM temp_players ORDER BY rating DESC, name ASC LOOP
        INSERT INTO public.users_profiles (id, display_name, fargo_rating, spot_rank)
        VALUES (
            uuid_generate_v4(), 
            player_record.name, 
            player_record.rating, 
            i
        ) ON CONFLICT (spot_rank) DO NOTHING;
        i := i + 1;
    END LOOP;

    DROP TABLE temp_players;
END $$;
