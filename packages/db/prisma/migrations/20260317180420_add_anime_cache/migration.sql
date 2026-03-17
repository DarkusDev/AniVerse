-- CreateTable
CREATE TABLE "anime_cache" (
    "animeId" INTEGER NOT NULL,
    "titleRomaji" TEXT,
    "titleEnglish" TEXT,
    "coverImage" TEXT,
    "format" TEXT,
    "episodes" INTEGER,
    "status" TEXT,
    "season" TEXT,
    "seasonYear" INTEGER,
    "genres" TEXT[],
    "averageScore" INTEGER,
    "cachedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anime_cache_pkey" PRIMARY KEY ("animeId")
);

-- AddForeignKey
ALTER TABLE "anime_list" ADD CONSTRAINT "anime_list_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "anime_cache"("animeId") ON DELETE RESTRICT ON UPDATE CASCADE;
