import { importJag, importOnDemand } from '#tools/import.js';

const args = process.argv.slice(2);

if (args.length < 4) {
    console.error('example args: data/317 rs2 317 ondemand');
    process.exit(1);
}

try {
    const [source, game, build, era, timestamp, newspost] = args;

    if (era === 'ondemand') {
        await importOnDemand(source, game, build, timestamp, newspost);
    } else if (era === 'jag') {
        await importJag(source, game, build, timestamp, newspost);
    }
} catch (err) {
    if (err instanceof Error) {
        console.log(err.message);
    }
}

process.exit(0);
