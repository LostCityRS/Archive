-- CreateTable
CREATE TABLE `game` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `newspost_url` VARCHAR(191) NULL,

    UNIQUE INDEX `game_name_key`(`name`),
    INDEX `game_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_versioned` (
    `game_id` INTEGER NOT NULL,
    `archive` TINYINT UNSIGNED NOT NULL,
    `group` INTEGER UNSIGNED NOT NULL,
    `version` INTEGER UNSIGNED NOT NULL,
    `crc` INTEGER NOT NULL,
    `bytes` MEDIUMBLOB NOT NULL,
    `len` INTEGER UNSIGNED NOT NULL,

    PRIMARY KEY (`game_id`, `archive`, `group`, `version`, `crc`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_raw` (
    `game_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `crc` INTEGER NOT NULL,
    `bytes` MEDIUMBLOB NOT NULL,
    `len` INTEGER UNSIGNED NOT NULL,

    PRIMARY KEY (`game_id`, `name`, `crc`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `game_id` INTEGER NOT NULL,
    `build` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NULL,
    `newspost` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `versioned` BOOLEAN NOT NULL,

    INDEX `cache_game_id_idx`(`game_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `cache_versioned` (
    `cache_id` INTEGER NOT NULL,
    `archive` INTEGER NOT NULL,
    `group` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `crc` INTEGER NOT NULL,

    INDEX `cache_versioned_cache_id_archive_idx`(`cache_id`, `archive`),
    PRIMARY KEY (`cache_id`, `archive`, `group`, `version`, `crc`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache_raw` (
    `cache_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `crc` INTEGER NOT NULL,

    INDEX `cache_raw_cache_id_name_idx`(`cache_id`, `name`),
    PRIMARY KEY (`cache_id`, `name`, `crc`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `game_id` INTEGER NOT NULL,
    `build` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NULL,
    `newspost` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `bytes` LONGBLOB NOT NULL,
    `len` INTEGER NOT NULL,

    INDEX `client_game_id_idx`(`game_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_source` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_id` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NULL,
    `attribution` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `url` VARCHAR(191) NULL,

    INDEX `client_source_client_id_idx`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache_client` (
    `cache_id` INTEGER NOT NULL,
    `client_id` INTEGER NOT NULL,

    PRIMARY KEY (`cache_id`, `client_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
