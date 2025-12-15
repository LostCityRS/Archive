#!/bin/sh
mkdir tmp
cd tmp
wget https://archive.openrs2.org/caches/runescape/$1/disk.zip
unzip disk.zip
cd ../
# game revision cachetype
bun run import tmp/cache $2 $3 $4
rm -rf tmp
