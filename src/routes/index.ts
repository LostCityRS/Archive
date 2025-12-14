import { FastifyInstance } from 'fastify';

import { db } from '#/db/query.js';

export default async function (app: FastifyInstance) {
    app.get('/', async (req, reply) => {
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

        return reply.view('index', {
            games
        });
    });

    app.get('/list/:gameName', async (req: any, reply) => {
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
            .orderBy('build', 'asc')
            .execute();

        return reply.view('list', {
            game,
            caches
        });
    });
}
