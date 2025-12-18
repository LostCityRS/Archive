import { db } from '#/db/query.js';

import { recalculateStats } from '#tools/import/util.js';

const args = process.argv.slice(2);

if (args.length < 1) {
    const caches = await db.selectFrom('cache').select('id').execute();

    for (const cache of caches) {
        await recalculateStats(cache.id);
    }
} else {
    await recalculateStats(parseInt(args[0]));
}

process.exit(0);
