import zlib from 'zlib';

import Packet from '#/io/Packet.js';
import RandomAccessFile from '#/io/RandomAccessFile.js';

export default class FileStream {
    dat: RandomAccessFile;
    idx: RandomAccessFile[] = [];

    constructor(dir: string) {
        this.dat = new RandomAccessFile(`${dir}/main_file_cache.dat`);

        for (let i: number = 0; i <= 4; i++) {
            this.idx[i] = new RandomAccessFile(`${dir}/main_file_cache.idx${i}`);
        }
    }

    count(index: number): number {
        if (index < 0 || index > this.idx.length || !this.idx[index]) {
            return 0;
        }

        return this.idx[index].length / 6;
    }

    read(archive: number, file: number, decompress: boolean = false): Uint8Array | null {
        if (!this.dat) {
            return null;
        }

        if (archive < 0 || archive >= this.idx.length || !this.idx[archive]) {
            return null;
        }

        if (file < 0 || file >= this.count(archive)) {
            return null;
        }

        const idx: RandomAccessFile = this.idx[archive];
        idx.pos = file * 6;
        const idxHeader: Packet = idx.gPacket(6);

        const size: number = idxHeader.g3();
        let sector: number = idxHeader.g3();

        if (size > 2000000) {
            return null;
        }

        if (sector <= 0 || sector > this.dat.length / 520) {
            return null;
        }

        const data: Packet = new Packet(new Uint8Array(size));
        for (let part: number = 0; data.pos < size; part++) {
            if (sector === 0) {
                break;
            }

            this.dat.pos = sector * 520;

            let available: number = size - data.pos;
            if (available > 512) {
                available = 512;
            }

            const header: Packet = this.dat.gPacket(available + 8);
            const sectorFile: number = header.g2();
            const sectorPart: number = header.g2();
            const nextSector: number = header.g3();
            const sectorIndex: number = header.g1();

            if (file !== sectorFile || part !== sectorPart || archive !== sectorIndex - 1) {
                return null;
            }

            if (nextSector < 0 || nextSector > this.dat.length / 520) {
                return null;
            }

            data.pdata(header.data, header.pos, header.data.length);

            sector = nextSector;
        }

        if (!decompress) {
            return data.data;
        }

        if (archive === 0) {
            return data.data;
        } else {
            return new Uint8Array(zlib.gunzipSync(data.data));
        }
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

        const idx: RandomAccessFile = this.idx[archive];
        idx.pos = file * 6;
        const idxHeader: Packet = idx.gPacket(6);

        const size: number = idxHeader.g3();
        const sector: number = idxHeader.g3();

        if (size > 2000000) {
            return false;
        }

        if (sector <= 0 || sector > this.dat.length / 520) {
            return false;
        }

        return true;
    }
}
