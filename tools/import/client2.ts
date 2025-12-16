import fs from 'fs';
import path from 'path';

import { db } from '#/db/query.js';

const args = process.argv.slice(2);

if (args.length < 1) {
    process.exit(1);
}

const [file, cacheId] = args;

const cache = await db.selectFrom('cache').selectAll().where('id', '=', parseInt(cacheId)).executeTakeFirstOrThrow();

const data = fs.readFileSync(file);

await db
    .insertInto('client')
    .values({
        game_id: cache.game_id,
        cache_id: cache.id,
        build: cache.build,
        name: path.basename(file),
        bytes: data,
        len: data.length
    })
    .execute();

process.exit(0);
