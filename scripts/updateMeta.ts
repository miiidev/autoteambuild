import fs from 'fs';
import path from 'path';

const API_BASE = "https://championsbattledata.com";
const FORMAT = "Doubles";

// Helper to grab ALL usage rows and preserve their percentages
const getUsageStats = (rows: any[], category: string) => {
    return rows
        .filter((r) => r.category === category && parseFloat(r.percentage) > 0)
        .sort((a, b) => a.rank - b.rank) // Rank 1 is highest usage
        .map((r) => ({
            name: r.name,
            usage: r.percentage
        }));
};

async function fetchUltimateChampionsData() {
    const outputPath = path.join(process.cwd(), 'src', 'data', 'pokemon.json');
    const updatedDataset: any[] = [];
    let successCount = 0;
    let stubCount = 0;

    console.log(`📡 Fetching the global API index...`);

    try {
        const indexRes = await fetch(`${API_BASE}/api`);
        if (!indexRes.ok) throw new Error("Failed to fetch API index.");
        
        const indexData = await indexRes.json();
        const season = indexData.defaultSeason;
        const fullRoster = indexData.pokemon;

        console.log(`✅ Index Loaded! Commencing ULTIMATE extraction for ${fullRoster.length} Pokémon...`);

        for (const entry of fullRoster) {
            const savedName = entry.name;
            // The API uses the first word as a base_name fallback, but entry may provide it
            const baseName = savedName.split(' ')[0].toLowerCase(); 
            const types = entry.summary?.types || ["Normal"];
            const baseStats = entry.summary?.baseStats || {};

            let metadataForms = [];
            let battleDataPayload = null;

            // 1️⃣ Fetch Metadata (Forms & Base Stats context)
            try {
                const metaRes = await fetch(`${API_BASE}/api/metadata/${encodeURIComponent(baseName)}`);
                if (metaRes.ok) {
                    const metaData = await metaRes.json();
                    metadataForms = metaData.rows?.map((r: any) => ({
                        formName: r.saved_name,
                        types: r.types,
                        abilities: r.abilities.split('|'),
                        stats: { hp: r.hp, atk: r.atk, def: r.def, spa: r.spa, spd: r.spd, spe: r.spe }
                    })) || [];
                }
            } catch (err) {
                console.warn(`⚠️ Could not fetch metadata for ${baseName}`);
            }

            // 2️⃣ Fetch Battle Data (Usage Stats, Teammates, etc.)
            try {
                const battleRes = await fetch(`${API_BASE}/api/battle/${FORMAT}/${encodeURIComponent(savedName)}?season=${encodeURIComponent(season)}`);
                if (battleRes.ok) {
                    const battleJson = await battleRes.json();
                    const rows = battleJson.rows || [];
                    
                    if (rows.length > 0) {
                        battleDataPayload = {
                            moves: getUsageStats(rows, "move"),
                            abilities: getUsageStats(rows, "ability"),
                            items: getUsageStats(rows, "item"),
                            natures: getUsageStats(rows, "nature"),
                            evs: getUsageStats(rows, "spread"),
                            teraTypes: getUsageStats(rows, "tera"),
                            teammates: getUsageStats(rows, "teammate") // Grabs the synergy data!
                        };
                    }
                }
            } catch (err) {
                // Fails silently to drop down to the stub injector
            }

            // 3️⃣ Compile the God Object
            if (battleDataPayload) {
                updatedDataset.push({
                    name: savedName,
                    types: types,
                    baseStats: baseStats,
                    availableForms: metadataForms,
                    usageData: battleDataPayload,
                    // Keep a simple "goodstuff" build so your teamOptimizer.ts doesn't crash
                    builds: {
                        "goodstuff": {
                            ability: battleDataPayload.abilities[0]?.name || "Standard", 
                            item: battleDataPayload.items[0]?.name || "Leftovers", 
                            nature: battleDataPayload.natures[0]?.name || "Hardy",
                            evs: battleDataPayload.evs[0]?.name || "0 HP / 0 Atk / 0 Def / 0 SpA / 0 SpD / 0 Spe", 
                            moves: battleDataPayload.moves.slice(0, 4).map(m => m.name), 
                            teraType: battleDataPayload.teraTypes[0]?.name || "Normal"
                        }
                    }
                });
                successCount++;
            } else {
                // 🛑 INJECT A STUB: No ladder data exists, but we need it for the UI Grid!
                updatedDataset.push({
                    name: savedName,
                    types: types,
                    baseStats: baseStats,
                    availableForms: metadataForms,
                    usageData: null,
                    builds: {} 
                });
                stubCount++;
            }

            // 150ms delay to prevent rate limits
            await new Promise(resolve => setTimeout(resolve, 150)); 
        }

        updatedDataset.sort((a, b) => a.name.localeCompare(b.name));
        fs.writeFileSync(outputPath, JSON.stringify(updatedDataset, null, 2));
        
        console.log(`\n🎉 ULTIMATE EXTRACTION COMPLETE!`);
        console.log(`✅ Pokémon with Deep Data (Teammates, Teras, Percentages): ${successCount}`);
        console.log(`🛡️ 0% Usage Stubs injected: ${stubCount}`);
        
    } catch (error) {
        console.error("❌ Fatal Error during extraction:", error);
    }
}

fetchUltimateChampionsData();