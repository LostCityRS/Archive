import { FastifyInstance } from 'fastify';

import { db } from '#/db/query.js';

export default async function (app: FastifyInstance) {
    app.get('/', async (req, reply) => {
        const start = Date.now();

        const games = await db
            .selectFrom('game')
            .select(['game.name', 'game.display_name', 'game.parent_game'])
            .leftJoin(
                'cache',
                (join) => join.onRef('game.id', '=', 'cache.game_id')
            )
            .select(db.fn.count('cache.id').as('count'))
            .groupBy('game.id')
            .execute();

        // sum of all caches in database
        let len = 0;
        {
            const { len_js5 } = await db
                .selectFrom('data_js5')
                .select(db.fn.sum('len').as('len_js5'))
                .executeTakeFirstOrThrow();
            if (len_js5 !== null) {
                len += parseInt(len_js5 as string);
            }

            const { len_od } = await db
                .selectFrom('data_ondemand')
                .select(db.fn.sum('len').as('len_od'))
                .executeTakeFirstOrThrow();
            if (len_od !== null) {
                len += parseInt(len_od as string);
            }

            const { len_jag } = await db
                .selectFrom('data_jag')
                .select(db.fn.sum('len').as('len_jag'))
                .executeTakeFirstOrThrow();
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
            },
            title: 'Caches',
            icon: 'database-zap',
        });
    });

    app.get('/list/:gameName', async (req: any, reply) => {
        const start = Date.now();

        const { gameName } = req.params;

        const game = await db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName)
            .executeTakeFirstOrThrow();

        const caches = await db
            .selectFrom('cache')
            .selectAll()
            .where('game_id', '=', game.id)
            .execute();
        caches.sort((a, b) => parseInt(a.build) - parseInt(b.build));

        // sum of all caches in database
        let len = 0;
        {
            const { len_js5 } = await db
                .selectFrom('data_js5')
                .select(db.fn.sum('len').as('len_js5'))
                .where('game_id', '=', game.id)
                .executeTakeFirstOrThrow();
            if (len_js5 !== null) {
                len += parseInt(len_js5 as string);
            }

            const { len_od } = await db
                .selectFrom('data_ondemand')
                .select(db.fn.sum('len').as('len_od'))
                .where('game_id', '=', game.id)
                .executeTakeFirstOrThrow();
            if (len_od !== null) {
                len += parseInt(len_od as string);
            }

            const { len_jag } = await db
                .selectFrom('data_jag')
                .select(db.fn.sum('len').as('len_jag'))
                .where('game_id', '=', game.id)
                .executeTakeFirstOrThrow();
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
            },
            title: `${game.display_name} Caches`,
            icon: 'database-zap',
            breadcrumbs: [{ label: 'Caches', href: '/' }]
        });
    });
}
