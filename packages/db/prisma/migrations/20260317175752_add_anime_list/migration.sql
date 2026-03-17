-- CreateEnum
CREATE TYPE "AnimeStatus" AS ENUM ('WATCHING', 'COMPLETED', 'PLANNED', 'DROPPED', 'PAUSED');

-- CreateTable
CREATE TABLE "anime_list" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "animeId" INTEGER NOT NULL,
    "status" "AnimeStatus" NOT NULL,
    "score" DECIMAL(4,1),
    "episodesWatched" INTEGER NOT NULL DEFAULT 0,
    "totalEpisodes" INTEGER,
    "startDate" DATE,
    "finishDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anime_list_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anime_list_userId_status_idx" ON "anime_list"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "anime_list_userId_animeId_key" ON "anime_list"("userId", "animeId");

-- AddForeignKey
ALTER TABLE "anime_list" ADD CONSTRAINT "anime_list_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
