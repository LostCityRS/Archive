/*
  Warnings:

  - The primary key for the `cache_versioned` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `archive` on the `cache_versioned` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedTinyInt`.
  - You are about to alter the column `group` on the `cache_versioned` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedInt`.
  - The primary key for the `data_versioned` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `version` on the `data_versioned` table. The data in that column could be lost. The data in that column will be cast from `UnsignedInt` to `Int`.

*/
-- AlterTable
ALTER TABLE `cache_versioned` DROP PRIMARY KEY,
    MODIFY `archive` TINYINT UNSIGNED NOT NULL,
    MODIFY `group` INTEGER UNSIGNED NOT NULL,
    ADD PRIMARY KEY (`cache_id`, `archive`, `group`, `version`, `crc`);

-- AlterTable
ALTER TABLE `data_versioned` DROP PRIMARY KEY,
    MODIFY `version` INTEGER NOT NULL,
    ADD PRIMARY KEY (`game_id`, `archive`, `group`, `version`, `crc`);
