-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "sorteoScanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sorteoTime" TIMESTAMP(3);
