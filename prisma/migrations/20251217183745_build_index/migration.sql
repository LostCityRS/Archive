-- CreateIndex
CREATE INDEX `cache_game_id_build_idx` ON `cache`(`game_id`, `build`);

-- CreateIndex
CREATE INDEX `client_game_id_build_idx` ON `client`(`game_id`, `build`);
