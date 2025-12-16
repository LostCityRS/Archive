import fs from 'fs';
import path from 'path';

import { db } from '#/db/query.js';

const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('args: <source> <cache id>');
    process.exit(1);
}

const [source, cacheId] = args;

const cache = await db.selectFrom('cache').selectAll().where('id', '=', parseInt(cacheId)).executeTakeFirstOrThrow();

const data = fs.readFileSync(source);

const client = await db
    .insertInto('client')
    .values({
        game_id: cache.game_id,
        build: cache.build,
        name: path.basename(source),
        bytes: data,
        len: data.length
    })
    .executeTakeFirst();

await db
    .insertInto('client_source')
    .values({
        client_id: Number(client.insertId),
        timestamp: fs.statSync(source).ctime,
        description: path.dirname(source)
    })
    .execute();

await db
    .insertInto('cache_client')
    .values({
        client_id: Number(client.insertId),
        cache_id: cache.id
    })
    .execute();

process.exit(0);
