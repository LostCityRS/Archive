import fs from 'fs';

import Packet from '#/io/Packet.js';

import Js5LocalDiskCache from '#/js5/Js5LocalDiskCache.js';

const archives = fs.readFileSync('data/cache1/main_file_cache.idx255').length / 6;
const cache1 = new Js5LocalDiskCache('data/cache1', archives);
const cache2 = new Js5LocalDiskCache('data/cache2', archives);

for (let archive = 0; archive < archives; archive++) {
    const count1 = cache1.count(archive);
    const count2 = cache2.count(archive);

    if (count1 !== count2) {
        throw new Error(`archive ${archive} differs`);
    }

    for (let file = 0; file < count1; file++) {
        const has1 = cache1.has(archive, file);
        const has2 = cache2.has(archive, file);

        if (!has1 && !has2) {
            continue;
        }

        if (has1 !== has2) {
            throw new Error(`archive ${archive} file ${file} does not exist`);
        }

        const data1 = cache1.read(archive, file);
        const data2 = cache2.read(archive, file);

        if (!data1 || !data2) {
            throw new Error(`archive ${archive} file ${file} does not exist (2)`);
        }

        if (data1.length !== data2.length) {
            throw new Error(`archive ${archive} file ${file} differs in length`);
        }

        const crc1 = Packet.getcrc(data1, 0, data1.length);
        const crc2 = Packet.getcrc(data2, 0, data2.length);

        if (crc1 !== crc2) {
            console.log(crc1, crc2);
            console.log(data1.length, data2.length);
            console.log(data1.subarray(data1.length - 2), data2.subarray(data2.length - 2));
            throw new Error(`archive ${archive} file ${file} content differs`);
        }
    }
}

console.log('Complete match');
process.exit(0);
