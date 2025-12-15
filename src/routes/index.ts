import { FastifyInstance } from 'fastify';

import { db, cacheExecute, cacheExecuteTakeFirst, cacheExecuteTakeFirstOrThrow } from '#/db/query.js';

export default async function (app: FastifyInstance) {
    app.get('/', async (req, reply) => {
        const start = Date.now();

        const games = await cacheExecute('index', db
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
            const js5 = await cacheExecuteTakeFirstOrThrow('index_js5', db
                .selectFrom('data_js5')
                .select(db.fn.sum('len').as('sum')));
            len += parseInt(js5.sum as string);

            const od = await cacheExecuteTakeFirstOrThrow('index_od', db
                .selectFrom('data_ondemand')
                .select(db.fn.sum('len').as('sum')));
            len += parseInt(od.sum as string);

            const jag = await cacheExecuteTakeFirstOrThrow('index_jag', db
                .selectFrom('data_jag')
                .select(db.fn.sum('len').as('sum')));
            len += parseInt(jag.sum as string);
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

        const game = await cacheExecuteTakeFirstOrThrow(`list_${gameName}`, db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName));

        const caches = await cacheExecute(`list_${gameName}_caches`, db
            .selectFrom('cache')
            .selectAll()
            .where('game_id', '=', game.id));
        caches.sort((a: any, b: any) => parseInt(a.build) - parseInt(b.build));

        // sum of all caches in database
        let len = 0;
        {
            const js5 = await cacheExecuteTakeFirstOrThrow(`list_${gameName}_js5`, db
                .selectFrom('data_js5')
                .select(db.fn.sum('len').as('sum'))
                .where('game_id', '=', game.id));
            len += parseInt(js5.sum as string);

            const od = await cacheExecuteTakeFirstOrThrow(`list_${gameName}_od`, db
                .selectFrom('data_ondemand')
                .select(db.fn.sum('len').as('sum'))
                .where('game_id', '=', game.id));
            len += parseInt(od.sum as string);

            const jag = await cacheExecuteTakeFirstOrThrow(`list_${gameName}_jag`, db
                .selectFrom('data_jag')
                .select(db.fn.sum('len').as('sum'))
                .where('game_id', '=', game.id));
            len += parseInt(jag.sum as string);
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
