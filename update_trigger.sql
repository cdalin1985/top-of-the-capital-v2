-- SMART MERGE TRIGGER
-- Automatically links new signups to existing legacy profiles based on name

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    existing_rank integer;
    existing_fargo integer;
    existing_points integer;
BEGIN
    -- 1. Check if a ghost profile exists
    -- (phone IS NULL implies it's a ghost from the 70-player import)
    SELECT spot_rank, fargo_rating, points INTO existing_rank, existing_fargo, existing_points
    FROM public.users_profiles 
    WHERE display_name = COALESCE(new.raw_user_meta_data->>'display_name', 'Player')
    AND phone IS NULL
    LIMIT 1;

    IF existing_rank IS NOT NULL THEN
        -- 2. Delete the ghost profile to avoid primary key/unique rank conflicts
        DELETE FROM public.users_profiles WHERE display_name = COALESCE(new.raw_user_meta_data->>'display_name', 'Player') AND phone IS NULL;
        
        -- 3. Insert the new user at the reclaimed rank with legacy stats
        INSERT INTO public.users_profiles (id, display_name, phone, avatar_url, spot_rank, fargo_rating, points)
        VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'display_name', 'Player'),
            new.raw_user_meta_data->>'phone',
            new.raw_user_meta_data->>'avatar_url',
            existing_rank,
            existing_fargo,
            existing_points
        );
    ELSE
        -- 4. Standard new player logic for people NOT on the legacy list
        INSERT INTO public.users_profiles (id, display_name, phone, avatar_url, spot_rank)
        VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'display_name', 'Player'),
            new.raw_user_meta_data->>'phone',
            new.raw_user_meta_data->>'avatar_url',
            (SELECT COALESCE(MAX(spot_rank), 0) + 1 FROM public.users_profiles)
        );
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
