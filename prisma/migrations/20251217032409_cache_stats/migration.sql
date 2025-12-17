-- DropIndex
DROP INDEX `cache_raw_cache_id_name_idx` ON `cache_raw`;

-- DropIndex
DROP INDEX `cache_versioned_cache_id_archive_idx` ON `cache_versioned`;

-- AlterTable
ALTER TABLE `cache` ADD COLUMN `len` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `missing` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `total` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `cache_raw_cache_id_idx` ON `cache_raw`(`cache_id`);

-- CreateIndex
CREATE INDEX `cache_versioned_cache_id_idx` ON `cache_versioned`(`cache_id`);
