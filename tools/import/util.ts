import fs from 'fs';

import { db } from '#/db/query.js';

import FileStream from '#/io/FileStream.js';
import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';
import Js5LocalDiskCache from '#/js5/Js5LocalDiskCache.js';
import Js5Index from '#/js5/Js5Index.js';
import { fromBase37 } from '#/util/JString.js';

async function createCache(gameName: string, build: string, versioned: boolean) {
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

            versioned: versioned ? 1 : 0
        })
        .executeTakeFirstOrThrow();

    return {
        id: Number(cache.insertId),
        game_id: game.id
    };
}

async function saveJs5(cacheId: number, gameId: number, archive: number, group: number, version: number, crc: number, buf: Uint8Array | null) {
    if (buf) {
        if (version !== 0 || crc !== 0) {
            if (Packet.checkcrc(buf, 0, buf.length - 2, crc)) {
                // 2 byte trailer
                buf = buf.subarray(0, buf.length - 2);
            } else if (!Packet.checkcrc(buf, 0, buf.length, crc)) {
                return;
            }
        } else {
            crc = Packet.getcrc(buf, 0, buf.length);
        }

        await db
            .insertInto('data_versioned')
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

    await db
        .insertInto('cache_versioned')
        .ignore()
        .values({
            cache_id: cacheId,
            archive,
            group,
            version,
            crc
        })
        .execute();
}

export async function importJs5(source: string, gameName: string, build: string) {
    const archives = fs.readFileSync(`${source}/main_file_cache.idx255`).length / 6;
    const stream = new Js5LocalDiskCache(source, archives);

    // check if exact cache was added already
    const archiveCrcs = new Int32Array(archives);
    for (let i = 0; i < archives; i++) {
        const buf = stream.read(255, i);
        if (buf) {
            archiveCrcs[i] = Packet.getcrc(buf, 0, buf.length);
        }
    }

    const all = await db
        .selectFrom('cache')
        .selectAll()
        .where('versioned', '=', 1)
        .execute();

    let cache;
    for (const test of all) {
        const index = await db
            .selectFrom('cache_versioned')
            .selectAll()
            .where('cache_id', '=', test.id)
            .where('archive', '=', 255)
            .execute();

        let matches = 0;
        for (const js5 of index) {
            if (archiveCrcs[js5.group] === js5.crc) {
                matches++;
            }
        }
        if (matches === archives) {
            cache = test;
            break;
        }
    }

    if (typeof cache === 'undefined') {
        cache = await createCache(gameName, build, true);
    }

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

    await recalculateStats(cache.id);
    return cache;
}

export async function importJs5WithoutIndex(source: string, gameName: string, build: string) {
    let archives = 0;
    for (let archive = 0; archive < 255; archive++) {
        if (fs.existsSync(`${source}/main_file_cache.idx${archive}`)) {
            archives = archive + 1;
        }
    }

    const stream = new Js5LocalDiskCache(source, archives);
    const cache = await createCache(gameName, build, true);

    // attempt to save any js5index that does exist, then fall back to dumping every archive
    let saved = [];
    for (let archive = 0; archive < archives; archive++) {
        const index = stream.read(255, archive);
        if (!index) {
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

        saved.push(archive);
    }

    for (let archive = 0; archive < archives; archive++) {
        if (saved.indexOf(archive) !== -1) {
            continue;
        }

        const groups = stream.count(archive);

        for (let group = 0; group < groups; group++) {
            const data = stream.read(archive, group);
            if (!data) {
                continue;
            }

            const buf = new Packet(data);
            buf.pos = buf.length - 2;
            const version = buf.g2();
            const crc = Packet.getcrc(data, 0, data.length - 2);

            await saveJs5(cache.id, cache.game_id, archive, group, version, crc, data);
        }
    }

    await recalculateStats(cache.id);
    return cache;
}

async function saveOnDemand(cacheId: number, gameId: number, archive: number, group: number, version: number, crc: number, buf: Uint8Array | null) {
    if (buf) {
        if (version !== 0 || crc !== 0) {
            if (Packet.checkcrc(buf, 0, buf.length - 2, crc)) {
                // 2 byte trailer
                buf = buf.subarray(0, buf.length - 2);
            } else if (!Packet.checkcrc(buf, 0, buf.length, crc)) {
                return;
            }
        } else {
            crc = Packet.getcrc(buf, 0, buf.length);
        }

        await db
            .insertInto('data_versioned')
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

    await db
        .insertInto('cache_versioned')
        .ignore()
        .values({
            cache_id: cacheId,
            archive,
            group,
            version,
            crc
        })
        .execute();
}

export async function importOnDemand(source: string, gameName: string, build: string, force?: string) {
    const stream = new FileStream(source);

    // check if exact cache was added already
    const jagCrcs = new Int32Array(9);
    for (let i = 1; i < 9; i++) {
        const buf = stream.read(0, i);
        if (buf) {
            jagCrcs[i] = Packet.getcrc(buf, 0, buf.length);
        }
    }

    const all = await db
        .selectFrom('cache')
        .selectAll()
        .where('versioned', '=', 1)
        .execute();

    let cache;
    if (typeof force === 'undefined' || force !== 'true') {
        for (const test of all) {
            const jags = await db
                .selectFrom('cache_versioned')
                .selectAll()
                .where('cache_id', '=', test.id)
                .where('archive', '=', 0)
                .execute();

            let matches = 0;
            for (const jag of jags) {
                if (jagCrcs[jag.group] === jag.crc) {
                    matches++;
                }
            }
            if (matches === 8) {
                cache = test;
                break;
            }
        }
    }

    if (typeof cache === 'undefined') {
        cache = await createCache(gameName, build, true);
    }

    for (let i = 1; i < 9; i++) {
        await saveOnDemand(cache.id, cache.game_id, 0, i, 0, 0, stream.read(0, i));
    }

    if (!stream.has(0, 5)) {
        // if a cache is missing versionlist (partially archived) then we have no info to reconstruct the other archives
        await recalculateStats(cache.id);
        return;
    }

    const versionlist = new Jagfile(stream.read(0, 5)!);

    const versions: number[][] = [];
    const crcs: number[][] = [];

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

    for (let archive = 0; archive < 4; archive++) {
        for (let file = 0; file < versions[archive].length; file++) {
            const version = versions[archive][file];
            const crc = crcs[archive][file];

            if (version === 0) {
                continue;
            }

            await saveOnDemand(cache.id, cache.game_id, archive + 1, file, version - 1, crc, stream.read(archive + 1, file));
        }
    }

    await recalculateStats(cache.id);
    return cache;
}

export async function importRaw(source: string, gameName: string, build: string) {
    const cache = await createCache(gameName, build, false);

    const files = fs.readdirSync(source, { withFileTypes: true });
    for (const file of files) {
        if (file.isDirectory()) {
            continue;
        }

        const buf = fs.readFileSync(`${source}/${file.name}`);
        const crc = Packet.getcrc(buf, 0, buf.length);

        await db
            .insertInto('cache_raw')
            .values({
                cache_id: cache.id,
                name: file.name,
                crc
            })
            .execute();

        await db
            .insertInto('data_raw')
            .ignore()
            .values({
                game_id: cache.game_id,
                name: file.name,
                crc,
                bytes: Buffer.from(buf),
                len: buf.length
            })
            .execute();
    }

    await recalculateStats(cache.id);
    return cache;
}

export async function importEarlyRs2(source: string, gameName: string, build: string, force?: string) {
    const game = await db
        .selectFrom('game')
        .selectAll()
        .where('name', '=', gameName)
        .executeTakeFirstOrThrow();

    let cache = await db
        .selectFrom('cache')
        .select(['id', 'game_id'])
        .where('game_id', '=', game.id)
        .where('build', '=', build)
        .executeTakeFirst();

    if (typeof cache === 'undefined') {
        cache = await createCache(gameName, build, false);
    }

    const files = fs.readdirSync(source, { withFileTypes: true });
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

        const buf = fs.readFileSync(`${source}/${file.name}`);
        const crc = Packet.getcrc(buf, 0, buf.length);
        const mtime = fs.statSync(`${source}/${file.name}`).mtime;

        await db
            .insertInto('cache_raw')
            .ignore()
            .values({
                cache_id: cache.id,
                name: realName,
                crc
            })
            .execute();

        try {
            await db
                .insertInto('data_raw')
                .values({
                    game_id: cache.game_id,
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

            if (mtime < new Date('2015-01-01')) {
                const old = await db
                    .selectFrom('data_raw')
                    .select('timestamp')
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
            }
        }
    }

    await recalculateStats(cache.id);
    return cache;
}

export async function recalculateStats(cacheId: number) {
    const cache = await db
        .selectFrom('cache')
        .select(['id', 'game_id', 'versioned'])
        .where('id', '=', cacheId)
        .executeTakeFirstOrThrow();

    if (cache.versioned) {
        const cacheData = await db
            .selectFrom('cache_versioned')
            .leftJoin(
                'data_versioned',
                (join) => join
                    .on('data_versioned.game_id', '=', cache.game_id)
                    .onRef('data_versioned.archive', '=', 'cache_versioned.archive')
                    .onRef('data_versioned.group', '=', 'cache_versioned.group')
                    .onRef('data_versioned.version', '=', 'cache_versioned.version')
                    .onRef('data_versioned.crc', '=', 'cache_versioned.crc')
            )
            .select(['data_versioned.len'])
            // .select(['cache_versioned.archive', 'cache_versioned.group', 'data_versioned.len'])
            .where('cache_id', '=', cache.id)
            .execute();

        // await db.deleteFrom('cache_versioned_stats').where('cache_id', '=', cache.id).execute();

        let missing = 0;
        let total = 0;
        let len = 0;
        for (const data of cacheData) {
            if (data.len !== null) {
                len += data.len;

                // await db
                //     .insertInto('cache_versioned_stats')
                //     .values({
                //         cache_id: cache.id,
                //         archive: data.archive,
                //         group: data.group,
                //         len: data.len
                //     })
                //     .execute();
            } else {
                missing++;
            }

            total++;
        }

        await db
            .updateTable('cache')
            .set({
                missing,
                total,
                len
            })
            .where('id', '=', cache.id)
            .execute();
    } else {
        const cacheData = await db
            .selectFrom('cache_raw')
            .leftJoin(
                'data_raw',
                (join) => join
                    .on('data_raw.game_id', '=', cache.game_id)
                    .onRef('data_raw.name', '=', 'cache_raw.name')
                    .onRef('data_raw.crc', '=', 'cache_raw.crc')
            )
            .select(['data_raw.len'])
            // .select(['cache_raw.name', 'data_raw.len'])
            .where('cache_id', '=', cache.id)
            .execute();

        // await db.deleteFrom('cache_raw_stats').where('cache_id', '=', cache.id).execute();

        let missing = 0;
        let total = 0;
        let len = 0;
        for (const data of cacheData) {
            if (data.len !== null) {
                len += data.len;

                // await db
                //     .insertInto('cache_raw_stats')
                //     .values({
                //         cache_id: cache.id,
                //         name: data.name,
                //         len: data.len
                //     })
                //     .execute();
            } else {
                missing++;
            }

            total++;
        }

        await db
            .updateTable('cache')
            .set({
                missing,
                total,
                len
            })
            .where('id', '=', cache.id)
            .execute();
    }
}
