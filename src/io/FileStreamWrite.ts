import fs from 'fs';

import Packet from '#/io/Packet.js';
import RandomAccessFile from '#/io/RandomAccessFile.js';

export default class FileStreamWrite {
    dat: RandomAccessFile;
    idx: RandomAccessFile[] = [];
    lastChunk: number = 0;

    constructor(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(`${dir}/main_file_cache.dat`, new Uint8Array());
        this.dat = new RandomAccessFile(`${dir}/main_file_cache.dat`);

        for (let i = 0; i < 5; ++i) {
            fs.writeFileSync(`${dir}/main_file_cache.idx${i}`, new Uint8Array());
            this.idx[i] = new RandomAccessFile(`${dir}/main_file_cache.idx${i}`);
        }

        this.lastChunk = Math.floor(this.dat.length / 520);
    }

    close() {
        this.dat.close();

        for (let i = 0; i < 5; ++i) {
            this.idx[i].close();
        }
    }

    write(archive: number, file: number, src: Uint8Array, version: number) {
        if (archive !== 0) {
            // append version trailer
            const tmp = new Uint8Array(src.length + 2);
            tmp.set(src, 0);
            tmp[src.length] = version >> 16;
            tmp[src.length + 1] = version;
            src = tmp;
        }

        const idxBuf = new Packet(new Uint8Array(6));
        idxBuf.p3(src.length);
        idxBuf.p3(++this.lastChunk);
        this.idx[archive].pos = file * 6;
        this.idx[archive].pdata(idxBuf);

        const header = new Packet(new Uint8Array(8));
        const temp = new Uint8Array(512);

        const buf = new Packet(src);
        let part = 0;
        while (buf.available > 0) {
            this.dat.pos = this.lastChunk * 520;

            header.pos = 0;
            header.p2(file);
            header.p2(part++);
            if (buf.available > 512) {
                header.p3(++this.lastChunk);
            } else {
                header.p3(0);
            }
            header.p1(archive + 1);
            this.dat.pdata(header);

            buf.gdata(temp, 0, 512);
            this.dat.pdata(temp);
        }
    }
}
