/*
  Warnings:

  - You are about to alter the column `len` on the `cache` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedBigInt`.
  - You are about to alter the column `missing` on the `cache` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedInt`.
  - You are about to alter the column `total` on the `cache` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedInt`.

*/
-- AlterTable
ALTER TABLE `cache` MODIFY `len` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    MODIFY `missing` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    MODIFY `total` INTEGER UNSIGNED NOT NULL DEFAULT 0;
