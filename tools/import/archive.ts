import fs from 'fs';

import { importOnDemand } from '#tools/import/util.js';
import { unzipSync } from 'fflate';

const args = process.argv.slice(2);

if (args.length < 1) {
    console.error('example args: 317');
    process.exit(1);
}

try {
    const [build, timestamp, newspost] = args;

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

    await importOnDemand(`data/${build}`, 'runescape', build, timestamp, newspost);
} catch (err) {
    if (err instanceof Error) {
        console.log(err.message);
    }
}

process.exit(0);
