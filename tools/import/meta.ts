import { db } from '#/db/query.js';

const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('args: <game> <build> <timestamp> <newspost>')
    process.exit(1);
}

const [gameName, build, timestamp, newspost] = args;

const update: any = {};

if (typeof timestamp !== 'undefined') {
    if (timestamp === 'null') {
        update.timestamp = null;
    } else if (timestamp !== '-1') {
        update.timestamp = timestamp;
    }
}

if (typeof newspost !== 'undefined') {
    if (newspost === 'null') {
        update.newspost = null;
    } else if (newspost !== '-1') {
        update.newspost = newspost;
    }
}

// update cache and clients
if (!Object.keys(update).length) {
    console.error('no update');
    process.exit(1);
}

const game = await db
    .selectFrom('game')
    .selectAll()
    .where('name', '=', gameName)
    .executeTakeFirstOrThrow();

const cache = await db
    .selectFrom('cache')
    .selectAll()
    .where('game_id', '=', game.id)
    .where('build', '=', build)
    .executeTakeFirst();

if (cache) {
    // update cache and linked clients
    await db
        .updateTable('cache')
        .set(update)
        .where('id', '=', cache.id)
        .execute();

    const clients = await db
        .selectFrom('cache_client')
        .selectAll()
        .where('cache_id', '=', cache.id)
        .execute();

    for (const link of clients) {
        await db
            .updateTable('client')
            .set(update)
            .where('id', '=', link.client_id)
            .execute();
    }
} else {
    // update clients
    const clients = await db
        .selectFrom('client')
        .select(['id'])
        .where('game_id', '=', game.id)
        .where('build', '=', build)
        .execute();

    for (const client of clients) {
        await db
            .updateTable('client')
            .set(update)
            .where('id', '=', client.id)
            .execute();
    }
}

process.exit(0);
