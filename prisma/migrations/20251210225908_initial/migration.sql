-- CreateTable
CREATE TABLE `game` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `game_id` INTEGER NOT NULL,
    `build` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NULL,
    `newspost` VARCHAR(191) NULL,
    `js5` BOOLEAN NOT NULL,
    `ondemand` BOOLEAN NOT NULL,
    `jag` BOOLEAN NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submission` (
    `uuid` VARCHAR(191) NOT NULL,
    `attribution` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NOT NULL,
    `user_agent` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_js5` (
    `game_id` INTEGER NOT NULL,
    `archive` TINYINT UNSIGNED NOT NULL,
    `group` INTEGER UNSIGNED NOT NULL,
    `version` INTEGER UNSIGNED NOT NULL,
    `crc` INTEGER NOT NULL,
    `bytes` MEDIUMBLOB NOT NULL,
    `len` INTEGER NOT NULL,

    INDEX `data_js5_game_id_archive_idx`(`game_id`, `archive`),
    INDEX `data_js5_game_id_archive_group_idx`(`game_id`, `archive`, `group`),
    INDEX `data_js5_game_id_archive_group_version_idx`(`game_id`, `archive`, `group`, `version`),
    INDEX `data_js5_game_id_archive_crc_idx`(`game_id`, `archive`, `crc`),
    PRIMARY KEY (`game_id`, `archive`, `group`, `version`, `crc`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache_js5` (
    `cache_id` INTEGER NOT NULL,
    `archive` INTEGER NOT NULL,
    `group` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `crc` INTEGER NOT NULL,

    PRIMARY KEY (`cache_id`, `archive`, `group`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_ondemand` (
    `game_id` INTEGER NOT NULL,
    `archive` TINYINT UNSIGNED NOT NULL,
    `file` SMALLINT UNSIGNED NOT NULL,
    `version` SMALLINT UNSIGNED NOT NULL,
    `crc` INTEGER NOT NULL,
    `bytes` MEDIUMBLOB NOT NULL,
    `len` INTEGER NOT NULL,

    INDEX `data_ondemand_game_id_archive_idx`(`game_id`, `archive`),
    INDEX `data_ondemand_game_id_archive_file_idx`(`game_id`, `archive`, `file`),
    INDEX `data_ondemand_game_id_archive_file_version_idx`(`game_id`, `archive`, `file`, `version`),
    INDEX `data_ondemand_game_id_archive_crc_idx`(`game_id`, `archive`, `crc`),
    PRIMARY KEY (`game_id`, `archive`, `file`, `version`, `crc`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache_ondemand` (
    `cache_id` INTEGER NOT NULL,
    `archive` INTEGER NOT NULL,
    `file` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `crc` INTEGER NOT NULL,
    `essential` BOOLEAN NOT NULL,

    INDEX `cache_ondemand_cache_id_archive_essential_idx`(`cache_id`, `archive`, `essential`),
    PRIMARY KEY (`cache_id`, `archive`, `file`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_jag` (
    `game_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `crc` INTEGER NOT NULL,
    `bytes` MEDIUMBLOB NOT NULL,
    `len` INTEGER NOT NULL,

    INDEX `data_jag_game_id_name_idx`(`game_id`, `name`),
    PRIMARY KEY (`game_id`, `name`, `crc`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache_jag` (
    `cache_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `crc` INTEGER NOT NULL,

    PRIMARY KEY (`cache_id`, `name`, `crc`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
