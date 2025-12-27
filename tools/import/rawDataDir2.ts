import fs from 'fs';

import { db } from '#/db/query.js';
import Packet from '#/io/Packet.js';
import { fromBase37 } from '#/util/JString.js';

const args = process.argv.slice(2);

if (args.length < 2) {
    process.exit(1);
}

const [gameName, dirName] = args;

const game = await db
    .selectFrom('game')
    .selectAll()
    .where('name', '=', gameName)
    .executeTakeFirstOrThrow();

const files = fs.readdirSync(dirName, { withFileTypes: true });
for (const file of files) {
    if (file.isDirectory()) {
        continue;
    }

    let name37 = 0n;
    try {
        name37 = BigInt(file.name);
    } catch (err) {
        continue;
    }

    const realName = fromBase37(name37);
    if (
        realName === 'invalid_name' ||
        realName === 'runescape_ja'
    ) {
        continue;
    }

    const buf = fs.readFileSync(`${dirName}/${file.name}`);
    const crc = Packet.getcrc(buf, 0, buf.length);
    const mtime = fs.statSync(`${dirName}/${file.name}`).mtime;

    console.log(realName, mtime, buf.length, crc);

    try {
        await db
            .insertInto('data_raw')
            .values({
                game_id: game.id,
                name: realName,
                crc,
                bytes: Buffer.from(buf),
                len: buf.length,
                timestamp: mtime < new Date('2015-01-01') ? mtime : null
            })
            .execute();
    } catch (err: any) {
        if (err.errno !== 1062) {
            console.log(err);
            process.exit(1);
        }

        if (mtime < new Date('2008-01-01')) {
            const old = await db
                .selectFrom('data_raw')
                .select(['timestamp', 'timestamp2'])
                .where('game_id', '=', game.id)
                .where('name', '=', realName)
                .where('crc', '=', crc)
                .executeTakeFirstOrThrow();

            if (old.timestamp === null || old.timestamp > mtime) {
                await db
                    .updateTable('data_raw')
                    .set({
                        timestamp: mtime
                    })
                    .where('game_id', '=', game.id)
                    .where('name', '=', realName)
                    .where('crc', '=', crc)
                    .execute();
            }

            if (old.timestamp && old.timestamp.getTime() !== mtime.getTime() && (old.timestamp2 === null || old.timestamp2 < mtime)) {
                await db
                    .updateTable('data_raw')
                    .set({
                        timestamp2: mtime
                    })
                    .where('game_id', '=', game.id)
                    .where('name', '=', realName)
                    .where('crc', '=', crc)
                    .execute();
            }
        }
    }
}

process.exit(0);
