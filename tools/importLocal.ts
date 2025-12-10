import { importOnDemand } from '#tools/import.js';

const args = process.argv.slice(2);

if (args.length < 4) {
    console.error('example args: data/317 rs2 317 ondemand');
    process.exit(1);
}

try {
    await importOnDemand(args[0], args[1], args[2], args[3], args[4], args[5]);
} catch (err) {
    if (err instanceof Error) {
        console.log(err.message);
    }
}

process.exit(0);
