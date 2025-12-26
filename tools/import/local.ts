import { db } from '#/db/query.js';
import { importJs5, importOnDemand, importRaw, importEarlyRs2 } from '#tools/import/util.js';

const args = process.argv.slice(2);

if (args.length < 4) {
    console.error('args: <source> <game> <build> <js5/ondemand/raw/earlyrs2>');
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
    } else if (era === 'earlyrs2') {
        cache = await importEarlyRs2(source, game, build);
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
