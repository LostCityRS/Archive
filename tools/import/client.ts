import fs from 'fs';
import path from 'path';

import { db } from '#/db/query.js';

const args = process.argv.slice(2);

if (args.length < 1) {
    process.exit(1);
}

const [file, gameName, build, timestamp] = args;

const game = await db.selectFrom('game').selectAll().where('name', '=', gameName).executeTakeFirstOrThrow();

const data = fs.readFileSync(file);

await db
    .insertInto('client')
    .values({
        game_id: game.id,
        build,
        timestamp,
        name: path.basename(file),
        bytes: data,
        len: data.length
    })
    .execute();

process.exit(0);
