import { FastifyInstance } from 'fastify';

import { db } from '#/db/query.js';

export default async function (app: FastifyInstance) {
    app.get('/', async (req, reply) => {
        return reply.view('index');
    });

    app.get('/caches', async (req, reply) => {
        const caches = await db.selectFrom('cache').selectAll().execute();
        const allGames = await db.selectFrom('game').selectAll().execute();

        const games: any[] = [];
        for (const game of allGames) {
            games[game.id] = { name: game.name, display_name: game.display_name };
        }

        return reply.view('caches', {
            caches,
            games: games
        });
    });
}
