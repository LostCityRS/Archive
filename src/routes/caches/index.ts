import fs from 'fs';

import { FastifyInstance } from 'fastify';
import { zipSync } from 'fflate';
import { sql } from 'kysely';

import { db } from '#/db/query.js';
import FileStreamWrite from '#/io/FileStreamWrite.js';
import Js5LocalDiskCacheWrite from '#/js5/Js5LocalDiskCacheWrite.js';

async function getCache(id: number) {
    return db
        .selectFrom('cache')
        .leftJoin(
            'game',
            (join) => join.onRef('game.id', '=', 'cache.game_id')
        )
        .where('cache.id', '=', id)
        .select([
            'cache.id', 'cache.game_id', 'game.name', 'game.display_name',
            'cache.build', 'cache.timestamp', 'cache.newspost',
            'cache.js5', 'cache.ondemand', 'cache.jag'
        ])
        .executeTakeFirstOrThrow();
}

async function listCacheFiles(cache: { id: number, game_id: number, js5: number, ondemand: number, jag: number }) {
    if (cache.js5) {
        return listCacheJs5Files(cache);
    } else if (cache.ondemand) {
        return listCacheOnDemandFiles(cache);
    } else if (cache.jag) {
        return listCacheJagFiles(cache);
    }

    return [];
}

async function listCacheJs5Files(cache: { id: number, game_id: number }) {
    return db
        .selectFrom('cache_js5')
        .select(['archive', 'group', 'version', 'crc'])
        .select(sql.raw('1').as('essential'))
        .select((eb) => [
            eb
                .case()
                .when(
                    eb.exists(
                        eb.selectFrom('data_js5')
                            .select(sql.raw('1').as('found'))
                            .where('data_js5.game_id', '=', cache.game_id)
                            .whereRef('data_js5.archive', '=', 'cache_js5.archive')
                            .whereRef('data_js5.group', '=', 'cache_js5.group')
                            .whereRef('data_js5.crc', '=', 'cache_js5.crc')
                    )
                )
                .then(1)
                .else(0)
                .end()
                .as('exists')
        ])
        .where('cache_id', '=', cache.id)
        .execute();
}

async function listCacheOnDemandFiles(cache: { id: number, game_id: number }) {
    return db
        .selectFrom('cache_ondemand')
        .select(['archive', 'file', 'version', 'crc', 'essential'])
        .select((eb) => [
            eb
                .case()
                .when(
                    eb.exists(
                        eb.selectFrom('data_ondemand')
                            .select(sql.raw('1').as('found'))
                            .where('data_ondemand.game_id', '=', cache.game_id)
                            .whereRef('data_ondemand.archive', '=', 'cache_ondemand.archive')
                            .whereRef('data_ondemand.file', '=', 'cache_ondemand.file')
                            .whereRef('data_ondemand.crc', '=', 'cache_ondemand.crc')
                    )
                )
                .then(1)
                .else(0)
                .end()
                .as('exists')
        ])
        .where('cache_id', '=', cache.id)
        .execute();
}

async function listCacheJagFiles(cache: { id: number, game_id: number }) {
    return db
        .selectFrom('cache_jag')
        .select(['name', 'crc'])
        .select(sql.raw('1').as('essential'))
        .select((eb) => [
            eb
                .case()
                .when(
                    eb.exists(
                        eb.selectFrom('data_jag')
                            .select(sql.raw('1').as('found'))
                            .where('data_jag.game_id', '=', cache.game_id)
                            .whereRef('data_jag.name', '=', 'cache_jag.name')
                            .whereRef('data_jag.crc', '=', 'cache_jag.crc')
                    )
                )
                .then(1)
                .else(0)
                .end()
                .as('exists')
        ])
        .where('cache_id', '=', cache.id)
        .execute();
}

