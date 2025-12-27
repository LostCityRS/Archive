import { pipeline } from 'stream/promises';

import { makeZip } from 'client-zip';
import { FastifyInstance } from 'fastify';

import { db, cacheExecute, cacheExecuteTakeFirst, cacheExecuteTakeFirstOrThrow } from '#/db/query.js';
import { buildQueryString } from '#/util/Filters.js';

import FileStreamAsync from '#/io/FileStreamAsync.js';

import Js5LocalDiskCacheAsync from '#/js5/Js5LocalDiskCacheAsync.js';
import { sql } from 'kysely';

async function getCache(id: number) {
    return cacheExecuteTakeFirstOrThrow(`cache_${id}`, db
        .selectFrom('cache')
        .selectAll()
        .leftJoin(
            'game',
            (join) => join.onRef('game.id', '=', 'cache.game_id')
        )
        .select(['cache.id', 'game.name', 'game.display_name'])
        .where('cache.id', '=', id)
    );
}

// async function getVersionedMetaData(cacheId: number, gameId: number) {
//     const cacheData = db
//         .selectFrom('cache_versioned_stats')
//         .selectAll()
//         .where('cache_id', '=', cacheId)
//         .orderBy('cache_versioned_stats.archive', 'asc')
//         .stream();

//     const meta = [];
//     for await (const data of cacheData) {
//         await new Promise(setImmediate);

//         meta.push({
//             name: `${data.archive}/${data.group}.dat`,
//             size: data.len
//         });
//     }
//     return meta;
// }

async function* getVersionedData(cacheId: number, gameId: number) {
    const cacheData = db
        .selectFrom('cache_versioned')
        .leftJoin(
            'data_versioned',
            (join) => join
                .on('data_versioned.game_id', '=', gameId)
                .onRef('data_versioned.archive', '=', 'cache_versioned.archive')
                .onRef('data_versioned.group', '=', 'cache_versioned.group')
                .onRef('data_versioned.version', '=', 'cache_versioned.version')
                .onRef('data_versioned.crc', '=', 'cache_versioned.crc')
        )
        .where('cache_id', '=', cacheId)
        .select(['cache_versioned.archive', 'cache_versioned.group', 'cache_versioned.version', 'data_versioned.bytes'])
        .orderBy('cache_versioned.archive', 'asc')
        .stream();

    for await (const data of cacheData) {
        if (!data.bytes?.length) continue;

        await new Promise(setImmediate);

        yield {
            archive: data.archive,
            group: data.group,
            version: data.version,
            bytes: data.bytes
        }
    }
}

async function* getVersionedDataZip(cacheId: number, gameId: number) {
    for await (const data of getVersionedData(cacheId, gameId)) {
        yield {
            name: `${data.archive}/${data.group}.dat`,
            size: data.bytes.length,
            input: new Uint8Array(data.bytes)
        };
    }
}

// async function getRawMetaData(cacheId: number, gameId: number) {
//     const cacheData = db
//         .selectFrom('cache_raw_stats')
//         .selectAll()
//         .where('cache_id', '=', cacheId)
//         .orderBy('cache_raw_stats.name', 'asc')
//         .stream();

//     const meta = [];
//     for await (const data of cacheData) {
//         await new Promise(setImmediate);

//         meta.push({
//             name: data.name,
//             size: data.len
//         });
//     }
//     return meta;
// }

async function* getRawDataZip(cacheId: number, gameId: number) {
    const cacheData = db
        .selectFrom('cache_raw')
        .leftJoin(
            'data_raw',
            (join) => join
                .on('data_raw.game_id', '=', gameId)
                .onRef('data_raw.name', '=', 'cache_raw.name')
                .onRef('data_raw.crc', '=', 'cache_raw.crc')
        )
        .where('cache_id', '=', cacheId)
        .select(['cache_raw.name', 'data_raw.bytes', 'data_raw.timestamp'])
        .orderBy('cache_raw.name', 'asc')
        .stream();

    for await (const data of cacheData) {
        if (!data.bytes?.length) continue;

        await new Promise(setImmediate);

        yield {
            name: data.name,
            size: data.bytes.length,
            input: new Uint8Array(data.bytes),
            // zip lib expects "undefined" not null
            lastModified: data.timestamp ?? undefined
        };
    }
}

