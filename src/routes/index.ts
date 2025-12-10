import { FastifyInstance } from 'fastify';

import { db } from '#/db/query.js';
import { sql } from 'kysely';

export default async function (app: FastifyInstance) {
    app.get('/', async (req, reply) => {
        const caches = await db.selectFrom('cache').selectAll().execute();

        return reply.view('index', {
            caches
        });
    });

    app.get('/caches', async (req, reply) => {
        const caches = await db.selectFrom('cache').selectAll().execute();

        return reply.view('caches', {
            caches
        });
    });

    app.get('/caches/:build', async (req: any, reply) => {
        const { build } = req.params;

        if (build.length === 0) {
            throw new Error('Build must be specified');
        }

        const cache = await db.selectFrom('cache').selectAll().where('build', '=', build).executeTakeFirstOrThrow();
        const files = await db
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

        const missing = files.filter(f => !f.exists && f.essential);
        const allMissing = files.filter(f => !f.exists);

        return reply.view('cache/build', {
            cache,
            files,
            missing,
            allMissing
        });
    });

    app.get('/clients', async (req, reply) => {
        return reply.view('clients');
    });

    app.get('/clients/:build', async (req, reply) => {
        return reply.view('client/build');
    });
}
