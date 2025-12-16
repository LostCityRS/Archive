import fs from 'fs';
import path from 'path';

import { importJs5 } from '#tools/import/util.js';
import { unzipSync } from 'fflate';
import { db } from '#/db/query.js';

const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('example args: <openrs2 id> <revision> (timestamp) (newspost)');
    process.exit(1);
}

try {
    const [openrs2, build] = args;

    if (!fs.existsSync('data')) {
        fs.mkdirSync('data');
    }

    if (!fs.existsSync(`data/${openrs2}.zip`)) {
        console.log('Downloading...');
        fs.writeFileSync(`data/${openrs2}.zip`, await (await fetch(`https://archive.openrs2.org/caches/runescape/${openrs2}/disk.zip`)).bytes());
    }

    if (!fs.existsSync(`data/${openrs2}`)) {
        console.log('Extracting...');
        fs.mkdirSync(`data/${openrs2}`, { recursive: true });

        const data = fs.readFileSync(`data/${openrs2}.zip`);
        const zip = unzipSync(data);

        for (const file in zip) {
            if (file.endsWith('/')) {
                continue;
            }

            fs.writeFileSync(`data/${openrs2}/${path.basename(file)}`, zip[file]);
        }
    }

    const cache = await importJs5(`data/${openrs2}`, 'runescape', build);
    fs.rmSync(`data/${openrs2}`, { recursive: true, force: true });

    await db
        .insertInto('cache_source')
        .values({
            cache_id: cache.id,
            timestamp: new Date(),
            attribution: 'OpenRS2',
            url: `https://archive.openrs2.org/caches/runescape/${openrs2}`
        })
        .execute();
} catch (err) {
    if (err instanceof Error) {
        console.log(err.message);
    }
}

process.exit(0);
