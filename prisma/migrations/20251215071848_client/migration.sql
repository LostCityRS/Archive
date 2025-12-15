-- CreateTable
CREATE TABLE `client` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `game_id` INTEGER NOT NULL,
    `cache_id` INTEGER NULL,
    `build` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NULL,
    `newspost` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `bytes` LONGBLOB NOT NULL,
    `len` INTEGER NOT NULL,

    INDEX `client_game_id_idx`(`game_id`),
    INDEX `client_cache_id_idx`(`cache_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
