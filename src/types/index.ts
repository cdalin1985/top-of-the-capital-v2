// Game Types
export type GameType = '8-ball' | '9-ball' | '10-ball';
export type ChallengeStatus = 'pending' | 'negotiating' | 'scheduled' | 'live' | 'completed' | 'forfeited';

// User Profile
export interface Profile {
  id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  fargo_rating: number;
  points: number;
  cooldown_until?: string | null;
  ladder_rank: number;
  owner_id?: string;
  expo_push_token?: string;
  created_at: string;
  updated_at: string;
}

// Challenge
export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  game_type: GameType;
  games_to_win: number;
  venue?: string;
  proposed_time?: string;
  status: ChallengeStatus;
  deadline?: string;
  challenger_score?: number;
  challenged_score?: number;
  winner_id?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  challenger?: Profile;
  challenged?: Profile;
}

// Activity
export interface Activity {
  id: string;
  user_id: string;
  action_type: string;
  metadata: Record<string, any>;
  created_at: string;
  // Joined data
  user?: Profile;
  comments?: Comment[];
}

// Comment
export interface Comment {
  id: string;
  activity_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // Joined data
  user?: Profile;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Claim: undefined;
  Main: undefined;
  Home: undefined;
  TheList: undefined;
  Leaderboard: undefined;
  Challenge: { target: Profile };
  Scoreboard: { challenge: Challenge };
  ProfileMain: undefined;
  MatchHistory: undefined;
};
