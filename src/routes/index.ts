import { FastifyInstance } from 'fastify';

import { db, cacheExecute, cacheExecuteTakeFirst, cacheExecuteTakeFirstOrThrow } from '#/db/query.js';

export default async function (app: FastifyInstance) {
    // temporary redirects
    app.get('/', async (req, reply: any) => {
        return reply.redirect('/caches/list', 302);
    });
    app.get('/list', async (req, reply: any) => {
        return reply.redirect('/caches/list', 302);
    });

    app.get('/about', async (req, reply) => {
        return reply.view('about/index', {
            title: 'About',
            icon: 'info',
        });
    });
}
