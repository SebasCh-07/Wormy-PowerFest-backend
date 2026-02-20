/*
  Warnings:

  - You are about to drop the column `birthDate` on the `Registration` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Registration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "birthDate",
DROP COLUMN "gender",
ADD COLUMN     "cedula" TEXT,
ADD COLUMN     "edad" INTEGER;
