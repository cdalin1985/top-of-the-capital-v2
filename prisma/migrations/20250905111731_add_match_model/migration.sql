-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "discipline" TEXT,
    "gamesToWin" INTEGER NOT NULL,
    "venue" TEXT,
    "scores" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "winnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Match_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
