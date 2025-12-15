-- CreateTable
CREATE TABLE `cache_source` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cache_id` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NULL,
    `attribution` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `url` VARCHAR(191) NULL,

    INDEX `cache_source_cache_id_idx`(`cache_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
