-- CreateTable
CREATE TABLE "custom_lists" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_list_entries" (
    "customListId" UUID NOT NULL,
    "animeId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_list_entries_pkey" PRIMARY KEY ("customListId","animeId")
);

-- CreateIndex
CREATE INDEX "custom_lists_userId_idx" ON "custom_lists"("userId");

-- AddForeignKey
ALTER TABLE "custom_lists" ADD CONSTRAINT "custom_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_list_entries" ADD CONSTRAINT "custom_list_entries_customListId_fkey" FOREIGN KEY ("customListId") REFERENCES "custom_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_list_entries" ADD CONSTRAINT "custom_list_entries_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "anime_cache"("animeId") ON DELETE RESTRICT ON UPDATE CASCADE;
