-- Create ladder_view for fetching ranked players
-- This view provides a clean interface for the ladder/ranking display

-- Drop the view if it exists (for idempotent migrations)
DROP VIEW IF EXISTS public.ladder_view;

-- Create the ladder_view
CREATE VIEW public.ladder_view AS
SELECT
    id,
    display_name,
    spot_rank,
    fargo_rating,
    points,
    cooldown_until,
    avatar_url,
    created_at,
    updated_at
FROM public.users_profiles
ORDER BY spot_rank ASC;

-- Grant access to the view (matches existing RLS policies on users_profiles)
GRANT SELECT ON public.ladder_view TO anon;
GRANT SELECT ON public.ladder_view TO authenticated;

-- Add a comment describing the view
COMMENT ON VIEW public.ladder_view IS 'Read-only view of the player ladder, ordered by spot_rank';
