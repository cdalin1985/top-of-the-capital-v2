export type GameType = '8-ball' | '9-ball' | '10-ball';
export type ChallengeStatus = 'pending' | 'negotiating' | 'scheduled' | 'live' | 'completed' | 'forfeited';

export interface Profile {
    id: string;
    display_name: string;
    phone: string | null;
    avatar_url: string | null;
    fargo_rating: number;
    points: number;
    cooldown_until: string | null;
    spot_rank: number;
    created_at: string;
    updated_at: string;
    expo_push_token: string | null;
}

export interface Ranking {
    id: string;
    user_id: string;
    game_type: GameType;
    rank: number;
    points: number;
    updated_at: string;
}

export interface Challenge {
    id: string;
    challenger_id: string;
    challenged_id: string;
    game_type: GameType;
    games_to_win: number;
    venue: string;
    proposed_time: string;
    status: ChallengeStatus;
    deadline: string;
    created_at: string;
    updated_at: string;
    stream_url: string | null;
}

export interface Activity {
    id: string;
    user_id: string;
    action_type: string;
    metadata: any;
    created_at: string;
}

export interface Comment {
    id: string;
    activity_id: string;
    user_id: string;
    content: string;
    created_at: string;
}
