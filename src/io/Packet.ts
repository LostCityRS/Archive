export default class Packet {
    private static readonly crctable: Int32Array = new Int32Array(256);

    static {
        for (let i: number = 0; i < 256; i++) {
            let remainder: number = i;

            for (let bit: number = 0; bit < 8; bit++) {
                if ((remainder & 1) === 1) {
                    remainder = (remainder >>> 1) ^ 0xEDB88320;
                } else {
                    remainder >>>= 1;
                }
            }

            Packet.crctable[i] = remainder;
        }
    }

    static getcrc(src: Uint8Array, off: number, len: number): number {
        let crc = 0xffffffff;
        for (let i = off; i < len; i++) {
            crc = (crc >>> 8) ^ this.crctable[(crc ^ src[i]) & 0xff];
        }
        return ~crc;
    }

    static checkcrc(src: Uint8Array, off: number, len: number, expected: number): boolean {
        return Packet.getcrc(src, off, len) == expected;
    }

    private readonly view: DataView;
    readonly data: Uint8Array;
    pos: number = 0;

    constructor(src: Uint8Array | Int8Array | null) {
        if (!src) {
            throw new Error();
        }

        if (src instanceof Int8Array) {
            this.data = new Uint8Array(src);
        } else {
            this.data = src;
        }

        this.view = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    }

    get length(): number {
        return this.view.byteLength;
    }

    get available(): number {
        return this.view.byteLength - this.pos;
    }

    static alloc(size: number): Packet {
        if (size === 0) {
            return new Packet(new Uint8Array(100));
        } else if (size === 1) {
            return new Packet(new Uint8Array(5000));
        } else if (size === 2) {
            return new Packet(new Uint8Array(30000));
        } else {
            return new Packet(new Uint8Array(size));
        }
    }

    g1(): number {
        return this.view.getUint8(this.pos++);
    }

    g1b(): number {
        return this.view.getInt8(this.pos++);
    }

    g2(): number {
        const result: number = this.view.getUint16(this.pos);
        this.pos += 2;
        return result;
    }

    g3(): number {
        const result: number = (this.view.getUint8(this.pos++) << 16) | this.view.getUint16(this.pos);
        this.pos += 2;
        return result;
    }

    g4(): number {
        const result: number = this.view.getInt32(this.pos);
        this.pos += 4;
        return result;
    }

    gdata(dst: Uint8Array | Int8Array, off: number, len: number): void {
        dst.set(this.data.subarray(this.pos, this.pos + len), off);
        this.pos += len - off;
    }

    pdata(src: Uint8Array, off: number, len: number): void {
        this.data.set(src.subarray(off, off + len), this.pos);
        this.pos += len - off;
    }
}
