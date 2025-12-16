import { db } from '#/db/query.js';

try {
    await db
        .insertInto('game')
        .ignore()
        .values([{
            name: 'runescape',
            display_name: 'RuneScape',
            newspost_url: 'https://runescape.wiki/w/Update:'
        }, {
            name: 'rsclassic',
            display_name: 'RuneScape Classic',
            newspost_url: 'https://classic.runescape.wiki/w/Update:'
        }, {
            name: 'oldscape',
            display_name: 'Old School RuneScape',
            newspost_url: 'https://oldschool.runescape.wiki/w/Update:'
        },
        // funorb
        {
            name: 'geoblox',
            display_name: 'Geoblox'
        }, {
            name: 'lexicominos',
            display_name: 'Lexicominos'
        }, {
            name: 'bouncedown',
            display_name: 'Bouncedown'
        }, {
            name: 'drphlogistonsavestheearth',
            display_name: 'Dr. Phlogiston Saves The Earth'
        }, {
            name: 'minerdisturbance',
            display_name: 'Miner Disturbance'
        }, {
            name: 'wizardrun',
            display_name: 'Wizard Run'
        }, {
            name: '36cardtrick',
            display_name: 'Thirty-Six Card Trick'
        }, {
            name: 'holdtheline',
            display_name: 'Hold The Line'
        }, {
            name: 'starcannon',
            display_name: 'Star Cannon'
        }, {
            name: 'stellarshard',
            display_name: 'Stellar Shard'
        }, {
            name: 'torquing',
            display_name: 'Torquing!'
        }, {
            name: 'trackcontroller',
            display_name: 'The Track Controller'
        }, {
            name: 'transmogrify',
            display_name: 'Transmogrify'
        }, {
            name: 'Chess',
            display_name: 'Chess'
        }, {
            name: 'crazycrystals',
            display_name: 'Crazy Crystals'
        }, {
            name: 'solknight',
            display_name: 'Sol-Knight'
        }, {
            name: 'tetralink',
            display_name: 'TetraLink'
        }, {
            name: 'aceofskies',
            display_name: 'Ace of Skies'
        }, {
            name: 'arcanistsmulti',
            display_name: 'Arcanists'
        }, {
            name: 'confined',
            display_name: 'Confined'
        }, {
            name: 'escapevector',
            display_name: 'Escape Vector'
        }, {
            name: 'fleacircus',
            display_name: 'Flea Circus'
        }, {
            name: 'hostilespawn',
            display_name: 'Hostile Spawn'
        }, {
            name: 'monkeypuzzle2',
            display_name: 'Monkey Puzzle 2'
        }, {
            name: 'shatteredplans',
            display_name: 'Shattered Plans'
        }, {
            name: 'terraphoenix',
            display_name: 'TerraPhoenix'
        }, {
            name: 'dekobloko',
            display_name: 'Deko Bloko'
        }, {
            name: 'dungeonassault',
            display_name: 'Dungeon Assault'
        }, {
            name: 'torchallenge',
            display_name: 'Tor Challenge'
        }, {
            name: 'zombiedawn',
            display_name: 'Zombie Dawn'
        }, {
            name: 'Pixelate',
            display_name: 'Pixelate'
        }, {
            name: 'orbdefence',
            display_name: 'Orb Defence'
        }, {
            name: 'pool',
            display_name: 'Pool'
        }, {
            name: 'vertigo2',
            display_name: 'Vertigo 2'
        }, {
            name: 'brickabrac',
            display_name: 'Brick-à-Brac'
        }, {
            name: 'armiesofgielinor',
            display_name: 'Armies of Gielinor'
        }, {
            name: 'Kickabout',
            display_name: 'Kickabout League'
        }, {
            name: 'bachelorfridge',
            display_name: 'Bachelor Fridge'
        }, {
            name: 'steelsentinels',
            display_name: 'Steel Sentinels'
        }, {
            name: 'zombiedawnmulti',
            display_name: 'Zombie Dawn Multiplayer'
        }, {
            name: 'virogrid',
            display_name: 'Virogrid'
        }, {
            name: 'tombracer',
            display_name: 'Tomb Racer'
        }, {
            name: 'voidhunters',
            display_name: 'Void Hunters'
        }, {
            name: 'sumoblitz',
            display_name: 'Sumoblitz'
        }])
        .execute();
} catch (err) {
}

process.exit(0);

/*
// runescape
{
    name: 'darkscape',
    display_name: 'DarkScape',
    parent_game: 1
}, {
    name: 'dotd',
    display_name: 'Dimension of the Damned',
    parent_game: 1
}, {
    name: 'runescape-de',
    display_name: 'RuneScape (DE)',
    parent_game: 1
}, {
    name: 'runescape-fr',
    display_name: 'RuneScape (FR)',
    parent_game: 1
}, {
    name: 'runescape-pt',
    display_name: 'RuneScape (PT)',
    parent_game: 1
}, {
    name: 'runescape-beta',
    display_name: 'RuneScape (Beta)',
    parent_game: 1 
},
{
    name: 'worldmap',
    display_name: 'World Map',
    parent_game: 1
},
// oldscape
{
    name: 'oldscape-beta',
    display_name: 'Old School RuneScape (Beta)',
    parent_game: 3
},
*/
