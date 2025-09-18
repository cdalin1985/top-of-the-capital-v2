-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "points" INTEGER NOT NULL DEFAULT 10,
    "criteria" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "player_achievements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "progress" JSONB,
    CONSTRAINT "player_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "player_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "player_statistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "matchesWon" INTEGER NOT NULL DEFAULT 0,
    "matchesLost" INTEGER NOT NULL DEFAULT 0,
    "winPercentage" REAL NOT NULL DEFAULT 0.0,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "gamesLost" INTEGER NOT NULL DEFAULT 0,
    "gameWinPercentage" REAL NOT NULL DEFAULT 0.0,
    "currentWinStreak" INTEGER NOT NULL DEFAULT 0,
    "longestWinStreak" INTEGER NOT NULL DEFAULT 0,
    "currentLossStreak" INTEGER NOT NULL DEFAULT 0,
    "longestLossStreak" INTEGER NOT NULL DEFAULT 0,
    "challengesSent" INTEGER NOT NULL DEFAULT 0,
    "challengesReceived" INTEGER NOT NULL DEFAULT 0,
    "challengesAccepted" INTEGER NOT NULL DEFAULT 0,
    "challengesDeclined" INTEGER NOT NULL DEFAULT 0,
    "totalPlayTime" INTEGER NOT NULL DEFAULT 0,
    "averageMatchTime" INTEGER NOT NULL DEFAULT 0,
    "favoriteVenue" TEXT,
    "favoriteOpponent" TEXT,
    "highestRank" INTEGER,
    "lowestRank" INTEGER,
    "rankingPoints" INTEGER NOT NULL DEFAULT 0,
    "lastCalculated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "player_statistics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "profile_views" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "viewerId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "profile_views_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rank" INTEGER,
    "bio" TEXT,
    "location" TEXT,
    "favoriteGame" TEXT,
    "playingSince" DATETIME,
    "homeVenue" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileVisibility" TEXT NOT NULL DEFAULT 'public',
    "showStats" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT false,
    "showLastActive" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_User" ("avatar", "createdAt", "displayName", "email", "id", "password", "rank") SELECT "avatar", "createdAt", "displayName", "email", "id", "password", "rank" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE INDEX "player_achievements_userId_earnedAt_idx" ON "player_achievements"("userId", "earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "player_achievements_userId_achievementId_key" ON "player_achievements"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "player_statistics_userId_key" ON "player_statistics"("userId");

-- CreateIndex
CREATE INDEX "profile_views_profileId_viewedAt_idx" ON "profile_views"("profileId", "viewedAt");
