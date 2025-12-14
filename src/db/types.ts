import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type cache = {
    id: Generated<number>;
    game_id: number;
    build: string;
    timestamp: Timestamp | null;
    newspost: string | null;
    js5: number;
    ondemand: number;
    jag: number;
};
export type cache_jag = {
    cache_id: number;
    name: string;
    crc: number;
};
export type cache_js5 = {
    cache_id: number;
    archive: number;
    group: number;
    version: number;
    crc: number;
};
export type cache_ondemand = {
    cache_id: number;
    archive: number;
    file: number;
    version: number;
    crc: number;
    essential: number;
};
export type data_jag = {
    game_id: number;
    name: string;
    crc: number;
    bytes: Buffer;
    len: number;
};
export type data_js5 = {
    game_id: number;
    archive: number;
    group: number;
    version: number;
    crc: number;
    bytes: Buffer;
    len: number;
};
export type data_ondemand = {
    game_id: number;
    archive: number;
    file: number;
    version: number;
    crc: number;
    bytes: Buffer;
    len: number;
};
export type game = {
    id: Generated<number>;
    name: string;
    display_name: string;
    parent_game: number | null;
};
export type submission = {
    uuid: string;
    attribution: string | null;
    ip: string;
    user_agent: string;
};
export type DB = {
    cache: cache;
    cache_jag: cache_jag;
    cache_js5: cache_js5;
    cache_ondemand: cache_ondemand;
    data_jag: data_jag;
    data_js5: data_js5;
    data_ondemand: data_ondemand;
    game: game;
    submission: submission;
};
