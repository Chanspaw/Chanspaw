/*
  Warnings:

  - You are about to drop the `GameRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "GameRule";

-- CreateTable
CREATE TABLE "game_rules" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "options" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_rules_pkey" PRIMARY KEY ("id")
);
