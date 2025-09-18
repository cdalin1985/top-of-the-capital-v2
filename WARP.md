# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this
repository.

## Quick Start

From the project root:

```sh
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

- The dev server will start on `http://localhost:3001` by default.

## Essential Commands

- **Start (production):**
  ```sh
  npm start
  ```
- **Start (dev mode, hot reload):**
  ```sh
  npm run dev
  ```
- **Install dependencies & generate Prisma client:**
  ```sh
  npm install
  npx prisma generate
  ```
- **Database migrations (development):**
  ```sh
  npx prisma migrate dev --name <name>
  ```
- **Deploy migrations (production):**
  ```sh
  npx prisma migrate deploy
  ```
- **Reset (WARNING: destructive):**
  ```sh
  npx prisma migrate reset
  ```
- **Prisma Studio (browse/edit DB):**
  ```sh
  npx prisma studio
  ```
- **Seed database (from db.json, needs generated client):**
  ```sh
  node prisma/seed.js
  ```

## High-Level Architecture

- **Backend:**
  - Express.js REST API (see `server.js`)
  - Prisma ORM for database queries/options
  - SQLite is the default DB (see `prisma/schema.prisma`)
  - Auth: JWT-based (tokens, cookies, middleware)
  - Real-time events via Socket.IO (lobby, notifications, live update flows)
- **Frontend:**
  - SPA in vanilla JS (`public/app.js` and `index.html`)
  - Handles login, registration, leaderboard display, challenges, live matches,
    and notifications
  - Uses fetch-based API calls and establishes a live socket connection
- **Database:**
  - User and Challenge models defined in Prisma schema
  - User rank managed on model
  - See also `db.json` for sample/seed data

## Key Files & Directories

- `server.js`: Main server, API endpoints, Socket.IO, authentication logic,
  leaderboard, challenges, notifications
- `prisma/schema.prisma`: Defines DB schema (User, Challenge)
- `prisma/seed.js`: Seeds DB using data from `db.json`
- `db.json`: Holds initial users and seedable player data
- `public/`: Contains the frontend SPA
  - `index.html`: Main application structure
  - `app.js`: Frontend logic (auth, leaderboard, matchmaking)
- `package.json`: Project scripts, dependencies, and run targets

## Database Schema (Prisma)

- **User**:
  - `id`, `email`, `password`, `displayName`, `avatar`, `createdAt`, `rank`
- **Challenge**:
  - `id`, `creatorId`, `targetUserId`, `discipline`, `gamesToWin`, `status`,
    `createdAt`, `updatedAt`, `venue`, `scheduledAt`, `confirmedAt`

## Development Workflow

1. Install dependencies: `npm install`
2. Set up and migrate database:
   `npx prisma generate && npx prisma migrate dev --name init`
3. (Optional) Seed users: `node prisma/seed.js` (ensure `db.json` exists)
4. Start dev server: `npm run dev` (or `npm start` for production)
5. Access frontend via browser at `http://localhost:3001`

### Environment Variables

- `PORT` (default: 3001)
- `DATABASE_URL` for Prisma (in memory or file SQLite by default)
- `JWT_SECRET`, `ADMIN_SECRET` (with dev fallbacks exposed in server)

### API & App Patterns

- Auth endpoints: `/api/auth/register`, `/api/auth/login` (uses JWT and cookies)
- Leaderboard: `/api/leaderboard`
- Challenges: `/api/challenges`, `/api/challenges/:id/propose`,
  `/api/challenges/:id/confirm`
- Matches: `/api/matches`, `/api/matches/active`, `/api/matches/:id/point`
- All API logic managed and protected within `server.js`, auth middleware
  applies to most endpoints
- Socket.IO used for notifications and match/lobby events
