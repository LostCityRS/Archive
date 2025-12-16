import { importJs5WithoutIndex } from '#tools/import/util.js';

const args = process.argv.slice(2);

if (args.length < 3) {
    console.error('example args: <folder> <game> <timestamp>');
    process.exit(1);
}

try {
    const [source, game, build] = args;

    await importJs5WithoutIndex(source, game, build);
} catch (err) {
    if (err instanceof Error) {
        console.log(err.message);
    }
}

process.exit(0);
