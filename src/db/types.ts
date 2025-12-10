import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type cache = {
    id: Generated<number>;
    build: string;
};
export type cache_file = {
    cache_id: number;
    archive: number;
    file: number;
    version: number;
    crc: number;
    essential: number;
};
export type data = {
    id: Generated<number>;
    archive: number;
    file: number;
    version: number;
    data: Buffer;
    crc: number;
    len: number;
};
export type DB = {
    cache: cache;
    cache_file: cache_file;
    data: data;
};
