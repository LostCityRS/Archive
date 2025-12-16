import { FastifyInstance } from 'fastify';

import { db, cacheExecute, cacheExecuteTakeFirst, cacheExecuteTakeFirstOrThrow } from '#/db/query.js';

async function getCache(id: number) {
    return cacheExecuteTakeFirstOrThrow(`client_${id}`, db
        .selectFrom('client')
        .leftJoin(
            'game',
            (join) => join.onRef('game.id', '=', 'client.game_id')
        )
        .where('client.id', '=', id)
        .select([
            'client.id', 'client.game_id', 'game.name', 'game.display_name',
            'client.build', 'client.timestamp', 'client.newspost'
        ]));
}

export default async function (app: FastifyInstance) {
    app.get('/list', async (req, reply) => {
        const start = Date.now();

        const games = await cacheExecute('client_index', db
            .selectFrom('game')
            .select(['game.name', 'game.display_name'])
            .leftJoin(
                'client',
                (join) => join.onRef('game.id', '=', 'client.game_id')
            )
            .select(db.fn.count('client.id').as('count'))
            .groupBy('game.id').orderBy('name', 'asc'));

        // (reverse) forced order:
        games.sort((a: any, b: any) => a.name === 'oldscape' ? -1 : 0);
        games.sort((a: any, b: any) => a.name === 'rsclassic' ? -1 : 0);
        games.sort((a: any, b: any) => a.name === 'runescape' ? -1 : 0);

        const timeTaken = Date.now() - start;
        return reply.view('clients/index', {
            games,
            stats: {
                timeTaken
            },
            title: 'Clients',
            icon: 'computer',
        });
    });

    app.get('/list/:gameName', async (req: any, reply) => {
        const start = Date.now();

        const { gameName } = req.params;

        const game = await cacheExecuteTakeFirstOrThrow(`client_list_${gameName}`, db
            .selectFrom('game')
            .selectAll()
            .where('name', '=', gameName));

        const clients = await cacheExecute(`client_list_${gameName}_caches`, db
            .selectFrom('client')
            .selectAll()
            .where('game_id', '=', game.id));

        // sort build as a revision
        clients.sort((a: any, b: any) => a.build.indexOf('-') === -1 && b.build.indexOf('-') === -1 ? parseInt(a.build) - parseInt(b.build) : 0);
        // sort build as a date
        clients.sort((a: any, b: any) => a.build.indexOf('-') !== -1 && b.build.indexOf('-') !== -1 ? new Date(a.build).valueOf() - new Date(b.build).valueOf() : 0);

        const timeTaken = Date.now() - start;
        return reply.view('clients/list', {
            game,
            clients,
            stats: {
                timeTaken
            },
            title: `${game.display_name} Client Files`,
            icon: 'computer',
            breadcrumbs: [{ label: 'Client Files', href: '/' }]
        });
    });

    app.get('/:id/download', async (req: any, reply) => {
        const { id } = req.params;

        if (id.length === 0) {
            throw new Error('Missing route parameters');
        }

        const data = await db
            .selectFrom('client')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        reply.status(200);
        reply.header('Content-Disposition', `attachment; filename="${data.name}"`);
        reply.send(data.bytes);
    });
}
