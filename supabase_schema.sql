-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLES
-- Users Profiles
CREATE TABLE IF NOT EXISTS public.users_profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    display_name text NOT NULL,
    phone text,
    avatar_url text,
    fargo_rating integer DEFAULT 0,
    points integer DEFAULT 0,
    cooldown_until timestamp with time zone,
    spot_rank integer UNIQUE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Challenges
DO $$ BEGIN
    CREATE TYPE game_type AS ENUM ('8-ball', '9-ball', '10-ball');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE challenge_status AS ENUM ('pending', 'negotiating', 'scheduled', 'live', 'completed', 'forfeited');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.challenges (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    challenger_id uuid REFERENCES public.users_profiles(id) NOT NULL,
    challenged_id uuid REFERENCES public.users_profiles(id) NOT NULL,
    game_type game_type NOT NULL DEFAULT '8-ball',
    games_to_win integer NOT NULL DEFAULT 7,
    venue text,
    proposed_time timestamp with time zone,
    status challenge_status DEFAULT 'pending' NOT NULL,
    deadline timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activities
CREATE TABLE IF NOT EXISTS public.activities (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.users_profiles(id) ON DELETE CASCADE,
    action_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.users_profiles(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.increment_points(user_id uuid, amount integer)
RETURNS void AS $$
BEGIN
    UPDATE public.users_profiles
    SET points = points + amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_points_secure(amount integer)
RETURNS void AS $$
BEGIN
    UPDATE public.users_profiles
    SET points = points + amount
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RANKING LOGIC
CREATE OR REPLACE FUNCTION public.update_rankings_on_win(match_winner_id uuid, match_loser_id uuid)
RETURNS void AS $$
DECLARE
    winner_rank integer;
    loser_rank integer;
BEGIN
    SELECT spot_rank INTO winner_rank FROM public.users_profiles WHERE id = match_winner_id;
    SELECT spot_rank INTO loser_rank FROM public.users_profiles WHERE id = match_loser_id;

    IF winner_rank > loser_rank THEN
        UPDATE public.users_profiles SET spot_rank = 0 WHERE id = match_winner_id;
        
        UPDATE public.users_profiles 
        SET spot_rank = spot_rank + 1 
        WHERE spot_rank >= loser_rank AND spot_rank < winner_rank;
        
        UPDATE public.users_profiles SET spot_rank = loser_rank WHERE id = match_winner_id;
    END IF;

    UPDATE public.users_profiles 
    SET cooldown_until = now() + interval '24 hours'
    WHERE id = match_loser_id;

    INSERT INTO public.activities (user_id, action_type, metadata)
    VALUES (match_winner_id, 'MATCH_WON', jsonb_build_object('loser_id', match_loser_id, 'new_rank', loser_rank));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users_profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profiles;
CREATE POLICY "Users can update own profile" ON public.users_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Challenges are viewable by everyone" ON public.challenges;
CREATE POLICY "Challenges are viewable by everyone" ON public.challenges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create challenges" ON public.challenges;
CREATE POLICY "Authenticated users can create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Activities are viewable by everyone" ON public.activities;
CREATE POLICY "Activities are viewable by everyone" ON public.activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can post comments" ON public.comments;
CREATE POLICY "Users can post comments" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');