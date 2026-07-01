import fs from 'fs';
import path from 'path';

const API_BASE = "https://championsbattledata.com";
const FORMAT = "Doubles";

type BattleRow = {
    category?: string;
    rank?: number;
    name?: string;
    percentage?: string;
    percentage_value?: number | null;
    stat_up?: string;
    stat_down?: string;
    hp_points?: number | string;
    attack_points?: number | string;
    defense_points?: number | string;
    sp_atk_points?: number | string;
    sp_def_points?: number | string;
    speed_points?: number | string;
};

const CATEGORY_ALIASES: Record<string, string[]> = {
    move: ["move"],
    ability: ["ability"],
    item: ["item", "held_item"],
    nature: ["nature", "stat_alignment"],
    spread: ["spread", "stat_points", "ev", "ev_spread"],
    tera: ["tera", "tera_type", "teratype", "tera type"],
    teammate: ["teammate", "partner", "ally"]
};

const normalizeCategory = (value: unknown): string => {
    return typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
};

const parsePercentageValue = (row: BattleRow): number => {
    if (typeof row.percentage_value === "number" && Number.isFinite(row.percentage_value)) {
        return row.percentage_value;
    }
    const parsed = Number(String(row.percentage || "").replace(/%/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatEvSpread = (row: BattleRow): string => {
    const toNum = (v: number | string | undefined): number => {
        if (typeof v === "number") return Number.isFinite(v) ? v : 0;
        const parsed = Number(String(v ?? "").trim());
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const hp = toNum(row.hp_points);
    const atk = toNum(row.attack_points);
    const def = toNum(row.defense_points);
    const spa = toNum(row.sp_atk_points);
    const spd = toNum(row.sp_def_points);
    const spe = toNum(row.speed_points);

    const parts: string[] = [];
    if (hp > 0) parts.push(`${hp} HP`);
    if (atk > 0) parts.push(`${atk} Atk`);
    if (def > 0) parts.push(`${def} Def`);
    if (spa > 0) parts.push(`${spa} SpA`);
    if (spd > 0) parts.push(`${spd} SpD`);
    if (spe > 0) parts.push(`${spe} Spe`);

    return parts.length > 0 ? parts.join(" / ") : "0 HP / 0 Atk / 0 Def / 0 SpA / 0 SpD / 0 Spe";
};

// Helper to grab ALL usage rows and preserve their percentages
const getUsageStats = (rows: BattleRow[], category: string) => {
    const aliases = new Set((CATEGORY_ALIASES[category] || [category]).map(normalizeCategory));

    return rows
        .filter((r) => {
            const cat = normalizeCategory(r.category);
            if (!aliases.has(cat)) return false;

            // Teammates often have blank percentages in this API, keep by rank/name.
            if (category === "teammate") {
                return Boolean(r.name && String(r.name).trim());
            }

            return parsePercentageValue(r) > 0;
        })
        .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
        .map((r) => ({
            name: (r.name || "").trim(),
            usage: r.percentage && String(r.percentage).trim().length > 0 ? r.percentage : `${parsePercentageValue(r).toFixed(1)}%`
        }));
};

const getSpreadStats = (rows: BattleRow[]) => {
    const aliases = new Set((CATEGORY_ALIASES.spread || ["spread"]).map(normalizeCategory));

    return rows
        .filter((r) => aliases.has(normalizeCategory(r.category)) && parsePercentageValue(r) > 0)
        .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
        .map((r) => ({
            name: formatEvSpread(r),
            usage: r.percentage && String(r.percentage).trim().length > 0 ? r.percentage : `${parsePercentageValue(r).toFixed(1)}%`
        }));
};

const hasMeaningfulUsageData = (payload: {
    moves: { name: string; usage: string }[];
    abilities: { name: string; usage: string }[];
    items: { name: string; usage: string }[];
    natures: { name: string; usage: string }[];
    evs: { name: string; usage: string }[];
    teraTypes: { name: string; usage: string }[];
    teammates: { name: string; usage: string }[];
}) => {
    return payload.moves.length > 0
        || payload.abilities.length > 0
        || payload.items.length > 0
        || payload.natures.length > 0
        || payload.evs.length > 0
        || payload.teraTypes.length > 0
        || payload.teammates.length > 0;
};

const toBaseStats = (summaryBaseStats: any = {}) => {
    return {
        hp: summaryBaseStats.hp ?? 0,
        attack: summaryBaseStats.attack ?? summaryBaseStats.atk ?? 0,
        defense: summaryBaseStats.defense ?? summaryBaseStats.def ?? 0,
        sp_attack: summaryBaseStats.sp_attack ?? summaryBaseStats.spa ?? 0,
        sp_defense: summaryBaseStats.sp_defense ?? summaryBaseStats.spd ?? 0,
        speed: summaryBaseStats.speed ?? summaryBaseStats.spe ?? 0
    };
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
            const battleName = entry.battleName || savedName;
            const baseName = (entry.slug || savedName).toLowerCase();
            const types = entry.summary?.types || ["Normal"];
            const baseStats = toBaseStats(entry.summary?.baseStats || {});

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
                        abilities: String(r.abilities || "").split('|').filter(Boolean),
                        stats: { hp: r.hp, atk: r.atk, def: r.def, spa: r.spa, spd: r.spd, spe: r.spe }
                    })) || [];
                }
            } catch (err) {
                console.warn(`⚠️ Could not fetch metadata for ${baseName}`);
            }

            // 2️⃣ Fetch Battle Data (Usage Stats, Teammates, etc.)
            try {
                const battleRes = await fetch(`${API_BASE}/api/battle/${FORMAT}/${encodeURIComponent(battleName)}?season=${encodeURIComponent(season)}`);
                if (battleRes.ok) {
                    const battleJson = await battleRes.json();
                    const rows: BattleRow[] = Array.isArray(battleJson.rows) ? battleJson.rows : [];

                    const usagePayload = {
                        moves: getUsageStats(rows, "move"),
                        abilities: getUsageStats(rows, "ability"),
                        items: getUsageStats(rows, "item"),
                        natures: getUsageStats(rows, "nature"),
                        evs: getSpreadStats(rows),
                        teraTypes: getUsageStats(rows, "tera"),
                        teammates: getUsageStats(rows, "teammate")
                    };

                    if (hasMeaningfulUsageData(usagePayload)) {
                        battleDataPayload = usagePayload;
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