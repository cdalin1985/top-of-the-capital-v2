# Top of the Capital 🎱
### A Premium Mobile-First Pool League Management Ecosystem

The **Top of the Capital** application is a professional league management platform for the Helena Pool League. It has been upgraded to a "Fortune 500" mobile-first tech stack designed for high engagement, real-time match execution, and a stunning "Liquid Glass" aesthetic.

## 🚀 Tech Stack
- **Frontend**: React Native / Expo with TypeScript
- **Backend**: Supabase (Postgres, Auth, Real-time Channels)
- **AI**: Gemini-powered AI Avatar Generation
- **Communication**: Expo-Push-Notifications for real-time challenge alerts
- **Testing**: Jest suite for league business logic verification

## 🏆 Core League Rules (Scorecard Compliant)
- **The List**: A real-time ladder for 8, 9, and 10-ball.
- **±5 Rule**: Players can only challenge others within ±5 spots of their rank (unless ranked #1).
- **Match Cooldown**: A 24-hour lock is enforced on players after a loss to ensure fair play.
- **Negotiation**: Automated venue and time proposal system.
- **Deadlines**: 2-week response requirement for all challenges.

## 🎥 The Streaming Arena
Matches can be broadcast live to the entire league. When a player goes live via YouTube or Facebook, the app sends a push notification to all members, providing a one-tap link to the "Live Arena" viewer.

## 🛠️ Getting Started
1. **Prerequisites**: [Node.js](https://nodejs.org/) and a Supabase Project.
2. **Installation**:
   ```bash
   npm install
   ```
3. **Environment Setup**:
   Create a `src/lib/config.ts` with your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. **Running Locally**:
   ```bash
   npx expo start
   ```
5. **Running Tests**:
   ```bash
   npm test
   ```

## 📂 Project Structure
- `src/screens`: All premium mobile interfaces (Rankings, Scoreboard, Feed, etc.)
- `src/lib`: Logic for rankings, notifications, and Supabase client.
- `src/store`: Zustand state management for notifications.
- `supabase`: Edge functions for AI generation and database migrations.
- `__tests__`: Business logic verification suite.
- `legacy-web`: The original vanilla JS web implementation.

---
*Built with precision for the Helena Pool League.*
