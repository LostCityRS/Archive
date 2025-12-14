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
            display_name: 'DarkScape',
            parent_game: 1 // runescape
        }, {
            name: 'dotd',
            display_name: 'Dimension of the Damned',
            parent_game: 1 // runescape
        }, {
            name: 'runescape-de',
            display_name: 'RuneScape (DE)',
            parent_game: 1 // runescape
        }, {
            name: 'runescape-fr',
            display_name: 'RuneScape (FR)',
            parent_game: 1 // runescape
        }, {
            name: 'runescape-pt',
            display_name: 'RuneScape (PT)',
            parent_game: 1 // runescape
        }, {
            name: 'runescape-beta',
            display_name: 'RuneScape (Beta)',
            parent_game: 1 // runescape
        }, {
            name: 'oldscape-beta',
            display_name: 'Old School RuneScape (Beta)',
            parent_game: 3 // oldscape
        }, {
            name: 'worldmap',
            display_name: 'World Map',
            parent_game: 1 // runescape
        }])
        .execute();
} catch (err) {
}

process.exit(0);
