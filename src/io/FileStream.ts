import RandomAccessFile from '#/io/RandomAccessFile.js';

export default class FileStream {
    static buf = new Uint8Array(520);

    dat: RandomAccessFile;
    idx: RandomAccessFile[] = [];
    idxCount: number[] = [];

    constructor(dir: string) {
        this.dat = new RandomAccessFile(`${dir}/main_file_cache.dat`);

        for (let i = 0; i <= 4; i++) {
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

    read(archive: number, file: number): Uint8Array | null {
        if (!this.dat) {
            return null;
        }

        if (archive < 0 || archive >= this.idx.length || !this.idx[archive]) {
            return null;
        }

        if (file < 0 || file >= this.count(archive)) {
            return null;
        }

        const idx = this.idx[archive];
        idx.pos = file * 6;
        idx.gdata(FileStream.buf, 0, 6);

        const len = (FileStream.buf[0] << 16) + (FileStream.buf[1] << 8) + FileStream.buf[2];
        let block = (FileStream.buf[3] << 16) + (FileStream.buf[4] << 8) + FileStream.buf[5];

        if (len > 2_000_000) {
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
            if (blockSize > 512) {
                blockSize = 512;
            }

            this.dat.gdata(FileStream.buf, 0, 8 + blockSize);

            const actualBlockFile = (FileStream.buf[0] << 8) + FileStream.buf[1];
            const actualBlockNum = (FileStream.buf[2] << 8) + FileStream.buf[3];
            const nextBlock = (FileStream.buf[4] << 16) + (FileStream.buf[5] << 8) + FileStream.buf[6];
            const actualBlockArchive = FileStream.buf[7];

            if (file !== actualBlockFile || blockNum !== actualBlockNum || archive !== actualBlockArchive - 1) {
                return null;
            }

            if (nextBlock < 0 || nextBlock > this.dat.length / 520) {
                return null;
            }

            buf.set(FileStream.buf.subarray(8, 8 + blockSize), off);
            off += blockSize;

            blockNum++;
            block = nextBlock;
        }

        return buf;
    }

    has(archive: number, file: number): boolean {
        if (!this.dat) {
            return false;
        }

        if (archive < 0 || archive >= this.idx.length || !this.idx[archive]) {
            return false;
        }

        if (file < 0 || file >= this.count(archive)) {
            return false;
        }

        const idx = this.idx[archive];
        idx.pos = file * 6;
        idx.gdata(FileStream.buf, 0, 6);

        const len = (FileStream.buf[0] << 16) + (FileStream.buf[1] << 8) + FileStream.buf[2];
        const block = (FileStream.buf[3] << 16) + (FileStream.buf[4] << 8) + FileStream.buf[5];

        if (len > 2000000) {
            return false;
        }

        if (block <= 0 || block > this.dat.length / 520) {
            return false;
        }

        return true;
    }
}
