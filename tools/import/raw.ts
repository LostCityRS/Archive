import fs from 'fs';

import { db } from '#/db/query.js';
import Packet from '#/io/Packet.js';
import path from 'path';

const args = process.argv.slice(2);

if (args.length < 2) {
    process.exit(1);
}

const [gameName, fileName] = args;

const game = await db
    .selectFrom('game')
    .selectAll()
    .where('name', '=', gameName)
    .executeTakeFirstOrThrow();

const buf = fs.readFileSync(fileName);

const name = path.basename(fileName);
const crc = Packet.getcrc(buf, 0, buf.length);

await db
    .insertInto('data_raw')
    .ignore()
    .values({
        game_id: game.id,
        name,
        crc,
        bytes: Buffer.from(buf),
        len: buf.length
    })
    .execute();

console.log(name, crc, buf.length);

process.exit(0);
