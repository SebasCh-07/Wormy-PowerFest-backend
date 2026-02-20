/*
  Warnings:

  - You are about to drop the column `profession` on the `Registration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "profession",
ADD COLUMN     "sector" TEXT;

-- DropEnum
DROP TYPE "Gender";
