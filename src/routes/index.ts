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

        const { len_js5 } = await db
            .selectFrom('data_js5')
            .select(db.fn.sum('len').as('len_js5'))
            .executeTakeFirstOrThrow();

        const { len_od } = await db
            .selectFrom('data_ondemand')
            .select(db.fn.sum('len').as('len_od'))
            .executeTakeFirstOrThrow();

        const { len_jag } = await db
            .selectFrom('data_jag')
            .select(db.fn.sum('len').as('len_jag'))
            .executeTakeFirstOrThrow();

        let len = 0;
        if (len_js5 !== null) {
            len += parseInt(len_js5 as string);
        }
        if (len_od !== null) {
            len += parseInt(len_od as string);
        }
        if (len_jag !== null) {
            len += parseInt(len_jag as string);
        }

        return reply.view('index', {
            games,
            stats: {
                len
            }
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
            .orderBy('timestamp', 'asc')
            .execute();

        return reply.view('list', {
            game,
            caches
        });
    });
}
