import { once } from 'events';
import { PassThrough } from 'stream';

import Packet from '#/io/Packet.js';

export default class FileStreamAsync {
    dat: PassThrough;
    lastBlock: number = 0;

    idx: PassThrough[] = [];
    idxBuf: Packet[] = [];

    constructor() {
        this.dat = new PassThrough({
            highWaterMark: 4 * 520
        });
        this.dat.setMaxListeners(0);

        this.dat.write(new Uint8Array(520)); // first block is always empty

        for (let i = 0; i < 5; ++i) {
            this.idx[i] = new PassThrough();
            this.idxBuf[i] = Packet.alloc(65536 * 6);
        }
    }

    end() {
        this.dat.end();

        for (let i = 0; i < 5; ++i) {
            // todo: assumes the last write was the last file
            this.idx[i].write(this.idxBuf[i].data.subarray(0, this.idxBuf[i].pos));
            this.idx[i].end();
        }
    }

    async write(archive: number, file: number, src: Uint8Array, version: number) {
        if (archive !== 0) {
            version += 1; // because the import process subtracts 1 (correct to do)

            // append version trailer
            const tmp = new Uint8Array(src.length + 2);
            tmp.set(src, 0);
            tmp[src.length] = version >> 16;
            tmp[src.length + 1] = version;
            src = tmp;
        }

        this.idxBuf[archive].pos = file * 6;
        this.idxBuf[archive].p3(src.length);
        this.idxBuf[archive].p3(++this.lastBlock);

        const buf = new Packet(src);
        let part = 0;
        while (buf.available > 0) {
            let available = buf.available;
            if (available > 512) {
                available = 512;
            }

            const chunk = new Packet(new Uint8Array(520));
            chunk.p2(file);
            chunk.p2(part++);
            if (buf.available > available) {
                chunk.p3(++this.lastBlock);
            } else {
                chunk.p3(0);
            }
            chunk.p1(archive + 1);

            buf.gdata(chunk.data, 8, available);

            if (!this.dat.write(chunk.data)) {
                await once(this.dat, 'drain');
            }
        }
    }
}
