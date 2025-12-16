import fs from 'fs';
import path from 'path';

import { db } from '#/db/query.js';

const args = process.argv.slice(2);

if (args.length < 3) {
    console.error('args: <source> <game> <build>');
    process.exit(1);
}

const [source, gameName, build] = args;

const game = await db.selectFrom('game').selectAll().where('name', '=', gameName).executeTakeFirstOrThrow();

const data = fs.readFileSync(source);

const client = await db
    .insertInto('client')
    .values({
        game_id: game.id,
        build,
        name: path.basename(source),
        bytes: data,
        len: data.length
    })
    .executeTakeFirstOrThrow();

await db
    .insertInto('client_source')
    .values({
        client_id: Number(client.insertId),
        timestamp: fs.statSync(source).ctime,
        description: path.dirname(source)
    })
    .execute();

process.exit(0);
