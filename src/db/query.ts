import { Kysely, MysqlDialect } from 'kysely';
import type { Dialect } from 'kysely';
import { createPool } from 'mysql2';

import { KyselyLRUCache } from 'kysely-cache';

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

export const cacheDb = KyselyLRUCache.createCache<DB>();
