import { FastifyInstance } from 'fastify';

import { cacheDb, db } from '#/db/query.js';

export default async function (app: FastifyInstance) {
    app.get('/', async (req, reply) => {
        const start = Date.now();

        const games = await cacheDb.execute(db
            .selectFrom('game')
            .select(['game.name', 'game.display_name', 'game.parent_game'])
            .leftJoin(
                'cache',
                (join) => join.onRef('game.id', '=', 'cache.game_id')
            )
            .select(db.fn.count('cache.id').as('count'))
            .groupBy('game.id'));

        // sum of all caches in database
        let len = 0;
        {
            const { len_js5 } = await cacheDb.executeTakeFirstOrThrow(db
                .selectFrom('data_js5')
                .select(db.fn.sum('len').as('len_js5')));
            if (len_js5 !== null) {
                len += parseInt(len_js5 as string);
            }

            const { len_od } = await cacheDb.executeTakeFirstOrThrow(db
                .selectFrom('data_ondemand')
                .select(db.fn.sum('len').as('len_od')));
            if (len_od !== null) {
                len += parseInt(len_od as string);
            }

            const { len_jag } = await cacheDb.executeTakeFirstOrThrow(db
                .selectFrom('data_jag')
                .select(db.fn.sum('len').as('len_jag')));
            if (len_jag !== null) {
                len += parseInt(len_jag as string);
            }
        }

        const timeTaken = Date.now() - start;
        return reply.view('index', {
            games,
            stats: {
                len,
                timeTaken
            }
        });
    });

    app.get('/list/:gameName', async (req: any, reply) => {
        const start = Date.now();

        const { gameName } = req.params;

        const game = await cacheDb.executeTakeFirstOrThrow(db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName));

        const caches = await cacheDb.execute(db
            .selectFrom('cache')
            .selectAll()
            .where('game_id', '=', game.id));
        caches.sort((a, b) => parseInt(a.build) - parseInt(b.build));

        // sum of all caches in database
        let len = 0;
        {
            const { len_js5 } = await cacheDb.executeTakeFirstOrThrow(db
                .selectFrom('data_js5')
                .select(db.fn.sum('len').as('len_js5'))
                .where('game_id', '=', game.id));
            if (len_js5 !== null) {
                len += parseInt(len_js5 as string);
            }

            const { len_od } = await cacheDb.executeTakeFirstOrThrow(db
                .selectFrom('data_ondemand')
                .select(db.fn.sum('len').as('len_od'))
                .where('game_id', '=', game.id));
            if (len_od !== null) {
                len += parseInt(len_od as string);
            }

            const { len_jag } = await cacheDb.executeTakeFirstOrThrow(db
                .selectFrom('data_jag')
                .select(db.fn.sum('len').as('len_jag'))
                .where('game_id', '=', game.id));
            if (len_jag !== null) {
                len += parseInt(len_jag as string);
            }
        }

        const timeTaken = Date.now() - start;
        return reply.view('list', {
            game,
            caches,
            stats: {
                len,
                timeTaken
            }
        });
    });
}