export default async function (app: FastifyInstance) {
    // get by db id
    // app.get('/:id', async (req: any, reply) => {
    // });

    // get by revision (easy shorthand, if possible)
    // app.get('/:game/:build', async (req: any, reply) => {
    // });

    // produce a zip of individual cache files for the user
    app.get('/:id/files.zip', async (req: any, reply) => {
        // todo: is it possible to stream instead of working in memory?

        const { id } = req.params;

        if (id.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await getCache(id);

        const zip: Record<string, Buffer> = {};

        if (cache.js5) {
            const cacheData = await db
                .selectFrom('cache_js5')
                .leftJoin(
                    'data_js5',
                    (join) => join
                        .on('data_js5.game_id', '=', cache.game_id)
                        .onRef('data_js5.archive', '=', 'cache_js5.archive')
                        .onRef('data_js5.group', '=', 'cache_js5.group')
                        .onRef('data_js5.version', '=', 'cache_js5.version')
                        .onRef('data_js5.crc', '=', 'cache_js5.crc')
                )
                .where('cache_id', '=', cache.id)
                .select(['cache_js5.archive', 'cache_js5.group', 'data_js5.bytes'])
                .execute();

            for (const data of cacheData) {
                if (data.bytes) {
                    zip[`${data.archive}/${data.group}.dat`] = data.bytes;
                }
            }
        } else if (cache.ondemand) {
            const cacheData = await db
                .selectFrom('cache_ondemand')
                .leftJoin(
                    'data_ondemand',
                    (join) => join
                        .on('data_ondemand.game_id', '=', cache.game_id)
                        .onRef('data_ondemand.archive', '=', 'cache_ondemand.archive')
                        .onRef('data_ondemand.file', '=', 'cache_ondemand.file')
                        .onRef('data_ondemand.version', '=', 'cache_ondemand.version')
                        .onRef('data_ondemand.crc', '=', 'cache_ondemand.crc')
                )
                .where('cache_id', '=', cache.id)
                .select(['cache_ondemand.archive', 'cache_ondemand.file', 'data_ondemand.bytes'])
                .execute();

            for (const data of cacheData) {
                if (data.bytes) {
                    zip[`${data.archive}/${data.file}.dat`] = data.bytes;
                }
            }
        } else if (cache.jag) {
            const cacheData = await db
                .selectFrom('cache_jag')
                .leftJoin(
                    'data_jag',
                    (join) => join
                        .on('data_jag.game_id', '=', cache.game_id)
                        .onRef('data_jag.name', '=', 'cache_jag.name')
                        .onRef('data_jag.crc', '=', 'cache_jag.crc')
                )
                .where('cache_id', '=', cache.id)
                .select(['cache_jag.name', 'data_jag.bytes'])
                .execute();

            for (const data of cacheData) {
                if (data.bytes) {
                    zip[data.name] = data.bytes;
                }
            }
        }

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="cache-${cache.name}-${cache.build}-files-lostcity#${cache.id}.zip"`);
        reply.send(zipSync(zip, { level: 0 }));
    });

    // produce a cache in the client format and zip it for the user
    app.get('/:id/cache.zip', async (req: any, reply) => {
        // todo: is it possible to stream instead of working locally?
        // todo: expose control over packing music to fit large rs3 caches?
        // todo: offer jcache too?

        const { id } = req.params;

        if (id.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await getCache(id);

        const zip: Record<string, Buffer> = {};

        if (cache.js5) {
            const cacheData = await db
                .selectFrom('cache_js5')
                .leftJoin(
                    'data_js5',
                    (join) => join
                        .on('data_js5.game_id', '=', cache.game_id)
                        .onRef('data_js5.archive', '=', 'cache_js5.archive')
                        .onRef('data_js5.group', '=', 'cache_js5.group')
                        .onRef('data_js5.version', '=', 'cache_js5.version')
                        .onRef('data_js5.crc', '=', 'cache_js5.crc')
                )
                .where('cache_id', '=', cache.id)
                .select(['cache_js5.archive', 'cache_js5.group', 'cache_js5.version', 'data_js5.bytes'])
                .execute();

            const { archives } = await db
                .selectFrom('cache_js5')
                .select(db.fn.max('archive').as('archives'))
                .where('cache_id', '=', cache.id)
                .where('archive', '<', 255)
                .executeTakeFirstOrThrow();

            const tempDir = `data/work/${Date.now()}`;
            const stream = new Js5LocalDiskCacheWrite(tempDir, archives + 1);

            for (const data of cacheData) {
                if (data.bytes) {
                    stream.write(data.archive, data.group, data.bytes, data.version);
                }
            }

            const files = fs.readdirSync(tempDir);
            for (const file of files) {
                zip[file] = fs.readFileSync(`${tempDir}/${file}`);
            }

            fs.rmSync(tempDir, { recursive: true, force: true });
        } else if (cache.ondemand) {
            const cacheData = await db
                .selectFrom('cache_ondemand')
                .leftJoin(
                    'data_ondemand',
                    (join) => join
                        .on('data_ondemand.game_id', '=', cache.game_id)
                        .onRef('data_ondemand.archive', '=', 'cache_ondemand.archive')
                        .onRef('data_ondemand.file', '=', 'cache_ondemand.file')
                        .onRef('data_ondemand.version', '=', 'cache_ondemand.version')
                        .onRef('data_ondemand.crc', '=', 'cache_ondemand.crc')
                )
                .where('cache_id', '=', cache.id)
                .select(['cache_ondemand.archive', 'cache_ondemand.file', 'cache_ondemand.version', 'data_ondemand.bytes'])
                .orderBy('archive', 'asc')
                .orderBy('file', 'asc')
                .execute();

            const tempDir = `data/work/${Date.now()}`;
            const stream = new FileStreamWrite(tempDir);

            for (const data of cacheData) {
                if (data.bytes) {
                    stream.write(data.archive, data.file, data.bytes, data.version);
                }
            }

            const files = fs.readdirSync(tempDir);
            for (const file of files) {
                zip[file] = fs.readFileSync(`${tempDir}/${file}`);
            }

            fs.rmSync(tempDir, { recursive: true, force: true });
        } else if (cache.jag) {
            const cacheData = await db
                .selectFrom('cache_jag')
                .leftJoin(
                    'data_jag',
                    (join) => join
                        .on('data_jag.game_id', '=', cache.game_id)
                        .onRef('data_jag.name', '=', 'cache_jag.name')
                        .onRef('data_jag.crc', '=', 'cache_jag.crc')
                )
                .where('cache_id', '=', cache.id)
                .select(['cache_jag.name', 'data_jag.bytes'])
                .execute();

            for (const data of cacheData) {
                if (data.bytes) {
                    zip[data.name] = data.bytes;
                }
            }
        }

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="cache-${cache.name}-${cache.build}-lostcity#${cache.id}.zip"`);
        reply.send(zipSync(zip, { level: 1 }));
    });

    // produce individual cache files for the user (cache_js5)
    app.get('/:id/js5/:archive/:group', async (req: any, reply) => {
        const { id, archive, group } = req.params;

        if (id.length === 0 || archive.length === 0 || group.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await db
            .selectFrom('cache')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        const cacheData = await db
            .selectFrom('cache_js5')
            .selectAll()
            .where('archive', '=', archive)
            .where('group', '=', group)
            .executeTakeFirstOrThrow();

        const data = await db
            .selectFrom('data_js5')
            .selectAll()
            .where('game_id', '=', cache.game_id)
            .where('archive', '=', archive)
            .where('group', '=', group)
            .where('version', '=', cacheData.version)
            .where('crc', '=', cacheData.crc)
            .executeTakeFirstOrThrow();

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="${group}.dat"`);
        reply.send(data.bytes);
    });

    // produce individual cache files for the user (cache_ondemand)
    app.get('/:id/ondemand/:archive/:file', async (req: any, reply) => {
        const { id, archive, file } = req.params;

        if (id.length === 0 || archive.length === 0 || file.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await db
            .selectFrom('cache')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        const cacheData = await db
            .selectFrom('cache_ondemand')
            .selectAll()
            .where('archive', '=', archive)
            .where('file', '=', file)
            .executeTakeFirstOrThrow();

        const data = await db
            .selectFrom('data_ondemand')
            .selectAll()
            .where('game_id', '=', cache.game_id)
            .where('archive', '=', archive)
            .where('file', '=', file)
            .where('version', '=', cacheData.version)
            .where('crc', '=', cacheData.crc)
            .executeTakeFirstOrThrow();

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="${file}.dat"`);
        reply.send(data.bytes);
    });

    // produce individual cache files for the user (cache_jag)
    app.get('/:id/jag/:name', async (req: any, reply) => {
        const { id, name } = req.params;

        if (id.length === 0 || name.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await db
            .selectFrom('cache')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        const cacheData = await db
            .selectFrom('cache_jag')
            .selectAll()
            .where('name', '=', name)
            .executeTakeFirstOrThrow();

        const data = await db
            .selectFrom('data_jag')
            .selectAll()
            .where('game_id', '=', cache.game_id)
            .where('name', '=', name)
            .where('crc', '=', cacheData.crc)
            .executeTakeFirstOrThrow();

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="${name}"`);
        reply.send(data.bytes);
    });
}
