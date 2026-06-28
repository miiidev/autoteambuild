import fs from 'fs';
import path from 'path';

// The URL for the most recent VGC format chaos data.
// Update this date/format as new regulations are released!
const STATS_URL = "https://www.smogon.com/stats/2024-05/chaos/gen9vgc2024regg-1500.json";

// 1️⃣ MOVE TRIGGERS
const ROLE_TRIGGERS: Record<string, string> = {
    "Tailwind": "tailwind",
    "Trick Room": "trick_room_setter",
    "Icy Wind": "speed_control",
    "Electroweb": "speed_control",
    "Thunder Wave": "speed_control",
    "Fake Out": "fake_out",
    "Extreme Speed": "late_game_cleaner",
    "Sucker Punch": "late_game_cleaner",
    "Aqua Jet": "late_game_cleaner",
    "Grassy Glide": "late_game_cleaner",
    "Follow Me": "redirection",
    "Rage Powder": "redirection",
    "U-turn": "pivot",
    "Volt Switch": "pivot",
    "Parting Shot": "pivot",
    "Spore": "support",
    "Protect": "support",
    "Pollen Puff": "support",
    "Taunt": "support",
    "Rain Dance": "rain_setter",
    "Sunny Day": "sun_setter",
    "Swords Dance": "physical_sweeper",
    "Nasty Plot": "special_sweeper",
    "Calm Mind": "special_sweeper"
};

// 2️⃣ ABILITY TRIGGERS
const ABILITY_TRIGGERS: Record<string, string[]> = {
    "Drizzle": ["rain_setter"],
    "Drought": ["sun_setter"],
    "Sand Stream": ["sand_setter"],
    "Snow Warning": ["snow_setter"],
    "Swift Swim": ["rain_abuser", "physical_sweeper"],
    "Chlorophyll": ["sun_abuser", "special_sweeper"],
    "Intimidate": ["intimidate", "support"],
    "Prankster": ["support"],
    "Armor Tail": ["support"],
    "Good as Gold": ["special_sweeper", "wallbreaker"],
    "Unseen Fist": ["physical_sweeper", "wallbreaker"],
    "Regenerator": ["support"]
};

// 3️⃣ ITEM TRIGGERS
const ITEM_TRIGGERS: Record<string, string[]> = {
    "Choice Specs": ["special_sweeper", "wallbreaker"],
    "Choice Band": ["physical_sweeper", "wallbreaker"],
    "Life Orb": ["wallbreaker"],
    "Clear Amulet": ["physical_sweeper"],
    "Assault Vest": ["support"],
    "Rocky Helmet": ["support"],
    "Safety Goggles": ["support"],
    "Eviolite": ["support"],
    "Choice Scarf": ["late_game_cleaner"]
};

// Helpers
const getTop = (obj: Record<string, number>): string => {
    if (!obj || Object.keys(obj).length === 0) return "None";
    return Object.keys(obj).reduce((a, b) => (obj[a] > obj[b] ? a : b));
};

const getTopN = (obj: Record<string, number>, n: number): string[] => {
    if (!obj) return [];
    return Object.keys(obj)
        .filter(move => move !== "" && move !== "Nothing")
        .sort((a, b) => obj[b] - obj[a])
        .slice(0, n);
};

async function fetchAndParseShowdownData() {
    console.log(`📡 Fetching live VGC chaos data from: ${STATS_URL}...`);

    try {
        const response = await fetch(STATS_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const rawData = await response.json();
        const vgcData = rawData.data;

        // Grab the top 60 most used Pokémon in the format
        const topPokemonNames = Object.keys(vgcData)
            .sort((a, b) => vgcData[b].usage - vgcData[a].usage)
            .slice(0, 200);

        const updatedDataset: any[] = [];
        console.log(`⚙️ Processing Top 200 Pokémon...`);

        for (const name of topPokemonNames) {
            const pkm = vgcData[name];

            // Extract top configurations
            const topMoves = getTopN(pkm.Moves, 4);
            const topAbility = getTop(pkm.Abilities);
            const topItem = getTop(pkm.Items);
            const topSpreadRaw = getTop(pkm.Spreads);

            // Initialize Roles
            const roles: Record<string, number> = { "goodstuff": 1.0 };

            // Apply Move & Ability Triggers
            topMoves.forEach(move => { if (ROLE_TRIGGERS[move]) roles[ROLE_TRIGGERS[move]] = 1.0; });
            if (ABILITY_TRIGGERS[topAbility]) {
                ABILITY_TRIGGERS[topAbility].forEach(role => { roles[role] = 1.0; });
            }
            // Apply Item Triggers
            if (ITEM_TRIGGERS[topItem]) {
                ITEM_TRIGGERS[topItem].forEach(role => { roles[role] = 1.0; });
            }

            // Parse EVs and Apply Stat Heuristics
            let nature = "Hardy";
            let evString = "0 HP / 0 Atk / 0 Def / 0 SpA / 0 SpD / 0 Spe";

            if (topSpreadRaw && topSpreadRaw.includes(":")) {
                const [parsedNature, evsRaw] = topSpreadRaw.split(":");
                nature = parsedNature;

                // Array of EV numbers [HP, Atk, Def, SpA, SpD, Spe]
                const evsArr = evsRaw.split("/").map(Number);
                const [hp, atk, def, spa, spd, spe] = evsArr;

                // 4️⃣ EV INVESTMENT HEURISTICS
                if (spe >= 236) {
                    if (spa >= 236) roles["special_sweeper"] = 1.0;
                    if (atk >= 236) roles["physical_sweeper"] = 1.0;
                }
                if (spe < 200 && (spa >= 236 || atk >= 236)) {
                    roles["wallbreaker"] = 1.0;
                }
                if (["Relaxed", "Sassy", "Quiet", "Brave"].includes(nature) && spe <= 4) {
                    roles["late_game_cleaner"] = 1.0; // Acts as TR closing power
                }
                if ((hp >= 236 && def >= 150) || (hp >= 236 && spd >= 150)) {
                    roles["support"] = 1.0; // Bulky training
                }

                // Construct clean EV string
                const stats = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
                const evsCleaned = evsArr
                    .map((val, idx) => val > 0 ? `${val} ${stats[idx]}` : null)
                    .filter(Boolean)
                    .join(" / ");

                evString = evsCleaned || evString;
            }

            // Determine restricted status
            const isRestricted = ["Calyrex-Shadow", "Calyrex-Ice", "Miraidon", "Koraidon", "Terapagos", "Zacian-Crowned", "Kyogre", "Groudon", "Rayquaza"].includes(name);

            // Construct the final object
            updatedDataset.push({
                name: name,
                roles: roles,
                archetypes: ["goodstuff"],
                restricted_legendary: isRestricted || undefined,
                builds: {
                    "goodstuff": {
                        ability: topAbility,
                        item: topItem,
                        nature: nature,
                        evs: evString,
                        moves: topMoves,
                        teraType: getTop(pkm.TeraTypes) || "Normal"
                    }
                }
            });
        }

        // Save to src/data/pokemon.json using process.cwd()
        const outputPath = path.join(process.cwd(), 'src', 'data', 'pokemon.json');
        fs.writeFileSync(outputPath, JSON.stringify(updatedDataset, null, 2));

        console.log(`✅ Successfully updated ${outputPath} with ${topPokemonNames.length} tournament staples!`);

    } catch (error) {
        console.error("❌ Failed to fetch or parse Smogon data:", error);
    }
}

fetchAndParseShowdownData();