import RandomAccessFile from '#/io/RandomAccessFile.js';

export default class Js5LocalDiskCache {
    static buf = new Uint8Array(520);

    dat: RandomAccessFile;
    idx: RandomAccessFile[] = [];
    idxCount: number[] = [];

    constructor(dir: string, archives: number) {
        this.dat = new RandomAccessFile(`${dir}/main_file_cache.dat2`);

        this.idx[255] = new RandomAccessFile(`${dir}/main_file_cache.idx255`);
        for (let i = 0; i < archives; i++) {
            this.idx[i] = new RandomAccessFile(`${dir}/main_file_cache.idx${i}`);
            this.idxCount[i] = this.idx[i].length / 6;
        }
    }

    count(archive: number): number {
        if (archive < 0 || archive > this.idx.length || !this.idx[archive]) {
            return 0;
        }

        return this.idxCount[archive];
    }

    read(archive: number, group: number): Uint8Array | null {
        if (!this.dat) {
            return null;
        }

        if (archive < 0 || archive >= this.idx.length || !this.idx[archive]) {
            return null;
        }

        if (group < 0 || group >= this.count(archive)) {
            return null;
        }

        const idx = this.idx[archive];
        idx.pos = group * 6;
        idx.gdata(Js5LocalDiskCache.buf, 0, 6);

        const len = (Js5LocalDiskCache.buf[0] << 16) + (Js5LocalDiskCache.buf[1] << 8) + Js5LocalDiskCache.buf[2];
        let block = (Js5LocalDiskCache.buf[3] << 16) + (Js5LocalDiskCache.buf[4] << 8) + Js5LocalDiskCache.buf[5];

        if (len > 8_000_000) {
            return null;
        }

        if (block <= 0 || block > this.dat.length / 520) {
            return null;
        }

        const buf = new Uint8Array(len);
        let off = 0;
        let blockNum = 0;
        while (off < len) {
            if (block === 0) {
                break;
            }

            this.dat.pos = block * 520;
            let blockSize = len - off;

            if (group > 65535) {
                if (blockSize > 510) {
                    blockSize = 510;
                }

                this.dat.gdata(Js5LocalDiskCache.buf, 0, 10 + blockSize);

                const actualBlockGroup = (Js5LocalDiskCache.buf[0] << 24) + (Js5LocalDiskCache.buf[1] << 16) + (Js5LocalDiskCache.buf[2] << 8) + Js5LocalDiskCache.buf[3];
                const actualBlockNum = (Js5LocalDiskCache.buf[4] << 8) + Js5LocalDiskCache.buf[5];
                const nextBlock = (Js5LocalDiskCache.buf[6] << 16) + (Js5LocalDiskCache.buf[7] << 8) + Js5LocalDiskCache.buf[8];
                const actualBlockArchive = Js5LocalDiskCache.buf[9];

                if (group !== actualBlockGroup || blockNum !== actualBlockNum || archive !== actualBlockArchive) {
                    return null;
                }

                if (nextBlock < 0 || nextBlock > this.dat.length / 520) {
                    return null;
                }

                buf.set(Js5LocalDiskCache.buf.subarray(10, 10 + blockSize), off);
                off += blockSize;

                blockNum++;
                block = nextBlock;
            } else {
                if (blockSize > 512) {
                    blockSize = 512;
                }

                this.dat.gdata(Js5LocalDiskCache.buf, 0, 8 + blockSize);

                const actualBlockGroup = (Js5LocalDiskCache.buf[0] << 8) + Js5LocalDiskCache.buf[1];
                const actualBlockNum = (Js5LocalDiskCache.buf[2] << 8) + Js5LocalDiskCache.buf[3];
                const nextBlock = (Js5LocalDiskCache.buf[4] << 16) + (Js5LocalDiskCache.buf[5] << 8) + Js5LocalDiskCache.buf[6];
                const actualBlockArchive = Js5LocalDiskCache.buf[7];

                if (group !== actualBlockGroup || blockNum !== actualBlockNum || archive !== actualBlockArchive) {
                    return null;
                }

                if (nextBlock < 0 || nextBlock > this.dat.length / 520) {
                    return null;
                }

                buf.set(Js5LocalDiskCache.buf.subarray(8, 8 + blockSize), off);
                off += blockSize;

                blockNum++;
                block = nextBlock;
            }
        }

        return buf;
    }

    has(archive: number, group: number): boolean {
        if (!this.dat) {
            return false;
        }

        if (archive < 0 || archive >= this.idx.length || !this.idx[archive]) {
            return false;
        }

        if (group < 0 || group >= this.count(archive)) {
            return false;
        }

        const idx = this.idx[archive];
        idx.pos = group * 6;
        idx.gdata(Js5LocalDiskCache.buf, 0, 6);

        const len = (Js5LocalDiskCache.buf[0] << 16) + (Js5LocalDiskCache.buf[1] << 8) + Js5LocalDiskCache.buf[2];
        const block = (Js5LocalDiskCache.buf[3] << 16) + (Js5LocalDiskCache.buf[4] << 8) + Js5LocalDiskCache.buf[5];

        if (len > 2000000) {
            return false;
        }

        if (block <= 0 || block > this.dat.length / 520) {
            return false;
        }

        return true;
    }
}
