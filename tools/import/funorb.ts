import fs from 'fs';
import { db } from '#/db/query.js';

import { importJs5WithoutIndex } from '#tools/import/util.js';

const args = process.argv.slice(2);

if (args.length < 3) {
    console.error('args: <source> <game> <build>');
    process.exit(1);
}

try {
    const [source, game, build] = args;

    console.log(`Importing from ${source} as ${game} ${build}`);
    const cache = await importJs5WithoutIndex(source, game, build);
    console.log(`https://archive2.lostcity.rs/caches/${cache.id}`);

    await db
        .insertInto('cache_source')
        .values({
            cache_id: cache.id,
            timestamp: fs.statSync(`${source}/main_file_cache.dat2`).ctime,
            description: source
        })
        .execute();
} catch (err) {
    if (err instanceof Error) {
        console.log(err.message);
    }
}

process.exit(0);
