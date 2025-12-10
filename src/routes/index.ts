import { FastifyInstance } from 'fastify';

import { db } from '#/db/query.js';

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
}
