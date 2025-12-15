import { LRUCache } from 'lru-cache';
import { Kysely, MysqlDialect } from 'kysely';
import type { Dialect, SelectQueryBuilder } from 'kysely';
import { createPool } from 'mysql2';

import { DB } from '#/db/types.js';

let dialect: Dialect = new MysqlDialect({
    pool: async () => createPool({
        database: process.env.DB_NAME ?? 'lcarchive',
        host: process.env.DB_HOST ?? 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
        user: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASS ?? 'password',
        timezone: 'Z'
    })
});

export const db = new Kysely<DB>({
    dialect,
    log(event) {
        // if (event.level === 'query') {
        //     console.log(event.query.sql);
        //     console.log(event.query.parameters);
        // }
    }
});

const lru = new LRUCache({ max: 500 });

// todo: is it possible to preserve query builder type info?
export async function cacheExecute(key: string, query: SelectQueryBuilder<any, any, any>): Promise<any> {
    let data = lru.get(key);
    if (data) {
        return data;
    }

    data = query.execute();
    lru.set(key, data);
    return data;
}

export async function cacheExecuteTakeFirst(key: string, query: SelectQueryBuilder<any, any, any>): Promise<any> {
    let data = lru.get(key);
    if (data) {
        return data;
    }

    data = query.executeTakeFirst();
    lru.set(key, data);
    return data;
}

export async function cacheExecuteTakeFirstOrThrow(key: string, query: SelectQueryBuilder<any, any, any>): Promise<any> {
    let data = lru.get(key);
    if (data) {
        return data;
    }

    data = query.executeTakeFirstOrThrow();
    lru.set(key, data);
    return data;
}