export default async function (app: FastifyInstance) {
    app.get('/list', async (req, reply) => {
        const start = Date.now();

        const { 
            page: pageParam = "1", 
            limit: limitParam = "25", 
            sort, 
            order,
            game,
            archivedMin,
            archivedMax
        } = req.query as { 
            page?: string, 
            limit?: string, 
            sort?: "name" | "count", 
            order?: "asc" | "desc",
            game?: string,
            archivedMin?: string,
            archivedMax?: string
        };
        const page = parseInt(pageParam), limit = parseInt(limitParam);

        let baseQuery = db
            .selectFrom('game')
            .select(['game.name', 'game.display_name'])
            .leftJoin(
                'cache',
                (join) => join.onRef('game.id', '=', 'cache.game_id')
            )
            .select(db.fn.count('cache.id').as('count'))
            .groupBy('game.id');

        // Filter by game name
        if (game && game.trim() !== '') {
            const term = `%${game.trim()}%`;
            baseQuery = baseQuery.where(({ eb }) =>
                eb('game.name', 'like', term).or('game.display_name', 'like', term),
            );
        }

        // Filter by archived count
        if (archivedMin && !isNaN(parseInt(archivedMin))) {
            baseQuery = baseQuery.having(db.fn.count('cache.id'), '>=', parseInt(archivedMin));
        }
        if (archivedMax && !isNaN(parseInt(archivedMax))) {
            baseQuery = baseQuery.having(db.fn.count('cache.id'), '<=', parseInt(archivedMax));
        }

        // Get max archived count for filter UI
        const archivedMaxRow = await cacheExecuteTakeFirst(`caches_archived_max`, db
            .selectFrom(
                db.selectFrom('cache')
                    .select(db.fn.count('id').as('count'))
                    .groupBy('game_id')
                    .as('t')
                )
            .select(eb => eb.fn.max('count').as('max'))
        );
        const archivedMaxRowCount = archivedMaxRow?.max ?? 0;

        if (sort === undefined) {
            baseQuery = baseQuery.orderBy(
                sql`CASE
                    WHEN game.name = 'runescape' THEN 0
                    WHEN game.name = 'rsclassic' THEN 1
                    WHEN game.name = 'oldscape' THEN 2
                    ELSE 3
                END`
            ).orderBy('name', 'asc');
        } else {
            baseQuery = baseQuery.orderBy(sort, order)
        }

        const cacheKey = [
            'caches_list',
            `page_${page}`,
            `limit_${limit}`,
            `sort_${sort || 'default'}`,
            `order_${order || 'asc'}`,
            game ? `game_${game}` : '',
            archivedMin !== undefined ? `amin_${archivedMin}` : '',
            archivedMax !== undefined ? `amax_${archivedMax}` : '',
        ].join('_');

        const games = await cacheExecute(cacheKey,
            baseQuery.limit(limit).offset((page - 1) * limit)
        );

        const totalRecords = await cacheExecuteTakeFirst(`${cacheKey}_totalrecords`,
            db.selectFrom(baseQuery.as('g'))
                .select(db.fn.countAll().as('count'))
        );
        const totalPages = totalRecords ? Math.ceil(totalRecords.count / limit) : 0;

        const timeTaken = Date.now() - start;

        return reply.view('caches/index', {
            buildQueryString,
            games,
            stats: {
                timeTaken,
            },
            pagination: {
                page,
                limit,
                totalRecords: totalRecords.count,
                totalPages
            },
            filters: {
                ...(sort !== undefined && { sort }),
                ...(order !== undefined && { order }),
                ...(game && { game }),
                archivedMaxRow: [archivedMaxRowCount],
                archivedMin: archivedMin !== undefined ? parseInt(archivedMin, 10) : 0,
                archivedMax: archivedMax !== undefined ? parseInt(archivedMax, 10) : archivedMaxRowCount
            },
            title: 'Caches',
            icon: 'database-zap',
        });
    });

    app.get('/list/:gameName', async (req: any, reply) => {
        const start = Date.now();

        const { gameName } = req.params;

        if (gameName.length === 0) {
            return reply.redirect('/', 302);
        }

        const game = await cacheExecuteTakeFirstOrThrow(`game_${gameName}`, db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName)
        );

        const caches = await cacheExecute(`caches_${gameName}`, db
            .selectFrom('cache')
            .selectAll()
            .where('game_id', '=', game.id)
        );

        // sort build as a revision
        caches.sort((a: any, b: any) => a.build.indexOf('-') === -1 && b.build.indexOf('-') === -1 ? parseInt(a.build) - parseInt(b.build) : 0);
        // sort build as a date
        caches.sort((a: any, b: any) => a.build.indexOf('-') !== -1 && b.build.indexOf('-') !== -1 ? new Date(a.build).valueOf() - new Date(b.build).valueOf() : 0);

        const timeTaken = Date.now() - start;
        return reply.view('caches/list', {
            game,
            caches,
            stats: {
                timeTaken
            },
            title: `${game.display_name} Caches`,
            icon: 'database-zap',
            breadcrumbs: [{ label: 'Caches', href: '/caches/list' }]
        });
    });

    // get by db id
    app.get('/:id', async (req: any, reply) => {
        const start = Date.now();

        const { id } = req.params;

        if (id.length === 0) {
            return reply.redirect('/', 302);
        }

        const cache = await getCache(id);

        const clients = await db
            .selectFrom('cache_client')
            .leftJoin(
                'client',
                (join) => join.onRef('cache_client.client_id', '=', 'client.id')
            )
            .select(['id', 'timestamp', 'name', 'len'])
            .where('cache_id', '=', id)
            .execute();

        let data: any[] = [];
        if (!cache.versioned) {
            data = await cacheExecute(`cache_raw_${id}`, db
                .selectFrom('cache_raw')
                .leftJoin(
                    'data_raw',
                    (join) => join
                        .on('data_raw.game_id', '=', cache.game_id)
                        .onRef('data_raw.name', '=', 'cache_raw.name')
                        .onRef('data_raw.crc', '=', 'cache_raw.crc')
                )
                .select(['name', 'crc', 'data_raw.len', 'data_raw.timestamp', 'data_raw.timestamp2'])
                .where('cache_id', '=', cache.id)
            );
        }

        const timeTaken = Date.now() - start;
        return reply.view('caches/build', {
            cache,
            clients,
            data,
            stats: {
                timeTaken
            },
            title: `${cache.display_name} ${cache.build} Cache`,
            breadcrumbs: [
                { label: 'Caches', href: '/' },
                { label: `${cache.display_name} Caches`, href: `/caches/list/${cache.name}` }
            ]
        });
    });

    // produce a zip of individual cache files for the user
    app.get('/:id/files.zip', async (req: any, reply) => {
        const { id } = req.params;

        if (id.length === 0) {
            return reply.redirect('/', 302);
        }

        const cache = await getCache(id);

        const controller = new AbortController();
        req.raw.on('close', () => {
            if (req.raw.aborted) {
                controller.abort();
            }
        });

        reply.hijack();

        if (cache.versioned) {
            reply.raw.writeHead(200, {
                'content-type': 'application/zip',
                'content-disposition': `attachment; filename="files-${cache.name}-${cache.build}-lostcity#${cache.id}.zip"`,
                // adds extra time but may be worth it for the user to see a download estimate
                // 'content-length': predictLength(await getVersionedMetaData(cache.id, cache.game_id)).toString()
            });

            const zip = makeZip(getVersionedDataZip(cache.id, cache.game_id));
            pipeline(zip, reply.raw, { signal: controller.signal }).catch(() => {});
        } else {
            reply.raw.writeHead(200, {
                'content-type': 'application/zip',
                'content-disposition': `attachment; filename="files-${cache.name}-${cache.build}-lostcity#${cache.id}.zip"`,
                // adds extra time but may be worth it for the user to see a download estimate
                // 'content-length': predictLength(await getRawMetaData(cache.id, cache.game_id)).toString()
            });

            const zip = makeZip(getRawDataZip(cache.id, cache.game_id));
            pipeline(zip, reply.raw, { signal: controller.signal }).catch(() => {});
        }
    });

    // produce a cache in the client format and zip it for the user
    // todo: expose control over packing music to fit large rs3 caches?
    app.get('/:id/cache.zip', async (req: any, reply) => {
        const { id } = req.params;

        if (id.length === 0) {
            return reply.redirect('/', 302);
        }

        const cache = await getCache(id);

        if (!cache.versioned) {
            return reply.redirect(`/caches/${cache.id}/files.zip`, 302);
        }

        reply.hijack();
        reply.raw.writeHead(200, {
            'content-type': 'application/zip',
            'content-disposition': `attachment; filename="cache-${cache.name}-${cache.build}-lostcity#${cache.id}.zip"`,
            // todo: precalculate size
        });

        const controller = new AbortController();
        req.raw.on('close', () => {
            if (req.raw.aborted) {
                controller.abort();
            }
        });

        const archive255 = await cacheExecute(`cache_${cache.id}_archives255`, db
            .selectFrom('cache_versioned')
            .select('group')
            .where('cache_id', '=', cache.id)
            .where('archive', '=', 255)
        );

        const { archives } = await cacheExecuteTakeFirstOrThrow(`cache_${cache.id}_archives`, db
            .selectFrom('cache_versioned')
            .select(db.fn.max('archive').as('archives'))
            .where('cache_id', '=', cache.id)
            .where('archive', '<', 255)
        );

        if (!archive255.length && archives < 5) {
            const stream = new FileStreamAsync();

            const files = [{
                name: 'main_file_cache.dat',
                input: stream.dat
            }];

            for (let i = 0; i < 5; i++) {
                files.push({
                    name: `main_file_cache.idx${i}`,
                    input: stream.idx[i]
                });
            }

            const zip = makeZip(files);
            pipeline(zip, reply.raw, { signal: controller.signal }).catch(() => {});

            for await (const data of getVersionedData(cache.id, cache.game_id)) {
                await stream.write(data.archive, data.group, data.bytes, data.version);
            }
            stream.end();
        } else {
            const stream = new Js5LocalDiskCacheAsync(archives + 1);

            const files = [{
                name: 'main_file_cache.dat2',
                input: stream.dat
            }];

            for (let i = 0; i < stream.idx.length; i++) {
                if (!stream.idx[i]) continue;

                files.push({
                    name: `main_file_cache.idx${i}`,
                    input: stream.idx[i]
                });
            }

            const zip = makeZip(files);
            pipeline(zip, reply.raw, { signal: controller.signal }).catch(() => {});

            for await (const data of getVersionedData(cache.id, cache.game_id)) {
                await stream.write(data.archive, data.group, data.bytes, data.version);
            }
            stream.end();
        }
    });

    // produce individual cache files for the user (cache_versioned)
    app.get('/:id/get/:archive/:group', async (req: any, reply) => {
        const { id, archive, group } = req.params;

        if (id.length === 0 || archive.length === 0 || group.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await getCache(id);

        if (!cache.versioned) {
            throw new Error('Incorrect cache API');
        }

        const cacheData = await db
            .selectFrom('cache_versioned')
            .selectAll()
            .where('cache_id', '=', cache.id)
            .where('archive', '=', archive)
            .where('group', '=', group)
            .executeTakeFirstOrThrow();

        const data = await db
            .selectFrom('data_versioned')
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

    // produce individual cache files for the user (cache_raw)
    app.get('/:id/get/:name', async (req: any, reply) => {
        const { id, name } = req.params;

        if (id.length === 0 || name.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await getCache(id);

        if (cache.versioned) {
            throw new Error('Incorrect cache API');
        }

        const cacheData = await db
            .selectFrom('cache_raw')
            .selectAll()
            .where('cache_id', '=', cache.id)
            .where('name', '=', name)
            .executeTakeFirstOrThrow();

        const data = await db
            .selectFrom('data_raw')
            .selectAll()
            .where('game_id', '=', cache.game_id)
            .where('name', '=', name)
            .where('crc', '=', cacheData.crc)
            .executeTakeFirstOrThrow();

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="${name}"`);
        reply.send(data.bytes);
    });

    // list all the files in the cache
    app.get('/:id/info.json', async (req: any, reply) => {
        const { id, name } = req.params;

        if (id.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await getCache(id);

        reply.status(200);
        reply.header('Content-Type', 'application/json');

        if (cache.versioned) {
            return await db
                .selectFrom('cache_versioned')
                .select(['archive', 'group', 'version', 'crc'])
                .where('cache_id', '=', cache.id)
                .execute();
        } else {
            return await db
                .selectFrom('cache_raw')
                .select(['name', 'crc'])
                .where('cache_id', '=', cache.id)
                .execute();
        }
    });

    // get by build (first match)

    app.get('/:gameName/:build', async (req: any, reply) => {
        const { gameName, build } = req.params;

        if (gameName.length === 0 || build.length === 0) {
            return reply.redirect('/', 302);
        }

        const game = await cacheExecuteTakeFirstOrThrow(`game_${gameName}`, db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName)
        );

        const cache = await cacheExecuteTakeFirstOrThrow(`cache_${gameName}_${build}`, db
            .selectFrom('cache')
            .select('id')
            .where('game_id', '=', game.id)
            .where('build', '=', build)
        );

        return reply.redirect(`/caches/${cache.id}`, 302);
    });

    app.get('/:gameName/:build/cache.zip', async (req: any, reply) => {
        const { gameName, build } = req.params;

        if (gameName.length === 0 || build.length === 0) {
            return reply.redirect('/', 302);
        }

        const game = await cacheExecuteTakeFirstOrThrow(`game_${gameName}`, db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName)
        );

        const cache = await cacheExecuteTakeFirstOrThrow(`cache_${gameName}_${build}`, db
            .selectFrom('cache')
            .select('id')
            .where('game_id', '=', game.id)
            .where('build', '=', build)
        );

        return reply.redirect(`/caches/${cache.id}/cache.zip`, 302);
    });

    app.get('/groups/:gameName', async (req: any, reply) => {
        const start = Date.now();

        const { gameName } = req.params;

        if (gameName.length === 0) {
            return reply.redirect('/', 302);
        }

        const game = await cacheExecuteTakeFirstOrThrow(`game_${gameName}`, db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName)
        );

        const data = await db
            .selectFrom('data_versioned')
            .select(['archive', 'group', 'version', 'crc', 'len'])
            .where('game_id', '=', game.id)
            .orderBy('archive', 'asc')
            .orderBy('group', 'asc')
            .orderBy('version', 'asc')
            .execute();

        const timeTaken = Date.now() - start;
        return reply.view('caches/groups', {
            title: `All ${game.display_name} Cache Groups`,
            game,
            data,
            stats: {
                timeTaken
            }
        });
    });

    // route is overly verbose but need another index to simplify (also not meant for general use)
    app.get('/groups/:gameName/:archive/:group/:version/:crc', async (req: any, reply) => {
        const { gameName, archive, group, version, crc } = req.params;

        if (gameName.length === 0 || archive.length === 0 || group.length === 0 || version.length === 0 || crc.length === 0) {
            throw new Error('Missing route parameters');
        }

        const game = await cacheExecuteTakeFirstOrThrow(`game_${gameName}`, db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName)
        );

        const data = await db
            .selectFrom('data_versioned')
            .selectAll()
            .where('game_id', '=', game.id)
            .where('archive', '=', archive)
            .where('group', '=', group)
            .where('version', '=', version)
            .where('crc', '=', crc)
            .executeTakeFirstOrThrow();

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="${group}.dat"`);
        reply.send(data.bytes);
    });

    app.get('/files/:gameName', async (req: any, reply) => {
        const start = Date.now();

        const { gameName } = req.params;

        if (gameName.length === 0) {
            return reply.redirect('/', 302);
        }

        const game = await cacheExecuteTakeFirstOrThrow(`game_${gameName}`, db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName)
        );

        const data = await db
            .selectFrom('data_raw')
            .select(['name', 'crc', 'len', 'timestamp', 'timestamp2'])
            .where('game_id', '=', game.id)
            .orderBy('name', 'asc')
            .orderBy('timestamp', 'asc')
            .execute();

        const timeTaken = Date.now() - start;
        return reply.view('caches/files', {
            title: `All ${game.display_name} Cache Files`,
            game,
            data,
            stats: {
                timeTaken
            }
        });
    });

    app.get('/files/:gameName/:name/:crc', async (req: any, reply) => {
        const { gameName, name, crc } = req.params;

        if (gameName.length === 0 || name.length === 0 || crc.length === 0) {
            throw new Error('Missing route parameters');
        }

        const game = await cacheExecuteTakeFirstOrThrow(`game_${gameName}`, db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName)
        );

        const data = await db
            .selectFrom('data_raw')
            .selectAll()
            .where('game_id', '=', game.id)
            .where('name', '=', name)
            .where('crc', '=', crc)
            .executeTakeFirstOrThrow();

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="${name}"`);
        reply.send(data.bytes);
    });
}
