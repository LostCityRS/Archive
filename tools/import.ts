import { db } from '#/db/query.js';

import FileStream from '#/io/FileStream.js';
import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

async function createCache(game: string, build: string, era: string, timestamp?: string, newspost?: string) {
    if (era !== 'js5' && era !== 'ondemand' && era !== 'jag') {
        throw new Error(`Cache era must be js5, ondemand, or jag: "${era}" was provided`);
    }

    const cache = await db
        .insertInto('cache')
        .values({
            game,
            build,
            timestamp,
            newspost,

            js5: era === 'js5' ? 1 : 0,
            ondemand: era === 'ondemand' ? 1 : 0,
            jag: era === 'jag' ? 1 : 0
        })
        .executeTakeFirstOrThrow();

    return Number(cache.insertId);
}

async function importOnDemand(source: string, game: string, build: string, era: string, timestamp?: string, newspost?: string) {
    if (era === 'js5' || era === 'jag') {
        // todo: eventually support these
        return;
    }

    const cacheId = await createCache(game, build, era, timestamp, newspost);

    const stream = new FileStream(source);

    for (let i = 1; i < 9; i++) {
        const buf = stream.read(0, i);
        if (!buf) {
            // these files are always essential, we can fill in the crc later if we find it
            await db
                .insertInto('cache_ondemand')
                .values({
                    cache_id: cacheId,
                    archive: 0,
                    file: i,
                    version: 0,
                    crc: 0,
                    essential: 1
                })
                .execute();
            continue;
        }

        const crc = Packet.getcrc(buf, 0, buf.length);

        await db
            .insertInto('data_ondemand')
            .ignore()
            .values({
                game,
                archive: 0,
                file: i,
                version: 0,
                crc,
                bytes: Buffer.from(buf),
                len: buf.length
            })
            .execute();

        await db
            .insertInto('cache_ondemand')
            .values({
                cache_id: cacheId,
                archive: 0,
                file: i,
                version: 0,
                crc,
                essential: 1
            })
            .execute();
    }

    if (!stream.has(0, 5)) {
        // if a cache is missing versionlist (partially archived) then we have no info to reconstruct the other archives
        return;
    }

    const versionlist = new Jagfile(stream.read(0, 5)!);

    const versions: number[][] = [];
    const crcs: number[][] = [];
    const models: number[] = [];

    const version: string[] = ['model_version', 'anim_version', 'midi_version', 'map_version'];
    for (let i = 0; i < 4; i++) {
        const data = versionlist.read(version[i]);
        if (data) {
            const count = data.length / 2;
            const buf = new Packet(data);

            versions[i] = new Array(count);
            for (let j = 0; j < count; j++) {
                versions[i][j] = buf.g2();
            }
        } else {
            versions[i] = new Array(0);
        }
    }

    const crc: string[] = ['model_crc', 'anim_crc', 'midi_crc', 'map_crc'];
    for (let i = 0; i < 4; i++) {
        const data = versionlist.read(crc[i]);
        if (data) {
            const count = data.length / 4;
            const buf = new Packet(data);

            crcs[i] = new Array(count);
            for (let j = 0; j < count; j++) {
                crcs[i][j] = buf.g4();
            }
        } else {
            crcs[i] = new Array(0);
        }
    }

    let modelIndex = versionlist.read('model_index');
    if (modelIndex) {
        const count = versions[0].length;

        for (let i = 0; i < count; i++) {
            if (i < modelIndex.length) {
                models[i] = modelIndex[i];
            } else {
                models[i] = 0;
            }
        }
    }

    for (let archive = 0; archive < 4; archive++) {
        for (let file = 0; file < versions[archive].length; file++) {
            const version = versions[archive][file];
            const crc = crcs[archive][file];

            if (version === 0) {
                continue;
            }

            const essential = archive === 0 ? models[file] > 0 : true;

            await db
                .insertInto('cache_ondemand')
                .values({
                    cache_id: cacheId,
                    archive: archive + 1,
                    file,
                    version,
                    crc,
                    essential: essential ? 1 : 0
                })
                .execute();

            const buf = stream.read(archive + 1, file);
            if (buf) {
                const checksum = Packet.getcrc(buf, 0, buf.length - 2);
                if (checksum === crc) {
                    await db
                        .insertInto('data_ondemand')
                        .ignore()
                        .values({
                            game,
                            archive: archive + 1,
                            file,
                            version,
                            crc,
                            bytes: Buffer.from(buf),
                            len: buf.length
                        })
                        .execute();
                }
            }
        }
    }
}

const args = process.argv.slice(2);

if (args.length < 4) {
    process.exit(1);
}

try {
    await importOnDemand(args[0], args[1], args[2], args[3], args[4], args[5]);
} catch (err) {
    if (err instanceof Error) {
        console.log(err.message);
    }
}

process.exit(0);
