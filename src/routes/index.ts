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
            .groupBy('game.id').orderBy('name', 'asc'));

        // (reverse) forced order:
        games.sort((a: any, b: any) => a.name === 'oldscape' ? -1 : 0);
        games.sort((a: any, b: any) => a.name === 'rsclassic' ? -1 : 0);
        games.sort((a: any, b: any) => a.name === 'runescape' ? -1 : 0);

        const timeTaken = Date.now() - start;
        return reply.view('caches/index', {
            games,
            stats: {
                len: 0,
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

        // sort build as a revision
        caches.sort((a: any, b: any) => a.build.indexOf('-') === -1 && b.build.indexOf('-') === -1 ? parseInt(a.build) - parseInt(b.build) : 0);
        // sort build as a date
        caches.sort((a: any, b: any) => a.build.indexOf('-') !== -1 && b.build.indexOf('-') !== -1 ? new Date(a.build).valueOf() - new Date(b.build).valueOf() : 0);

        const timeTaken = Date.now() - start;
        return reply.view('caches/list', {
            game,
            caches,
            stats: {
                len: 0,
                timeTaken
            },
            title: `${game.display_name} Caches`,
            icon: 'database-zap',
            breadcrumbs: [{ label: 'Caches', href: '/' }]
        });
    });

    app.get('/about', async (req, reply) => {
        return reply.view('about/index', {
            title: 'About',
            icon: 'info',
        });
    });
}
