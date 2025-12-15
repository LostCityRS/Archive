import { gunzipSync } from 'zlib';

import { bunzip2 } from '#/io/BZip2.js';
import Packet from '#/io/Packet.js';

function decompress(src: Uint8Array) {
    const buf = new Packet(src);

    const ctype = buf.g1();
    const clen = buf.g4();
    if (clen < 0) {
        throw new Error();
    }

    if (ctype === 0) {
        const temp = new Uint8Array(clen);
        buf.gdata(temp, 0, clen);
        return temp;
    } else {
        const ulen = buf.g4();
        if (ulen < 0) {
            throw new Error();
        }

        const temp = new Uint8Array(ulen);
        if (ctype === 1) {
            temp.set(bunzip2(buf.data.subarray(buf.pos), true, false, true), 0);
        } else {
            temp.set(gunzipSync(buf.data.subarray(buf.pos)), 0);
        }
        return temp;
    }
}

export default class Js5Index {
    crc = 0;
    version = 0;
    size = 0;
    capacity = 0;

    groupIds = new Int32Array();
    groupNameHash = new Int32Array();
    groupNameHashTable = new Map<number, number>();
    groupChecksum = new Int32Array();
    groupUncompressedChecksums = new Int32Array();
    groupDigests: Uint8Array[] = [];
    groupLengths = new Int32Array();
    groupUncompressedLengths = new Int32Array();
    groupVersion = new Int32Array();
    groupSize = new Int32Array();
    groupCapacity = new Int32Array();

    fileIds: (Int32Array | null)[] = [];
    fileNameHash: Int32Array[] = [];
    fileNameHashTable: Map<number, number>[] = [];

    constructor(src?: Uint8Array | null) {
        if (typeof src !== 'undefined' && src) {
            this.decode(src);
        }
    }

    decode(src: Uint8Array) {
        this.crc = Packet.getcrc(src, 0, src.length);

        const buf = new Packet(decompress(src));

        const protocol = buf.g1();
        if (protocol < 5 || protocol > 8) {
            throw new Error();
        }

        if (protocol >= 6) {
            this.version = buf.g4();
        } else {
            this.version = 0;
        }

        const info = buf.g1();
        const hasNames = (info & 0x1) !== 0;
        const hasDigests = (info & 0x2) !== 0;
        const hasLengths = (info & 0x4) !== 0;
        const hasUncompressedChecksums = (info & 0x8) !== 0;

        if (protocol >= 7) {
            this.size = buf.gSmart2or4();
        } else {
            this.size = buf.g2();
        }

        let prevGroupId = 0;
        let maxGroupId = -1;
        this.groupIds = new Int32Array(this.size);

        for (let i = 0; i < this.size; i++) {
            if (protocol >= 7) {
                this.groupIds[i] = prevGroupId += buf.gSmart2or4();
            } else {
                this.groupIds[i] = prevGroupId += buf.g2();
            }

            if (this.groupIds[i] > maxGroupId) {
                maxGroupId = this.groupIds[i];
            }
        }

        this.capacity = maxGroupId + 1;
        this.groupSize = new Int32Array(this.capacity);
        this.groupChecksum = new Int32Array(this.capacity);
        this.groupVersion = new Int32Array(this.capacity);
        this.fileIds = new Array(this.capacity).fill(null);
        this.groupCapacity = new Int32Array(this.capacity);

        if (hasNames) {
            this.groupNameHash = new Int32Array(this.capacity);
            this.groupNameHashTable = new Map();

            for (let i = 0; i < this.capacity; i++) {
                this.groupNameHash[i] = -1;
            }

            for (let i = 0; i < this.size; i++) {
                this.groupNameHash[this.groupIds[i]] = buf.g4();
                this.groupNameHashTable.set(this.groupNameHash[this.groupIds[i]], this.groupIds[i]);
            }
        }

        for (let i = 0; i < this.size; i++) {
            this.groupChecksum[this.groupIds[i]] = buf.g4();
        }

        if (hasUncompressedChecksums) {
            this.groupUncompressedChecksums = new Int32Array(this.capacity);

            for (let i: number = 0; i < this.size; i++) {
                this.groupUncompressedChecksums[this.groupIds[i]] = buf.g4();
            }
        }

        if (hasDigests) {
            this.groupDigests = new Array(this.capacity).fill(null);

            for (let i: number = 0; i < this.size; i++) {
                const data: Uint8Array = new Uint8Array(64);
                buf.gdata(data, 0, data.length);
                this.groupDigests[this.groupIds[i]] = data;
            }
        }

        if (hasLengths) {
            this.groupLengths = new Int32Array(this.capacity);
            this.groupUncompressedLengths = new Int32Array(this.capacity);

            for (let i: number = 0; i < this.size; i++) {
                this.groupLengths[this.groupIds[i]] = buf.g4();
                this.groupUncompressedLengths[this.groupIds[i]] = buf.g4();
            }
        }

        for (let i = 0; i < this.size; i++) {
            this.groupVersion[this.groupIds[i]] = buf.g4();
        }

        for (let i = 0; i < this.size; i++) {
            if (protocol >= 7) {
                this.groupSize[this.groupIds[i]] = buf.gSmart2or4();
            } else {
                this.groupSize[this.groupIds[i]] = buf.g2();
            }
        }

        for (let i = 0; i < this.size; i++) {
            let prevFileId = 0;
            let maxFileId = -1;

            const groupId = this.groupIds[i];
            const groupSize = this.groupSize[groupId];
            this.fileIds[groupId] = new Int32Array(groupSize);

            for (let j = 0; j < groupSize; j++) {
                let fileId = 0;
                if (protocol >= 7) {
                    fileId = prevFileId += buf.gSmart2or4();
                } else {
                    fileId = prevFileId += buf.g2();
                }
                this.fileIds[groupId][j] = prevFileId;

                if (fileId > maxFileId) {
                    maxFileId = fileId;
                }
            }

            this.groupCapacity[groupId] = maxFileId + 1;
            if (maxFileId + 1 === groupSize) {
                this.fileIds[groupId] = null;
            }
        }

        if (hasNames) {
            this.fileNameHash = new Array(this.capacity);
            this.fileNameHashTable = new Array(this.capacity);

            for (let i = 0; i < this.size; i++) {
                const groupId = this.groupIds[i];
                const groupSize = this.groupSize[groupId];

                this.fileNameHash[groupId] = new Int32Array(this.groupCapacity[groupId]);
                this.fileNameHashTable[groupId] = new Map();

                for (let fileId = 0; fileId < this.groupCapacity[groupId]; fileId++) {
                    this.fileNameHash[groupId][fileId] = -1;
                }

                for (let j = 0; j < groupSize; j++) {
                    let fileId = -1;
                    if (this.fileIds[groupId]) {
                        fileId = this.fileIds[groupId][j];
                    } else {
                        fileId = j;
                    }

                    this.fileNameHash[groupId][fileId] = buf.g4();
                    this.fileNameHashTable[groupId].set(this.fileNameHash[groupId][fileId], fileId);
                }
            }
        }
    }
}
