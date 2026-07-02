// src/lib/optimizer/roleInjection.ts
//
// Prepares each candidate Pokémon before the beam search runs: ensures it
// has a usable build (generating a fallback one if needed), then infers
// extra team-building roles (weather setter/abuser, speed control, etc.)
// directly from its abilities/moves so the archetype detector has enough
// signal to work with, even for Pokémon without hand-authored role data.

import type { PokemonWithRawData } from "./teamEvaluator";
import type { LiveGameData } from "./pokeApi";
import { generateDynamicFallbackBuild } from "./buildGenerator";

const FAST_SPEED_THRESHOLD = 110;
const SLOW_SPEED_THRESHOLD = 50;

const PLACEHOLDER_ITEMS = new Set(["leftovers", "unknown item"]);

function hasOnlyPlaceholderBuild(pData: PokemonWithRawData): boolean {
    const buildKeys = Object.keys(pData.builds);
    if (buildKeys.length === 0) return true;
    const firstItem = pData.builds[buildKeys[0]].item?.toLowerCase();
    return PLACEHOLDER_ITEMS.has(firstItem || "");
}

/** Ensures the Pokémon has a real (non-placeholder) build, generating one if needed. */
function ensureUsableBuild(pData: PokemonWithRawData, liveData: LiveGameData | null): void {
    if (hasOnlyPlaceholderBuild(pData)) {
        pData.builds = { goodstuff: generateDynamicFallbackBuild(liveData, pData) };
    }

    if (pData.requires_item) {
        for (const key in pData.builds) {
            pData.builds[key].item = pData.requires_item;
        }
    }
}

function collectKnownMoves(pData: PokemonWithRawData, activeBuild: ReturnType<typeof Object.values>[0] | undefined): Set<string> {
    const allMoves = new Set<string>();

    if (activeBuild && "moves" in (activeBuild as any)) {
        (activeBuild as any).moves.forEach((m: string) => {
            if (typeof m === "string") allMoves.add(m.toLowerCase());
        });
    }

    const usageMoves = pData.usageData?.moves;
    if (usageMoves) {
        if (Array.isArray(usageMoves)) {
            usageMoves.forEach((m: any) => {
                const moveStr = typeof m === "string" ? m : m?.name;
                if (typeof moveStr === "string" && moveStr) allMoves.add(moveStr.toLowerCase());
            });
        } else {
            Object.keys(usageMoves).forEach((m) => {
                if (typeof m === "string") allMoves.add(m.toLowerCase());
            });
        }
    }

    return allMoves;
}

/** Infers extra roles (weather, speed control, priority, etc.) from live data and known moves. */
function injectRolesFromLiveData(pData: PokemonWithRawData, liveData: LiveGameData): void {
    if (!pData.roles) pData.roles = {};

    const activeBuild = Object.values(pData.builds)[0];
    const allAbilities = liveData.abilities.map((a) => (typeof a === "string" ? a.toLowerCase() : ""));
    const allMoves = collectKnownMoves(pData, activeBuild);
    const speedStat = liveData.stats.find((s) => s.name === "speed")?.base_stat || 100;

    if (allAbilities.includes("drizzle")) pData.roles["rain_setter"] = 1;
    if (allAbilities.includes("drought")) pData.roles["sun_setter"] = 1;
    if (allAbilities.includes("snow warning")) pData.roles["snow_setter"] = 1;
    if (allAbilities.includes("sand stream")) pData.roles["sand_setter"] = 1;

    if (allMoves.has("trick room")) pData.roles["trick_room_setter"] = 1;
    if (allMoves.has("tailwind")) pData.roles["tailwind_setter"] = 1;
    if (allMoves.has("fake out")) pData.roles["fake_out"] = 1;
    if (allMoves.has("follow me") || allMoves.has("rage powder")) pData.roles["redirector"] = 1;
    if (allAbilities.includes("intimidate")) pData.roles["intimidate"] = 1;

    if (allAbilities.includes("swift swim")) pData.roles["rain_abuser"] = 1;
    if (allAbilities.includes("chlorophyll")) pData.roles["sun_abuser"] = 1;
    if (speedStat <= SLOW_SPEED_THRESHOLD) pData.roles["trick_room_abuser"] = 1;
    if (speedStat >= FAST_SPEED_THRESHOLD) pData.roles["fast_sweeper"] = 1;
}

/**
 * Mutates `pData` in place: guarantees it has a usable build, and layers on
 * inferred meta roles from its live ability/move/stat data (when available).
 */
export function prepareCandidate(pData: PokemonWithRawData, liveData: LiveGameData | null): void {
    ensureUsableBuild(pData, liveData);
    if (liveData) {
        injectRolesFromLiveData(pData, liveData);
    }
}