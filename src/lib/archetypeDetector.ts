// src/lib/archetypeDetector.ts
import { pokemonMap } from "./teamEvaluator";
import archetypesData from "../data/archetype.json";

export type ArchetypeDef = {
    required: string[];
    preferred: string[];
};

export type ArchetypeScore = {
    archetype: string;
    score: number;
};

// 🧠 Bulletproof VGC Meta Blueprints
const VGC_META_BLUEPRINTS: Record<string, ArchetypeDef> = {
    "Rain": { required: ["rain_setter"], preferred: ["rain_abuser", "tailwind_setter", "redirector", "intimidate"] },
    "Sun": { required: ["sun_setter"], preferred: ["sun_abuser", "trick_room_setter", "fast_sweeper"] },
    "Sand": { required: ["sand_setter"], preferred: ["sand_abuser", "redirector"] },
    "Snow": { required: ["snow_setter"], preferred: ["snow_abuser", "aurora_veil"] },
    "Trick Room": { required: ["trick_room_setter"], preferred: ["trick_room_abuser", "fake_out", "redirector"] },
    "Tailwind Offense": { required: ["tailwind_setter"], preferred: ["fast_sweeper", "fake_out", "intimidate", "terrain_setter"] },
    "Goodstuff Balance": { required: [], preferred: ["fake_out", "intimidate", "redirector", "speed_control"] }
};

// Exported so teamOptimizer can dynamically analyze blueprint requirements mid-search
export const typedArchetypesData: Record<string, ArchetypeDef> = { 
    ...VGC_META_BLUEPRINTS,
    ...(archetypesData as Record<string, ArchetypeDef> || {})
};

/**
 * Scans a team string array and accumulates total role weights.
 */
function getRoleScores(team: string[]): Record<string, number> {
    const roleScores: Record<string, number> = {};

    for (const pokemonName of team) {
        const pokemon = pokemonMap[pokemonName.toLowerCase()];
        if (!pokemon || !pokemon.roles) continue;

        for (const [role, weight] of Object.entries(pokemon.roles)) {
            if (weight !== undefined) {
                roleScores[role] = (roleScores[role] || 0) + weight;
            }
        }
    }
    return roleScores;
}

/**
 * Scores a specific archetype based on the presence of required and preferred roles.
 */
function scoreArchetype(roleScores: Record<string, number>, archetypeDef: ArchetypeDef): number {
    let score = 0;

    // If a required role is entirely missing, this archetype fails to qualify
    for (const role of archetypeDef.required) {
        if (!roleScores[role] || roleScores[role] <= 0) {
            return 0;
        }
        // Required roles carry heavier synergy weight
        score += roleScores[role] * 2;
    }

    // Preferred roles add bonuses but are not strictly mandatory
    for (const role of archetypeDef.preferred) {
        if (roleScores[role]) {
            score += roleScores[role];
        }
    }

    // Ensure baseline archetypes (like Goodstuff) still pass even if score is 0
    if (archetypeDef.required.length === 0 && score === 0) {
        return 1; 
    }

    return score;
}

/**
 * Evaluates the given sandbox pool and returns an array of viable archetypes sorted by score.
 */
export function detectArchetypes(box: string[]): ArchetypeScore[] {
    const roleScores = getRoleScores(box);
    const scores: ArchetypeScore[] = [];

    for (const [archetypeName, archetypeDef] of Object.entries(typedArchetypesData)) {
        const score = scoreArchetype(roleScores, archetypeDef);
        if (score > 0) {
            scores.push({ archetype: archetypeName, score });
        }
    }

    return scores.sort((a, b) => b.score - a.score);
}