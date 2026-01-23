# CLAUDE.md - Top of the Capital

> **Read this entire file before making any changes.**
> This is your briefing document. It contains everything you need to build this app correctly.

---

## PROJECT OVERVIEW

**App Name:** Top of the Capital  
**Type:** Pool/Billiards League Management Mobile App  
**Location:** Helena, Montana  
**Players:** 70+ active members  
**Primary Venues:** Eagles 4040, Valley Hub  
**Owner:** Chase Dalin (currently ranked #4)  
**Repository:** https://github.com/cdalin1985/top-of-the-capital-v2

### What This App Does

This is a competitive pool league app where players can:
1. View the live leaderboard of all 70 players
2. Challenge other players within their rank range
3. Schedule and play matches
4. Report scores and update rankings
5. Track their stats and history

---

## TECH STACK

| Layer | Technology |
|-------|------------|
| Framework | React Native with Expo SDK 52+ |
| Language | TypeScript (strict mode) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| State | React Context + Hooks |
| Navigation | Expo Router (file-based routing) |
| Styling | StyleSheet + Expo BlurView for glass effects |
| Notifications | OneSignal |
| Build | EAS Build |

### DO NOT USE
- Redux (too complex for this app)
- Styled Components (use StyleSheet)
- Firebase (we use Supabase)
- Class components (use functional components with hooks)

---

## SUPABASE CONNECTION

```
Project URL: https://ankvjywsnydpkepdvuvm.supabase.co
Project ID: ankvjywsnydpkepdvuvm
Region: US East
```

### Environment Variables
The `.env` file should contain:
```env
EXPO_PUBLIC_SUPABASE_URL=https://ankvjywsnydpkepdvuvm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[anon key from Supabase dashboard]
```

### Supabase Client Setup
Location: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## DATABASE SCHEMA

> **NOTE**: The actual Supabase project (from .env) uses `profiles` table. Do NOT create new tables/views without explicit approval.

### profiles
Player accounts linked to Supabase Auth. This is the main player table.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Links to auth.users |
| display_name | text | Player's display name |
| photo_url | text | Avatar URL |
| is_admin | boolean | Admin privileges |
| phone_number | text | For notifications |
| created_at | timestamp | Account creation |

> **Schema Discovery Needed**: Run authenticated query to discover actual columns (rank, fargo_rating, etc.) before implementation.

### challenges
Challenge requests between players.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Challenge ID |
| challenger_id | uuid (FK) | Who sent challenge |
| challenged_id | uuid (FK) | Who received it |
| status | text | PENDING, ACCEPTED, DECLINED, COMPLETED, EXPIRED |
| discipline | text | 8-ball, 9-ball, or 10-ball |
| race_to | integer | Race length (5-15) |
| venue_id | uuid (FK) | Where to play (set by challenged when accepting) |
| scheduled_date | timestamp | When to play (set by challenged when accepting) |
| stream_url | text | Optional Sport Cam streaming link |
| proposed_date | timestamp | When challenger suggested |
| accepted_date | timestamp | When challenged accepted |
| expires_at | timestamp | Auto-expire after 48 hours |
| created_at | timestamp | When challenge was sent |

### matches
Completed match records.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Match ID |
| challenge_id | uuid (FK) | Originating challenge |
| player1_id | uuid (FK) | First player |
| player2_id | uuid (FK) | Second player |
| player1_score | integer | Games won |
| player2_score | integer | Games won |
| discipline | text | What game type |
| race_to | integer | First to X wins |
| winner_id | uuid (FK) | Who won |
| status | text | IN_PROGRESS, COMPLETED, DISPUTED |
| played_at | timestamp | When match occurred |

### venues
Match locations. **Only two venues for Helena league:**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Venue ID |
| name | text | "Eagles 4040" or "Valley Hub" |
| address | text | Physical address |
| hours | text | Operating hours |

**IMPORTANT:** The venue dropdown when accepting challenges should ONLY show:
1. Eagles 4040
2. Valley Hub

### seasons
League seasons for historical tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Season ID |
| name | text | "Spring 2026" etc |
| start_date | date | Season start |
| end_date | date | Season end |
| is_active | boolean | Current season flag |

---

## BUSINESS RULES - CHALLENGES

### Challenge Eligibility

```typescript
function canChallenge(myRank: number, theirRank: number): boolean {
  // RULE 1: Cannot challenge yourself
  if (myRank === theirRank) return false;
  
  // RULE 2: #1 rank can challenge ANYONE
  if (myRank === 1) return true;
  
  // RULE 3: Everyone else can only challenge within +/-5 ranks
  const diff = Math.abs(myRank - theirRank);
  return diff <= 5;
}
```

### Challenge Flow

**CHALLENGER (person sending the challenge):**
1. Picks opponent from leaderboard (must be within ±5 ranks, or #1 can pick anyone)
2. Selects **discipline**: 8-ball, 9-ball, or 10-ball (button selection)
3. Selects **race length**: 5 to 15 (slider)
4. Reviews and sends challenge → Status: PENDING
5. Waits for response (48 hour expiration)

**CHALLENGED (person receiving the challenge):**
1. Gets notification of incoming challenge
2. Views challenge details (who, discipline, race length)
3. Can tap DECLINE → Status: DECLINED
4. Can tap ACCEPT → Opens acceptance modal:
   - **VENUE** (required): Dropdown with "Eagles 4040" or "Valley Hub"
   - **DATE/TIME** (required): Calendar picker + time selector
   - **STREAM URL** (optional): Text field to paste Sport Cam link
5. Confirms acceptance → Status: ACCEPTED, match scheduled

**AFTER ACCEPTANCE:**
- Both players see match on their schedule
- If stream URL was provided, "Watch Live" button appears for spectators
- Match proceeds at scheduled time/venue

### Challenge Statuses
- `PENDING` - Waiting for response
- `ACCEPTED` - Scheduled, waiting to play
- `DECLINED` - Rejected by challenged player
- `IN_PROGRESS` - Currently playing
- `COMPLETED` - Match finished
- `EXPIRED` - No response within 48 hours

---

## BUSINESS RULES - RANKING

### After a Match Completes

**If LOWER-ranked player wins:**
- Winner and loser SWAP positions
- Example: #7 beats #4 - #7 becomes #4, old #4 becomes #7

**If HIGHER-ranked player wins:**
- NO change to rankings
- Just adds to match history

### Point System (Monthly Leaderboard)

| Action | Points |
|--------|--------|
| Issue a challenge | +1 |
| Play a match | +1 |
| Win a match | +2 |

Points reset monthly. Used for engagement tracking, not rank.

---

## DESIGN SYSTEM

### Color Palette

```typescript
export const colors = {
  // Backgrounds
  background: '#0F0F0F',        // Darkest - app background
  surface: '#1A1A1A',           // Cards and containers
  surfaceLight: '#252525',      // Elevated surfaces
  
  // Primary gradient (purple to blue)
  primaryGradientStart: '#667eea',
  primaryGradientEnd: '#764ba2',
  
  // Accents
  gold: '#D4AF37',              // Top 3 ranks, achievements
  silver: '#C0C0C0',            // #2 rank
  bronze: '#CD7F32',            // #3 rank
  success: '#4CAF50',           // Win states, confirmations
  error: '#F44336',             // Errors, declines
  warning: '#FF9800',           // Pending states
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  
  // Glass morphism
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassBackground: 'rgba(255, 255, 255, 0.05)',
};
```

### Typography

```typescript
export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const },
  h2: { fontSize: 24, fontWeight: '600' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};
```

### Spacing

```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

### Design Rules
- Always use dark backgrounds (#0F0F0F or #1A1A1A)
- Top 3 ranks get gold/silver/bronze accents
- User's own row is highlighted with primary gradient border
- All cards have glass morphism effect
- Buttons have subtle gradient backgrounds
- 16px border radius on all cards
- 60fps animations using Reanimated if needed

---

## SCREENS TO BUILD

Build in this exact order (each depends on the previous):

### 1. Auth (Login/Register)
- Dropdown to select from 70 existing players
- "Claim your spot" if not yet registered
- Password for authentication
- Supabase Auth integration

### 2. Home Dashboard
- Your current rank (large, prominent)
- Quick stats: Wins, Losses, Win Rate
- Recent activity feed
- Quick action buttons

### 3. Leaderboard
- All 70 players listed by rank
- Search/filter functionality
- Top 3 with gold/silver/bronze styling
- Challenge button for players within +/-5 range
- Your row highlighted
- Real-time updates

### 4. Player Profile
- Player name, avatar, rank
- Stats (wins, losses, win rate)
- Match history
- Head-to-head record vs you
- Challenge button if within range

### 5. Create Challenge
- Step 1: Select discipline (8-ball, 9-ball, 10-ball)
- Step 2: Select race length (slider 5-15)
- Step 3: Confirm and send

### 6. Challenge List
- Tabs: Incoming, Outgoing, Active, Completed
- Accept/Decline buttons for incoming
- Status indicators

### 7. Match Scoring
- Large score display
- "I Won This Game" button
- Both players must confirm each game
- Race progress indicator
- Final confirmation

---

## TESTING REQUIREMENTS

Before marking any feature complete, verify:

### Authentication
- [ ] New user can register
- [ ] Existing user can login
- [ ] Password reset works
- [ ] Session persists

### Leaderboard
- [ ] Shows all 70 players
- [ ] Search works
- [ ] Top 3 have special styling
- [ ] Challenge buttons show correctly
- [ ] Real-time updates work

### Challenges
- [ ] Can create challenge within +/-5 range
- [ ] Cannot create challenge outside range (except #1)
- [ ] Cannot challenge yourself
- [ ] Opponent receives notification
- [ ] Can accept/decline
- [ ] 48-hour expiration works

### Matches
- [ ] Both players see same score
- [ ] Can report game winner
- [ ] Match completes at race target
- [ ] Rankings update correctly after match

---

## COMMON MISTAKES TO AVOID

These are issues from previous build attempts. DO NOT repeat them:

1. **JSON Config Errors** - Always validate JSON files before saving
2. **Encoding Issues** - Use UTF-8 encoding for all files
3. **Missing Error Handling** - Always wrap async calls in try/catch
4. **No Loading States** - Always show loading indicators
5. **Hardcoded IDs** - Use environment variables for Supabase config
6. **Missing TypeScript Types** - Always define proper types
7. **No Offline Handling** - Show appropriate messages when offline

---

## CURRENT STATUS

**Best Foundation:** This repo (`top-of-the-capital-v2`) scored 92/100 in evaluation.

**Database:** Supabase is set up with all tables and 70 players loaded.

**Chase's Rank:** #4

**Next Steps:** Build screens in order listed above.

---

## CONTACT

**Owner:** Chase Dalin  
**GitHub:** cdalin1985  
**Email:** chase.dalin@gmail.com

---

**When in doubt, refer back to this file. Good luck!**
