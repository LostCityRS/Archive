import { db } from '#/db/query.js';

try {
    await db
        .insertInto('game')
        .values([{
            name: 'runescape',
            display_name: 'RuneScape'
        }, {
            name: 'rsclassic',
            display_name: 'RuneScape Classic'
        }, {
            name: 'oldscape',
            display_name: 'Old School RuneScape'
        }, {
            name: 'darkscape',
            display_name: 'DarkScape'
        }, {
            name: 'dotd',
            display_name: 'Dimension of the Damned'
        }, {
            name: 'runescape-de',
            display_name: 'RuneScape (DE)'
        }, {
            name: 'runescape-fr',
            display_name: 'RuneScape (FR)'
        }, {
            name: 'runescape-pt',
            display_name: 'RuneScape (PT)'
        }, {
            name: 'runescape-beta',
            display_name: 'RuneScape (Beta)'
        }, {
            name: 'oldscape-beta',
            display_name: 'Old School RuneScape (Beta)'
        }, {
            name: 'worldmap',
            display_name: 'World Map'
        }])
        .execute();
} catch (err) {
}

process.exit(0);
