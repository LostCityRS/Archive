import { db } from '#/db/query.js';

import { recalculateStats } from '#tools/import/util.js';

const caches = await db.selectFrom('cache').select('id').execute();

for (const cache of caches) {
    await recalculateStats(cache.id);
}

process.exit(0);
