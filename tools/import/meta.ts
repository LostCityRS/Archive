import { db } from '#/db/query.js';

const args = process.argv.slice(2);
if (args.length < 2) {
    process.exit(1);
}

const [id, timestamp, newspost] = args;

const cache = await db
    .selectFrom('cache')
    .selectAll()
    .where('id', '=', parseInt(id))
    .executeTakeFirstOrThrow();

const update: any = {
    timestamp
};

if (typeof newspost !== 'undefined') {
    update.newspost = newspost;
}

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

process.exit(0);
