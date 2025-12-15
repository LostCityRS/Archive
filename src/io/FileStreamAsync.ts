import { PassThrough } from 'stream';

import Packet from '#/io/Packet.js';

export default class FileStreamAsync {
    dat: PassThrough;
    idx: Packet[] = [];
    lastChunk: number = 0;

    constructor() {
        this.dat = new PassThrough();
        this.dat.write(new Uint8Array(520)); // first chunk is always empty

        for (let i = 0; i < 5; ++i) {
            this.idx[i] = Packet.alloc(65536 * 6);
        }
    }

    end() {
        this.dat.end();
    }

    write(archive: number, file: number, src: Uint8Array, version: number) {
        if (archive !== 0) {
            version += 1; // because the import process subtracts 1 (correct to do)

            // append version trailer
            const tmp = new Uint8Array(src.length + 2);
            tmp.set(src, 0);
            tmp[src.length] = version >> 16;
            tmp[src.length + 1] = version;
            src = tmp;
        }

        this.idx[archive].pos = file * 6;
        this.idx[archive].p3(src.length);
        this.idx[archive].p3(++this.lastChunk);

        const chunk = new Packet(new Uint8Array(520));

        const buf = new Packet(src);
        let part = 0;
        while (buf.available > 0) {
            chunk.pos = 0;
            chunk.p2(file);
            chunk.p2(part++);
            if (buf.available > 512) {
                chunk.p3(++this.lastChunk);
            } else {
                chunk.p3(0);
            }
            chunk.p1(archive + 1);

            let available = buf.available;
            if (available > 512) {
                available = 512;
            }
            buf.gdata(chunk.data, 8, available);

            this.dat.write(chunk.data);
        }
    }
}
