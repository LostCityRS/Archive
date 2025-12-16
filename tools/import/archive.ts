import fs from 'fs';

import { importOnDemand } from '#tools/import/util.js';
import { unzipSync } from 'fflate';
import { db } from '#/db/query.js';

const args = process.argv.slice(2);

if (args.length < 1) {
    console.error('args: <build>');
    process.exit(1);
}

try {
    const [build] = args;

    if (!fs.existsSync('data')) {
        fs.mkdirSync('data');
    }

    if (!fs.existsSync(`data/${build}.zip`)) {
        console.log('Downloading...');
        fs.writeFileSync(`data/${build}.zip`, await (await fetch(`https://archive.lostcity.rs/cache/packed/${build}.zip`)).bytes());
    }

    if (!fs.existsSync(`data/${build}`)) {
        console.log('Extracting...');
        fs.mkdirSync(`data/${build}`, { recursive: true });

        const data = fs.readFileSync(`data/${build}.zip`);
        const zip = unzipSync(data);

        for (const file in zip) {
            fs.writeFileSync(`data/${file}`, zip[file]);
        }
    }

    const cache = await importOnDemand(`data/${build}`, 'runescape', build);

    if (cache) {
        await db
            .insertInto('cache_source')
            .values({
                cache_id: cache.id,
                timestamp: new Date(),
                attribution: 'Lost City',
                url: `https://archive.lostcity.rs/cache/packed/${build}.zip`
            })
            .execute();
    }
} catch (err) {
    if (err instanceof Error) {
        console.log(err.message);
    }
}

process.exit(0);
