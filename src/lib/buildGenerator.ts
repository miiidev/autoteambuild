// src/lib/optimizer/buildGenerator.ts
//
// Produces a reasonable competitive build (ability/item/nature/EVs/moves)
// for a Pokémon that doesn't have a usable pre-authored build, using usage
// stats where available and falling back to stat-driven heuristics.

import type { Pokemon, PokemonBuild } from "./teamEvaluator";
import type { LiveGameData } from "./pokeApi";
import { isRegulationLegalItem, pickFirstLegalItem } from "./items";

const DEFAULT_MOVES = ["Protect", "Substitute", "Toxic", "Helping Hand"];
const MAX_MOVES = 4;

function buildDefaultShell(liveData: LiveGameData | null, pData?: Pokemon | null): PokemonBuild {
    return {
        ability: liveData?.abilities?.[0] || "Unknown Ability",
        item: pickFirstLegalItem(["Leftovers", "Sitrus Berry", "Life Orb"], pData),
        nature: "Hardy",
        evs: "252 HP / 4 Def / 252 Spe",
        moves: [...DEFAULT_MOVES],
    };
}

/** Applies usage-stat item/ability/moves onto the build, in place. Reports what it filled in. */
function applyUsageData(build: PokemonBuild, pData?: Pokemon | null): { appliedItem: boolean; appliedMoves: boolean } {
    let appliedItem = false;
    let appliedMoves = false;

    if (!pData?.usageData) return { appliedItem, appliedMoves };

    const { moves, items, abilities } = pData.usageData;

    if (Array.isArray(items) && items.length > 0) {
        const itemName = typeof items[0] === "string" ? items[0] : items[0]?.name;
        if (typeof itemName === "string" && isRegulationLegalItem(itemName, pData)) {
            build.item = itemName;
            appliedItem = true;
        }
    } else if (items && typeof items === "object" && Object.keys(items).length > 0) {
        const sortedItems = Object.entries(items).sort((a, b) => Number(b[1]) - Number(a[1]));
        const firstLegalItem = sortedItems.find(([name]) => isRegulationLegalItem(name, pData));
        if (firstLegalItem) {
            build.item = firstLegalItem[0];
            appliedItem = true;
        }
    }

    if (Array.isArray(abilities) && abilities.length > 0) {
        const abilityName = typeof abilities[0] === "string" ? abilities[0] : abilities[0]?.name;
        if (typeof abilityName === "string") build.ability = abilityName;
    } else if (abilities && typeof abilities === "object" && Object.keys(abilities).length > 0) {
        const sortedAbilities = Object.entries(abilities).sort((a, b) => Number(b[1]) - Number(a[1]));
        if (sortedAbilities.length > 0) build.ability = sortedAbilities[0][0];
    }

    let parsedMoves: string[] = [];
    if (Array.isArray(moves) && moves.length > 0) {
        parsedMoves = moves.slice(0, MAX_MOVES).map((m: any) => {
            const mName = typeof m === "string" ? m : m?.name;
            return typeof mName === "string" ? mName : "Protect";
        });
    } else if (moves && typeof moves === "object" && Object.keys(moves).length > 0) {
        const sortedMoves = Object.entries(moves).sort((a, b) => Number(b[1]) - Number(a[1]));
        parsedMoves = sortedMoves.slice(0, MAX_MOVES).map((m) => m[0]);
    }

    if (parsedMoves.length > 0) {
        build.moves = parsedMoves;
        appliedMoves = true;
    }

    return { appliedItem, appliedMoves };
}

/** Applies stat-driven heuristics (nature/EVs/item/moves) when usage data didn't cover it. */
function applyStatHeuristics(
    build: PokemonBuild,
    liveData: LiveGameData | null,
    pData: Pokemon | null | undefined,
    appliedItem: boolean,
    appliedMoves: boolean
): void {
    if (appliedItem || !liveData?.stats) return;

    const statsMap = Object.fromEntries(liveData.stats.map((s) => [s.name, s.base_stat]));
    const atk = statsMap["attack"] || 0;
    const spa = statsMap["special-attack"] || 0;
    const spe = statsMap["speed"] || 0;

    if (liveData.abilities.includes("intimidate")) build.ability = "intimidate";
    else if (liveData.abilities.includes("prankster")) build.ability = "prankster";

    if (atk > spa && atk > 90) {
        build.nature = spe > 90 ? "Jolly" : "Adamant";
        build.evs = "4 HP / 252 Atk / 252 Spe";
        build.item = pickFirstLegalItem(["Life Orb", "Clear Amulet", "Focus Sash"], pData);
        if (!appliedMoves) build.moves = ["Protect", "Close Combat", "Iron Head", "Facade"];
    } else if (spa > atk && spa > 90) {
        build.nature = spe > 90 ? "Timid" : "Modest";
        build.evs = "4 HP / 252 SpA / 252 Spe";
        build.item = pickFirstLegalItem(["Choice Specs", "Life Orb", "Focus Sash"], pData);
        if (!appliedMoves) build.moves = ["Hyper Voice", "Thunderbolt", "Earth Power", "Shadow Ball"];
    } else {
        build.nature = "Bold";
        build.evs = "252 HP / 128 Def / 128 SpD";
        build.item = pickFirstLegalItem(["Sitrus Berry", "Leftovers", "Assault Vest"], pData);
    }
}

/**
 * Generates a dynamic fallback build for a Pokémon with no usable
 * pre-authored set: usage data first, stat-driven heuristics second.
 */
export function generateDynamicFallbackBuild(liveData: LiveGameData | null, pData?: Pokemon | null): PokemonBuild {
    const build = buildDefaultShell(liveData, pData);

    const { appliedItem, appliedMoves } = applyUsageData(build, pData);
    applyStatHeuristics(build, liveData, pData, appliedItem, appliedMoves);

    build.moves = Array.from(new Set(build.moves)).slice(0, MAX_MOVES);
    while (build.moves.length < MAX_MOVES) build.moves.push("Protect");
    if (pData?.requires_item) build.item = pData.requires_item;

    return build;
}