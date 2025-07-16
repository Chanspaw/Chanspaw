-- CreateTable
CREATE TABLE "platform_revenue" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "winnerId" TEXT,
    "platformCut" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "platform_revenue_pkey" PRIMARY KEY ("id")
);
