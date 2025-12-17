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
    description: string | null;
    versioned: number;
    missing: Generated<number>;
    total: Generated<number>;
    len: Generated<number>;
};
export type cache_client = {
    cache_id: number;
    client_id: number;
};
export type cache_raw = {
    cache_id: number;
    name: string;
    crc: number;
};
export type cache_source = {
    id: Generated<number>;
    cache_id: number;
    timestamp: Timestamp | null;
    attribution: string | null;
    description: string | null;
    url: string | null;
};
export type cache_versioned = {
    cache_id: number;
    archive: number;
    group: number;
    version: number;
    crc: number;
};
export type client = {
    id: Generated<number>;
    game_id: number;
    build: string;
    timestamp: Timestamp | null;
    newspost: string | null;
    description: string | null;
    name: string;
    bytes: Buffer;
    len: number;
};
export type client_source = {
    id: Generated<number>;
    client_id: number;
    timestamp: Timestamp | null;
    attribution: string | null;
    description: string | null;
    url: string | null;
};
export type data_raw = {
    game_id: number;
    name: string;
    crc: number;
    bytes: Buffer;
    len: number;
};
export type data_versioned = {
    game_id: number;
    archive: number;
    group: number;
    version: number;
    crc: number;
    bytes: Buffer;
    len: number;
};
export type game = {
    id: Generated<number>;
    name: string;
    display_name: string;
    newspost_url: string | null;
};
export type DB = {
    cache: cache;
    cache_client: cache_client;
    cache_raw: cache_raw;
    cache_source: cache_source;
    cache_versioned: cache_versioned;
    client: client;
    client_source: client_source;
    data_raw: data_raw;
    data_versioned: data_versioned;
    game: game;
};
