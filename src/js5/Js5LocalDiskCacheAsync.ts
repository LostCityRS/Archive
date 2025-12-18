import { once } from 'events';
import { PassThrough } from 'stream';

import Packet from '#/io/Packet.js';

export default class Js5LocalDiskCacheAsync {
    dat: PassThrough;
    lastBlock: number = 0;

    idx: PassThrough[] = [];
    idxBuf: Packet[] = [];

    constructor(archives: number) {
        this.dat = new PassThrough({
            highWaterMark: 4 * 520
        });
        this.dat.setMaxListeners(0);
        this.dat.write(new Uint8Array(520)); // first block is always empty

        this.idx[255] = new PassThrough();
        this.idxBuf[255] = Packet.alloc((archives + 1) * 6);

        for (let i = 0; i < archives; ++i) {
            this.idx[i] = new PassThrough();
            this.idxBuf[i] = Packet.alloc(262144 * 6);
        }
    }

    end() {
        this.dat.end();

        for (let i = 0; i < this.idx.length; ++i) {
            if (!this.idx[i]) continue;

            // todo: assumes the last write was the last group
            this.idx[i].write(this.idxBuf[i].data.subarray(0, this.idxBuf[i].pos));
            this.idx[i].end();
        }
    }

    async write(archive: number, group: number, src: Uint8Array, version: number) {
        // append version trailer
        const tmp = new Uint8Array(src.length + 2);
        tmp.set(src, 0);
        tmp[src.length] = version >> 16;
        tmp[src.length + 1] = version;
        src = tmp;

        this.idxBuf[archive].pos = group * 6;
        this.idxBuf[archive].p3(src.length);
        this.idxBuf[archive].p3(++this.lastBlock);

        const chunk = new Packet(new Uint8Array(520));

        const buf = new Packet(src);
        let part = 0;
        while (buf.available > 0) {
            let available = buf.available;
            if (group > 65535) {
                if (available > 510) {
                    available = 510;
                }
            } else {
                if (available > 512) {
                    available = 512;
                }
            }

            chunk.pos = 0;
            if (group > 65535) {
                chunk.p4(group);
            } else {
                chunk.p2(group);
            }
            chunk.p2(part++);
            if (buf.available > available) {
                chunk.p3(++this.lastBlock);
            } else {
                chunk.p3(0);
            }
            chunk.p1(archive);

            buf.gdata(chunk.data, 8, available);

            if (!this.dat.write(chunk.data)) {
                await once(this.dat, 'drain');
            }
        }
    }
}
