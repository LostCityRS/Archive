import fs from 'fs';

import Packet from '#/io/Packet.js';

export default class RandomAccessFile {
    fd: number;
    pos: number = 0;

    constructor(path: string, readOnly = false) {
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, '');
        }

        this.fd = fs.openSync(path, readOnly ? 'r' : 'r+');
    }

    get length(): number {
        return fs.fstatSync(this.fd).size;
    }

    gdata(dst: NodeJS.ArrayBufferView, off: number, len: number) {
        const n = fs.readSync(this.fd, dst, off, len, this.pos);
        this.pos += len;
        return n;
    }

    gPacket(length: number): Packet {
        const buffer = Buffer.alloc(length);
        fs.readSync(this.fd, buffer, 0, length, this.pos);
        this.pos += length;
        return new Packet(buffer);
    }

    pdata(src: Uint8Array, off: number, len: number): void {
        fs.writeSync(this.fd, src, off, len, this.pos);
        this.pos += len - off;
    }

    close(): void {
        fs.closeSync(this.fd);
    }
}
