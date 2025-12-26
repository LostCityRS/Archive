import { db } from '#/db/query.js';

const args = process.argv.slice(2);

if (args.length < 3) {
    process.exit(1);
}

const [cacheId, fileName, crc] = args;

await db
    .insertInto('cache_raw')
    .ignore()
    .values({
        cache_id: parseInt(cacheId),
        name: fileName,
        crc: parseInt(crc)
    })
    .execute();

process.exit(0);
