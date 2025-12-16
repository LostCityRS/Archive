import { db } from '#/db/query.js';
import { importRaw, importJs5, importOnDemand } from '#tools/import/util.js';

const args = process.argv.slice(2);

if (args.length < 4) {
    console.error('args: <source> <game> <build> <js5/ondemand/raw>');
    process.exit(1);
}

try {
    const [source, game, build, era] = args;

    let cache = null;
    if (era === 'js5') {
        cache = await importJs5(source, game, build);
    } else if (era === 'ondemand') {
        cache = await importOnDemand(source, game, build);
    } else if (era === 'raw') {
        cache = await importRaw(source, game, build);
    }

    if (cache) {
        await db
            .insertInto('cache_source')
            .values({
                cache_id: cache.id,
                timestamp: new Date(),
                description: source
            })
            .execute();
    }
} catch (err) {
    if (err instanceof Error) {
        console.log(err.message);
    }
}

process.exit(0);
