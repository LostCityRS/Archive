import { PassThrough } from 'stream';

import Packet from '#/io/Packet.js';

export default class Js5LocalDiskCacheAsync {
    dat: PassThrough;
    idx: Packet[] = [];
    lastChunk: number = 0;

    constructor(archives: number) {
        this.dat = new PassThrough();
        this.dat.write(new Uint8Array(520)); // first chunk is always empty

        this.idx[255] = Packet.alloc((archives + 1) * 6);
        for (let i = 0; i < archives; ++i) {
            this.idx[i] = Packet.alloc(262144 * 6);
        }
    }

    end() {
        this.dat.end();
    }

    write(archive: number, group: number, src: Uint8Array, version: number) {
        // append version trailer
        const tmp = new Uint8Array(src.length + 2);
        tmp.set(src, 0);
        tmp[src.length] = version >> 16;
        tmp[src.length + 1] = version;
        src = tmp;

        this.idx[archive].pos = group * 6;
        this.idx[archive].p3(src.length);
        this.idx[archive].p3(++this.lastChunk);

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
                chunk.p3(++this.lastChunk);
            } else {
                chunk.p3(0);
            }
            chunk.p1(archive);

            buf.gdata(chunk.data, 8, available);

            this.dat.write(chunk.data);
        }
    }
}
