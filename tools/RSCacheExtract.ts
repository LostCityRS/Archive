// TS port of https://github.com/edward4096/rscachefinder/blob/main/cache_extract.cpp
import fs from 'fs';
import path from 'path';

import RandomAccessFile from '#/io/RandomAccessFile.js';

function peek(file: RandomAccessFile): number {
    const tmp = new Uint8Array(1);
    const r = file.gdata(tmp, 0, 1);
    file.pos -= 1;
    return r === 1 ? tmp[0] : 0;
}

function read(file: RandomAccessFile, dst: NodeJS.ArrayBufferView, len: number): boolean {
    const r = file.gdata(dst, 0, len);
    return r === len;
}

type FILETIME = {
    dwLowDateTime: number; // DWORD
    dwHighDateTime: number; // DWORD
};

const UNIX_EPOCH_START_TICKS = 116444736000000000n;
function filetimeToDate(filetime: FILETIME): Date {
    const filetimeUtcTicks = (BigInt(filetime.dwHighDateTime) << 32n) | BigInt(filetime.dwLowDateTime);
    const unixEpochTicks = filetimeUtcTicks - UNIX_EPOCH_START_TICKS;
    const millisecondsSinceEpoch = unixEpochTicks / BigInt(10000);
    return new Date(Number(millisecondsSinceEpoch));
}

type WIN32_FIND_DATA = {
    dwFileAttributes: number; // DWORD
    ftCreationTime: FILETIME;
    ftLastAccessTime: FILETIME;
    ftLastWriteTime: FILETIME;
    nFileSizeHigh: number; // DWORD
    nFileSizeLow: number; // DWORD
    dwReserved0: number; // DWORD
    dwReserved1: number; // DWORD
    cFileName: string; // CHAR[MAX_PATH] MAX_PATH=260
    cAlternateFileName: string; // CHAR[14]
}

export default function rsCacheExtract(inFile: string, outDir: string) {
    const rsCaches = new RandomAccessFile(inFile);

    const newVersion = peek(rsCaches) === 0xFE;
    if (newVersion) {
        const signature = new Uint32Array(1);
        if (!read(rsCaches, signature, 4) || signature[0] != 0x435352FE) {
            console.error("Bad signature. This isn't a cache file!");
            process.exit(1);
        }
    }

    let index = 0;
    let getDirPath = true;
    let strDir = new Uint8Array(300);
    let strAppend = '';

    while (true) {
        if (getDirPath && newVersion) {
            getDirPath = false;

            const nLen = new Uint32Array(1);
            if (!read(rsCaches, nLen, 4) || nLen[0] >= 300 || !read(rsCaches, strDir, nLen[0])) {
                break;
            }

            // todo: update strDir/strAppend
        }

        if (peek(rsCaches) === 0xFF) {
            index++;
            const c = new Uint8Array(1);
            read(rsCaches, c, 1);
            getDirPath = true;
        } else {
            const d: WIN32_FIND_DATA = {
                dwFileAttributes: 0,
                ftCreationTime: {
                    dwLowDateTime: 0,
                    dwHighDateTime: 0
                },
                ftLastAccessTime: {
                    dwLowDateTime: 0,
                    dwHighDateTime: 0
                },
                ftLastWriteTime: {
                    dwLowDateTime: 0,
                    dwHighDateTime: 0
                },
                nFileSizeHigh: 0,
                nFileSizeLow: 0,
                dwReserved0: 0,
                dwReserved1: 0,
                cFileName: '',
                cAlternateFileName: ''
            };

            const tmpDword = new Uint32Array(1);
            const tmpString = new Uint8Array(260);

            if (!read(rsCaches, tmpDword, 4)) break;
            d.dwFileAttributes = tmpDword[0];

            if (!read(rsCaches, tmpDword, 4)) break;
            d.ftCreationTime.dwLowDateTime = tmpDword[0];

            if (!read(rsCaches, tmpDword, 4)) break;
            d.ftCreationTime.dwHighDateTime = tmpDword[0];

            if (!read(rsCaches, tmpDword, 4)) break;
            d.ftLastAccessTime.dwLowDateTime = tmpDword[0];

            if (!read(rsCaches, tmpDword, 4)) break;
            d.ftLastAccessTime.dwHighDateTime = tmpDword[0];

            if (!read(rsCaches, tmpDword, 4)) break;
            d.ftLastWriteTime.dwLowDateTime = tmpDword[0];

            if (!read(rsCaches, tmpDword, 4)) break;
            d.ftLastWriteTime.dwHighDateTime = tmpDword[0];

            if (!read(rsCaches, tmpDword, 4)) break;
            d.nFileSizeHigh = tmpDword[0];

            if (!read(rsCaches, tmpDword, 4)) break;
            d.nFileSizeLow = tmpDword[0];

            if (!read(rsCaches, tmpDword, 4)) break;
            d.dwReserved0 = tmpDword[0];

            if (!read(rsCaches, tmpDword, 4)) break;
            d.dwReserved1 = tmpDword[0];

            if (!read(rsCaches, tmpString, 260)) break;
            d.cFileName = Buffer.from(tmpString).toString();
            d.cFileName = d.cFileName.substring(0, d.cFileName.indexOf('\0'));

            if (!read(rsCaches, tmpString, 14)) break;
            d.cAlternateFileName = Buffer.from(tmpString).toString();
            d.cAlternateFileName = d.cAlternateFileName.substring(0, Math.min(d.cAlternateFileName.indexOf('\0'), 14));

            if (!read(rsCaches, tmpDword, 2)) break; // wFinderFlags?

            let b = `${outDir}/cache${index}${strAppend}/`;
            fs.mkdirSync(b, { recursive: true });
            b += d.cFileName;

            console.log(b, filetimeToDate(d.ftLastWriteTime));

            const out = new RandomAccessFile(b);

            let br = 0;
            let buf = new Uint8Array(1 << 12);
            while (d.nFileSizeHigh > 0) {
                d.nFileSizeHigh -= 1;

                for (let i = 0; i < (1 << (32 - 12)); i++) {
                    if (!read(rsCaches, buf, buf.length)) {
                        d.nFileSizeHigh = 0;
                        d.nFileSizeLow = 0;
                        break;
                    }

                    out.pdata(buf, 0, buf.length);
                }
            }

            let pos = 0;
            while (pos < d.nFileSizeLow) {
                let left = d.nFileSizeLow - pos;
                br = left > buf.length ? buf.length : left;
                if (!read(rsCaches, buf, br)) {
                    break;
                }

                pos += br;
                out.pdata(buf, 0, br);
            }

            fs.utimesSync(b, filetimeToDate(d.ftLastAccessTime), filetimeToDate(d.ftLastWriteTime));
            out.close();
        }
    }

    // console.log('All complete.');
}

const args = process.argv.slice(2);

if (args.length < 1) {
    console.error('example args: <rscaches.dat>');
    process.exit(1);
}

rsCacheExtract(args[0], path.dirname(args[0]));

process.exit(0);
