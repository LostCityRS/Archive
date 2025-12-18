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

    gdata(dst: Uint8Array, off: number, len: number) {
        fs.readSync(this.fd, dst, off, len, this.pos);
        this.pos += len;
    }

    gPacket(length: number): Packet {
        const buffer = Buffer.alloc(length);
        fs.readSync(this.fd, buffer, 0, length, this.pos);
        this.pos += length;
        return new Packet(buffer);
    }

    pdata(buffer: Uint8Array | Buffer | Packet): void {
        if (buffer instanceof Packet) {
            buffer = buffer.data;
        }

        fs.writeSync(this.fd, buffer, 0, buffer.length, this.pos);
        this.pos += buffer.length;
    }

    close(): void {
        fs.closeSync(this.fd);
    }
}
