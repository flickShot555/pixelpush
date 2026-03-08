-- AlterTable
ALTER TABLE "User" ALTER COLUMN "githubId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT;
