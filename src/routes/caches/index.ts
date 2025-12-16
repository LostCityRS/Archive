import { FastifyInstance } from 'fastify';
import { Zip, ZipDeflate } from 'fflate';

import { db, cacheExecute, cacheExecuteTakeFirst, cacheExecuteTakeFirstOrThrow } from '#/db/query.js';

import FileStreamAsync from '#/io/FileStreamAsync.js';

import Js5LocalDiskCacheAsync from '#/js5/Js5LocalDiskCacheAsync.js';

async function getCache(id: number) {
    return cacheExecuteTakeFirstOrThrow(`cache_${id}`, db
        .selectFrom('cache')
        .leftJoin(
            'game',
            (join) => join.onRef('game.id', '=', 'cache.game_id')
        )
        .where('cache.id', '=', id)
        .select([
            'cache.id', 'cache.game_id', 'game.name', 'game.display_name',
            'cache.build', 'cache.timestamp', 'cache.newspost',
            'cache.versioned'
        ]));
}

export default async function (app: FastifyInstance) {
    app.get('/list', async (req, reply) => {
        const start = Date.now();

        const games = await cacheExecute('cache_index', db
            .selectFrom('game')
            .select(['game.name', 'game.display_name'])
            .leftJoin(
                'cache',
                (join) => join.onRef('game.id', '=', 'cache.game_id')
            )
            .select(db.fn.count('cache.id').as('count'))
            .groupBy('game.id').orderBy('name', 'asc'));

        // (reverse) forced order:
        games.sort((a: any, b: any) => a.name === 'oldscape' ? -1 : 0);
        games.sort((a: any, b: any) => a.name === 'rsclassic' ? -1 : 0);
        games.sort((a: any, b: any) => a.name === 'runescape' ? -1 : 0);

        const timeTaken = Date.now() - start;
        return reply.view('caches/index', {
            games,
            stats: {
                timeTaken
            },
            title: 'Caches',
            icon: 'database-zap',
        });
    });

    app.get('/list/:gameName', async (req: any, reply) => {
        const start = Date.now();

        const { gameName } = req.params;

        const game = await cacheExecuteTakeFirstOrThrow(`cache_list_${gameName}`, db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName));

        const caches = await cacheExecute(`cache_list_${gameName}_caches`, db
            .selectFrom('cache')
            .selectAll()
            .where('game_id', '=', game.id));

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
                .selectAll()
                .leftJoin(
                    'data_raw',
                    (join) => join
                        .on('data_raw.game_id', '=', cache.game_id)
                        .onRef('data_raw.name', '=', 'cache_raw.name')
                        .onRef('data_raw.crc', '=', 'cache_raw.crc')
                )
                .select(['data_raw.name', 'data_raw.crc', 'data_raw.len'])
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
                { label: `${cache.display_name} Caches`, href: `/list/${cache.name}` }
            ]
        });
    });

    // get by revision (easy shorthand, if possible)
    // app.get('/:game/:build', async (req: any, reply) => {
    // });

    // produce a zip of individual cache files for the user
    app.get('/:id/files.zip', async (req: any, reply) => {
        try {
            const { id } = req.params;

            if (id.length === 0) {
                return reply.redirect('/', 302);
            }

            const cache = await getCache(id);

            reply.raw.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="files-${cache.name}-${cache.build}-lostcity#${cache.id}.zip"`,
            });

            const zip = new Zip((err, chunk, final) => {
                if (err) {
                    reply.raw.end();
                    return;
                }

                reply.raw.write(Buffer.from(chunk));

                if (final) {
                    reply.raw.end();
                }
            });

            if (cache.versioned) {
                const cacheData = db
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
                    .where('cache_id', '=', cache.id)
                    .select(['cache_versioned.archive', 'cache_versioned.group', 'data_versioned.bytes'])
                    .stream();

                for await (const data of cacheData) {
                    if (data.bytes && data.bytes.length) {
                        const entry = new ZipDeflate(`${data.archive}/${data.group}.dat`, { level: 0 });
                        zip.add(entry);
                        entry.push(data.bytes, true);
                    }
                }
            } else {
                const cacheData = db
                    .selectFrom('cache_raw')
                    .leftJoin(
                        'data_raw',
                        (join) => join
                            .on('data_raw.game_id', '=', cache.game_id)
                            .onRef('data_raw.name', '=', 'cache_raw.name')
                            .onRef('data_raw.crc', '=', 'cache_raw.crc')
                    )
                    .where('cache_id', '=', cache.id)
                    .select(['cache_raw.name', 'data_raw.bytes'])
                    .stream();

                for await (const data of cacheData) {
                    if (data.bytes && data.bytes.length) {
                        const entry = new ZipDeflate(data.name, { level: 0 });
                        zip.add(entry);
                        entry.push(data.bytes, true);
                    }
                }
            }

            zip.end();
        } catch (err) {
            reply.raw.end();
            console.error(err);
        }
    });

    // produce a cache in the client format and zip it for the user
    app.get('/:id/cache.zip', async (req: any, reply) => {
        try {
            // todo: expose control over packing music to fit large rs3 caches?
            // todo: offer jcache too?

            const { id } = req.params;

            if (id.length === 0) {
                return reply.redirect('/', 302);
            }

            const cache = await getCache(id);

            reply.raw.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="cache-${cache.name}-${cache.build}-lostcity#${cache.id}.zip"`,
            });

            const zip = new Zip((err, chunk, final) => {
                if (err) {
                    reply.raw.end();
                    return;
                }

                reply.raw.write(Buffer.from(chunk));

                if (final) {
                    reply.raw.end();
                }
            });

            if (cache.versioned) {
                const { archives } = await cacheExecuteTakeFirstOrThrow(`cache_${cache.id}_archives`, db
                    .selectFrom('cache_versioned')
                    .select(db.fn.max('archive').as('archives'))
                    .where('cache_id', '=', cache.id)
                    .where('archive', '<', 255)
                );

                const cacheData = db
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
                    .where('cache_id', '=', cache.id)
                    .select(['cache_versioned.archive', 'cache_versioned.group', 'cache_versioned.version', 'data_versioned.bytes'])
                    .stream();

                if (archives !== 4) {
                    const dat = new ZipDeflate('main_file_cache.dat2', { level: 1 });
                    zip.add(dat);

                    const stream = new Js5LocalDiskCacheAsync(archives + 1);
                    stream.dat.on('data', chunk => {
                        dat.push(Buffer.from(chunk));
                    });
                    stream.dat.on('end', () => {
                        dat.push(new Uint8Array(0), true);
                    });

                    for await (const data of cacheData) {
                        if (data.bytes) {
                            stream.write(data.archive, data.group, data.bytes, data.version);
                        }
                    }
                    stream.dat.end();

                    for (let i = 0; i <= archives; i++) {
                        const idx = new ZipDeflate(`main_file_cache.idx${i}`, { level: 1 });
                        zip.add(idx);
                        idx.push(stream.idx[i].data.subarray(0, stream.idx[i].pos), true);
                    }

                    {
                        const idx = new ZipDeflate('main_file_cache.idx255', { level: 1 });
                        zip.add(idx);
                        idx.push(stream.idx[255].data.subarray(0, stream.idx[255].pos), true);
                    }
                } else {
                    const dat = new ZipDeflate('main_file_cache.dat', { level: 1 });
                    zip.add(dat);

                    const stream = new FileStreamAsync();
                    stream.dat.on('data', chunk => {
                        dat.push(Buffer.from(chunk));
                    });
                    stream.dat.on('end', () => {
                        dat.push(new Uint8Array(0), true);
                    });

                    for await (const data of cacheData) {
                        if (data.bytes) {
                            stream.write(data.archive, data.group, data.bytes, data.version);
                        }
                    }
                    stream.dat.end();

                    for (let i = 0; i < 5; i++) {
                        const idx = new ZipDeflate(`main_file_cache.idx${i}`, { level: 1 });
                        zip.add(idx);
                        idx.push(stream.idx[i].data.subarray(0, stream.idx[i].pos), true);
                    }
                }
            } else {
                const cacheData = db
                    .selectFrom('cache_raw')
                    .leftJoin(
                        'data_raw',
                        (join) => join
                            .on('data_raw.game_id', '=', cache.game_id)
                            .onRef('data_raw.name', '=', 'cache_raw.name')
                            .onRef('data_raw.crc', '=', 'cache_raw.crc')
                    )
                    .where('cache_id', '=', cache.id)
                    .select(['cache_raw.name', 'data_raw.bytes'])
                    .stream();

                for await (const data of cacheData) {
                    if (data.bytes) {
                        const entry = new ZipDeflate(data.name, { level: 0 });
                        zip.add(entry);
                        entry.push(data.bytes, true);
                    }
                }
            }

            zip.end();
        } catch (err) {
            reply.raw.end();
            console.error(err);
        }
    });

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
}
