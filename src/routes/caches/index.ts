import { FastifyInstance } from 'fastify';
import { zipSync } from 'fflate';
import { sql } from 'kysely';

import { db } from '#/db/query.js';

async function getOnDemandFiles(cache: { id: number, game: string }) {
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
                            .where('data_ondemand.game', '=', cache.game)
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

export default async function (app: FastifyInstance) {
    // get by db id
    app.get('/:id', async (req: any, reply) => {
        const { id } = req.params;

        if (id.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await db
            .selectFrom('cache')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();
        const files = await getOnDemandFiles(cache);

        const missing = files.filter(f => !f.exists && f.essential);
        const allMissing = files.filter(f => !f.exists);

        return reply.view('cache/build', {
            cache,
            files,
            missing,
            allMissing
        });
    });

    // get by revision (easy shorthand, if possible)
    app.get('/:game/:build', async (req: any, reply) => {
        const { game, build } = req.params;

        if (game.length === 0 || build.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await db
            .selectFrom('cache')
            .selectAll()
            .where('build', '=', build)
            .executeTakeFirstOrThrow();
        const files = await getOnDemandFiles(cache);

        const missing = files.filter(f => !f.exists && f.essential);
        const allMissing = files.filter(f => !f.exists);

        return reply.view('cache/build', {
            cache,
            files,
            missing,
            allMissing
        });
    });

    // produce a zip of individual cache files for the user
    app.get('/:id/files.zip', async (req: any, reply) => {
        const { id } = req.params;

        if (id.length === 0) {
            throw new Error('Missing route parameters');
        }

        const cache = await db
            .selectFrom('cache')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        const zip: Record<string, Buffer> = {};

        // todo: js5, jag
        if (cache.ondemand) {
            const cacheData = await db
                .selectFrom('cache_ondemand')
                .leftJoin(
                    'data_ondemand',
                    (join) => join
                        .on('data_ondemand.game', '=', cache.game)
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
        }

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="cache-${cache.game}-${cache.build}-files-lostcity#${cache.id}.zip"`);
        reply.send(zipSync(zip, { level: 0 }));
    });

    // produce a cache in the client format and zip it for the user
    app.get('/:id/cache.zip', async (req: any, reply) => {
        // todo: main_file_cache.dat
        // todo: main_file_cache.dat2 (expose control over packing music to fit large caches?)
        // todo: offer jcache too?
    });

    // produce individual cache files for the user (cache_js5)
    app.get('/:id/js5/:archive/:group', async (req: any, reply) => {
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
            .where('game', '=', cache.game)
            .where('archive', '=', archive)
            .where('file', '=', file)
            .where('version', '=', cacheData.version)
            .where('crc', '=', cacheData.crc)
            .executeTakeFirstOrThrow();

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="${cache.build}-${archive}-${file}.dat"`);
        reply.send(data.bytes);
    });

    // produce individual cache files for the user (cache_jag)
    app.get('/:id/jag/:name', async (req: any, reply) => {
    });
}
