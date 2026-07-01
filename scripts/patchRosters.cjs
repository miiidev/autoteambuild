const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../src/data/pokemon.json');
const roster = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

roster.forEach(pokemon => {
    if (!pokemon.roles) pokemon.roles = {};

    let flags = {
        snow_setter: false, rain_setter: false, sun_setter: false, sand_setter: false,
        snow_abuser: false, rain_abuser: false, sun_abuser: false, sand_abuser: false,
        intimidate: false,
        tailwind: false, fake_out: false, trick_room_setter: false, redirection: false, pivot: false
    };

    // 1. Scan structural abilities across all forms
    if (pokemon.availableForms) {
        pokemon.availableForms.forEach(form => {
            const abilities = form.abilities || [];
            
            // Weather Setters
            if (abilities.includes("Snow Warning")) flags.snow_setter = true;
            if (abilities.includes("Drizzle")) flags.rain_setter = true;
            if (abilities.includes("Drought")) flags.sun_setter = true;
            if (abilities.includes("Sand Stream")) flags.sand_setter = true;
            
            // Weather Abusers
            if (abilities.includes("Slush Rush")) flags.snow_abuser = true;
            if (abilities.includes("Swift Swim")) flags.rain_abuser = true;
            if (abilities.includes("Chlorophyll") || abilities.includes("Protosynthesis")) flags.sun_abuser = true;
            if (abilities.includes("Sand Rush") || abilities.includes("Sand Force")) flags.sand_abuser = true;

            // Core Meta Abilities
            if (abilities.includes("Intimidate")) flags.intimidate = true;
        });
    }

    // 2. Scan competitive move usage profiles to find tactical roles
    if (pokemon.usageData && pokemon.usageData.moves) {
        const moveList = pokemon.usageData.moves.map(m => m.name);
        
        if (moveList.includes("Tailwind")) flags.tailwind = true;
        if (moveList.includes("Fake Out")) flags.fake_out = true;
        if (moveList.includes("Trick Room")) flags.trick_room_setter = true;
        if (moveList.includes("Follow Me") || moveList.includes("Rage Powder")) flags.redirection = true;
        if (moveList.includes("U-turn") || moveList.includes("Volt Switch") || 
            moveList.includes("Parting Shot") || moveList.includes("Flip Turn")) {
            flags.pivot = true;
        }
    }

    // 3. Inject the detected roles into the Pokémon's data map
    Object.keys(flags).forEach(role => {
        if (flags[role]) {
            // Apply a default weight of 1 for these detected roles
            pokemon.roles[role] = 1; 
        }
    });
});

fs.writeFileSync(dataPath, JSON.stringify(roster, null, 2));
console.log("Roster data successfully patched with extended VGC meta archetypes!");