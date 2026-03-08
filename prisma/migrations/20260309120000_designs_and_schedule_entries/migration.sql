-- CreateEnum
CREATE TYPE "DesignStatus" AS ENUM ('active', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "ScheduleEntryStatus" AS ENUM ('pending', 'completed', 'missed', 'skipped');

-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pixelData" JSONB NOT NULL,
    "status" "DesignStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetEndAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "actualCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ScheduleEntryStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Design_userId_idx" ON "Design"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEntry_designId_date_key" ON "ScheduleEntry"("designId", "date");

-- CreateIndex
CREATE INDEX "ScheduleEntry_designId_idx" ON "ScheduleEntry"("designId");

-- CreateIndex
CREATE INDEX "ScheduleEntry_date_idx" ON "ScheduleEntry"("date");

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;
