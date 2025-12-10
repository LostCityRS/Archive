-- CreateTable
CREATE TABLE `cache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `build` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache_file` (
    `cache_id` INTEGER NOT NULL,
    `archive` INTEGER NOT NULL,
    `file` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `crc` INTEGER NOT NULL,
    `essential` BOOLEAN NOT NULL,

    INDEX `cache_file_cache_id_idx`(`cache_id`),
    PRIMARY KEY (`cache_id`, `archive`, `file`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `archive` INTEGER NOT NULL,
    `file` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `data` MEDIUMBLOB NOT NULL,
    `crc` INTEGER NOT NULL,
    `len` INTEGER NOT NULL,

    INDEX `data_archive_file_crc_idx`(`archive`, `file`, `crc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
