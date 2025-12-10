import { db } from '#/db/query.js';

import FileStream from '#/io/FileStream.js';
import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

async function importCache(build: string) {
    console.time(build);

    const cache = await db.insertInto('cache').values({
        build
    }).executeTakeFirstOrThrow();
    const cacheId = Number(cache.insertId);

    const stream = new FileStream(`data/${build}`);

    for (let i = 1; i < 9; i++) {
        const buf = stream.read(0, i);
        if (buf) {
            const crc = Packet.getcrc(buf, 0, buf.length);

            await db.insertInto('data').values({
                archive: 0,
                file: i,
                version: -1,
                data: Buffer.from(buf),
                crc,
                len: buf.length
            }).execute();

            await db.insertInto('cache_file').values({
                cache_id: cacheId,
                archive: 0,
                file: i,
                version: -1,
                crc,
                essential: 1
            }).execute();
        }
    }

    const versionlistRaw = stream.read(0, 5);
    if (versionlistRaw) {
        const versionlist = new Jagfile(versionlistRaw);
        const versions: number[][] = [];
        const crcs: number[][] = [];
        let models: number[] = [];

        const version: string[] = ['model_version', 'anim_version', 'midi_version', 'map_version'];
        for (let i = 0; i < 4; i++) {
            const data = versionlist.read(version[i]);
            if (!data) {
                throw new Error();
            }

            const count = data.length / 2;
            const buf = new Packet(data);

            versions[i] = new Array(count);

            for (let j = 0; j < count; j++) {
                versions[i][j] = buf.g2();
            }
        }

        const crc: string[] = ['model_crc', 'anim_crc', 'midi_crc', 'map_crc'];
        for (let i = 0; i < 4; i++) {
            const data = versionlist.read(crc[i]);
            if (!data) {
                throw new Error();
            }

            const count = data.length / 4;
            const buf = new Packet(data);

            crcs[i] = new Array(count);

            for (let j = 0; j < count; j++) {
                crcs[i][j] = buf.g4();
            }
        }

        let data = versionlist.read('model_index');
        if (data) {
            const count = versions[0].length;
            models = new Array(count);

            for (let i = 0; i < count; i++) {
                if (i < data.length) {
                    models[i] = data[i];
                } else {
                    models[i] = 0;
                }
            }
        }

        for (let archive = 0; archive < 4; archive++) {
            for (let file = 0; file < versions[archive].length; file++) {
                const version = versions[archive][file];
                const crc = crcs[archive][file];

                if (version === 0) {
                    continue;
                }

                let essential = true;
                if (archive === 1) {
                    essential = models[file] > 0;
                }

                await db.insertInto('cache_file').values({
                    cache_id: cacheId,
                    archive: archive + 1,
                    file,
                    version,
                    crc,
                    essential: essential ? 1 : 0
                }).execute();

                const buf = stream.read(archive + 1, file);
                if (buf) {
                    const checksum = Packet.getcrc(buf, 0, buf.length - 2);
                    if (checksum === crcs[archive][file]) {
                        await db.insertInto('data').values({
                            archive: archive + 1,
                            file,
                            version,
                            data: Buffer.from(buf),
                            crc,
                            len: buf.length
                        }).execute();
                    }
                }
            }
        }
    }

    console.timeEnd(build);
}

const revs: string[] = [
    // '243',
    // '244',
    // '245.1',
    '245.2',
    // '254',
    // '270',
    // '274',
    // '289',
    // '291',
    // '295',
    // '298',
    // '299',
    // '303',
    // '304',
    // '306',
    // '308',
    // '311',
    // '312',
    // '316',
    // '317',
    // '318',
    // '319',
    // '321',
    // '324',
    // '325',
    // '326',
    // '327',
    // '330',
    // '332',
    // '333',
    // '334',
    // '336',
    // '337',
    // '338',
    // '339',
    // '340',
    // '341',
    // '342',
    // '343',
    // '345',
    // '346',
    // '347',
    // '349',
    // '350',
    // '355',
    // '356',
    // '357',
    // '358',
    // '359',
    // '362',
    // '363',
    // '365',
    // '366',
    // '367',
    // '368',
    // '369',
    // '372',
    // '373',
    // '374',
    // '376',
    // '377'
];

for (const rev of revs) {
    await importCache(rev);
}

process.exit(0);
