import fs from 'fs';

import { db } from '#/db/query.js';

import FileStream from '#/io/FileStream.js';
import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';
import Js5LocalDiskCache from '#/js5/Js5LocalDiskCache.js';
import Js5Index from '#/js5/Js5Index.js';

async function createCache(gameName: string, build: string, era: string, timestamp?: string, newspost?: string) {
    if (era !== 'js5' && era !== 'ondemand' && era !== 'jag') {
        throw new Error(`Cache era must be js5, ondemand, or jag: "${era}" was provided`);
    }

    const game = await db
        .selectFrom('game')
        .selectAll()
        .where('name', '=', gameName)
        .executeTakeFirstOrThrow();

    const cache = await db
        .insertInto('cache')
        .values({
            game_id: game.id,
            build,
            timestamp,
            newspost,

            js5: era === 'js5' ? 1 : 0,
            ondemand: era === 'ondemand' ? 1 : 0,
            jag: era === 'jag' ? 1 : 0
        })
        .executeTakeFirstOrThrow();

    return {
        id: Number(cache.insertId),

        game_id: game.id,
        name: game.name,
        build,
        timestamp,
        newspost,

        js5: era === 'js5' ? 1 : 0,
        ondemand: era === 'ondemand' ? 1 : 0,
        jag: era === 'jag' ? 1 : 0
    };
}

async function saveJs5(cacheId: number, gameId: number, archive: number, group: number, version: number, crc: number, buf: Uint8Array | null) {
    await db
        .insertInto('cache_js5')
        .values({
            cache_id: cacheId,
            archive,
            group,
            version,
            crc
        })
        .execute();

    if (buf) {
        if (version !== 0 && crc !== 0) {
            if (Packet.checkcrc(buf, 0, buf.length - 4, crc)) {
                // 4 byte trailer
                buf = buf.subarray(0, buf.length - 4);
            } else if (Packet.checkcrc(buf, 0, buf.length - 2, crc)) {
                // 2 byte trailer
                buf = buf.subarray(0, buf.length - 2);
            } else if (!Packet.checkcrc(buf, 0, buf.length, crc)) {
                return;
            }
        }

        await db
            .insertInto('data_js5')
            .ignore()
            .values({
                game_id: gameId,
                archive,
                group,
                version,
                crc,
                bytes: Buffer.from(buf),
                len: buf.length
            })
            .execute();
    }
}

export async function importJs5(source: string, gameName: string, build: string, timestamp?: string, newspost?: string) {
    const cache = await createCache(gameName, build, 'js5', timestamp, newspost);

    const archives = fs.readFileSync(`${source}/main_file_cache.idx255`).length / 6;
    const stream = new Js5LocalDiskCache(source, archives);

    for (let archive = 0; archive < archives; archive++) {
        const index = stream.read(255, archive);
        if (!index) {
            console.error(build, 'skipping archive', archive);
            continue;
        }

        const js5 = new Js5Index(index);

        await saveJs5(cache.id, cache.game_id, 255, archive, js5.version, js5.crc, index);

        for (let i = 0; i < js5.size; i++) {
            const group = js5.groupIds[i];
            const version = js5.groupVersion[group];
            const crc = js5.groupChecksum[group];

            await saveJs5(cache.id, cache.game_id, archive, group, version, crc, stream.read(archive, group));
        }
    }
}

async function saveOnDemand(cacheId: number, gameId: number, archive: number, file: number, version: number, crc: number, essential: boolean, buf: Uint8Array | null) {
    await db
        .insertInto('cache_ondemand')
        .values({
            cache_id: cacheId,
            archive,
            file,
            version,
            crc,
            essential: essential ? 1 : 0
        })
        .execute();

    if (buf) {
        if (version !== 0 && crc !== 0) {
            if (Packet.checkcrc(buf, 0, buf.length - 2, crc)) {
                // 2 byte trailer
                buf = buf.subarray(0, buf.length - 2);
            } else if (!Packet.checkcrc(buf, 0, buf.length, crc)) {
                return;
            }
        }

        await db
            .insertInto('data_ondemand')
            .ignore()
            .values({
                game_id: gameId,
                archive,
                file,
                version,
                crc,
                bytes: Buffer.from(buf),
                len: buf.length
            })
            .execute();
    }
}

export async function importOnDemand(source: string, gameName: string, build: string, timestamp?: string, newspost?: string) {
    const cache = await createCache(gameName, build, 'ondemand', timestamp, newspost);

    const stream = new FileStream(source);

    for (let i = 1; i < 9; i++) {
        await saveOnDemand(cache.id, cache.game_id, 0, i, 0, 0, true, stream.read(0, i));
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
            await saveOnDemand(cache.id, cache.game_id, archive + 1, file, version, crc, essential, stream.read(archive + 1, file));
        }
    }
}

export async function importJag(source: string, gameName: string, build: string, timestamp?: string, newspost?: string) {
    const cache = await createCache(gameName, build, 'jag', timestamp, newspost);

    const files = fs.readdirSync(source);
    for (const file of files) {
        console.log(build, file);

        const buf = fs.readFileSync(`${source}/${file}`);
        const crc = Packet.getcrc(buf, 0, buf.length);

        await db
            .insertInto('cache_jag')
            .values({
                cache_id: cache.id,
                name: file,
                crc
            })
            .execute();

        await db
            .insertInto('data_jag')
            .ignore()
            .values({
                game_id: cache.game_id,
                name: file,
                crc,
                bytes: Buffer.from(buf),
                len: buf.length
            })
            .execute();
    }
}
