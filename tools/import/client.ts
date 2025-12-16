import fs from 'fs';
import path from 'path';

import { db } from '#/db/query.js';

const args = process.argv.slice(2);

if (args.length < 1) {
    process.exit(1);
}

const [file, gameName, build] = args;

const game = await db.selectFrom('game').selectAll().where('name', '=', gameName).executeTakeFirstOrThrow();

const data = fs.readFileSync(file);

const client = await db
    .insertInto('client')
    .values({
        game_id: game.id,
        build,
        name: path.basename(file),
        bytes: data,
        len: data.length
    })
    .executeTakeFirstOrThrow();

await db
    .insertInto('client_source')
    .values({
        client_id: Number(client.insertId),
        timestamp: fs.statSync(file).ctime,
        description: path.dirname(file)
    })
    .execute();

process.exit(0);
