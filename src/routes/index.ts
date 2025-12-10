import { FastifyInstance } from 'fastify';
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
    app.get('/', async (req, reply) => {
        return reply.view('index');
    });

    app.get('/caches', async (req, reply) => {
        const caches = await db.selectFrom('cache').selectAll().execute();

        return reply.view('caches', {
            caches
        });
    });

    // get by db id
    app.get('/caches/:id', async (req: any, reply) => {
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

    // get by revision
    app.get('/caches/:game/:build', async (req: any, reply) => {
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
}
