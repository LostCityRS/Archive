-- CreateIndex
CREATE INDEX `cache_game_id_idx` ON `cache`(`game_id`);

-- CreateIndex
CREATE INDEX `cache_jag_cache_id_idx` ON `cache_jag`(`cache_id`);

-- CreateIndex
CREATE INDEX `cache_js5_cache_id_idx` ON `cache_js5`(`cache_id`);

-- CreateIndex
CREATE INDEX `cache_js5_cache_id_archive_idx` ON `cache_js5`(`cache_id`, `archive`);

-- CreateIndex
CREATE INDEX `cache_ondemand_cache_id_idx` ON `cache_ondemand`(`cache_id`);

-- CreateIndex
CREATE INDEX `data_jag_game_id_idx` ON `data_jag`(`game_id`);

-- CreateIndex
CREATE INDEX `data_js5_game_id_idx` ON `data_js5`(`game_id`);

-- CreateIndex
CREATE INDEX `data_ondemand_game_id_idx` ON `data_ondemand`(`game_id`);

-- CreateIndex
CREATE INDEX `game_name_idx` ON `game`(`name`);
