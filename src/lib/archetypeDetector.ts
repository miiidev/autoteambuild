// src/lib/archetypeDetector.ts
//
// Scores every known archetype "blueprint" against a candidate box of
// Pokémon, based on which team-building roles are available.

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

// Built-in blueprints, kept independently of the data file below. Note these
// use a different (Title Case) key + role-naming convention than
// archetype.json, so the two sets do not overwrite each other when merged —
// both are evaluated as distinct archetypes.
const VGC_META_BLUEPRINTS: Record<string, ArchetypeDef> = {
    Rain: { required: ["rain_setter"], preferred: ["rain_abuser", "tailwind_setter", "redirector", "intimidate"] },
    Sun: { required: ["sun_setter"], preferred: ["sun_abuser", "trick_room_setter", "fast_sweeper"] },
    Sand: { required: ["sand_setter"], preferred: ["sand_abuser", "redirector"] },
    Snow: { required: ["snow_setter"], preferred: ["snow_abuser", "aurora_veil"] },
    "Trick Room": { required: ["trick_room_setter"], preferred: ["trick_room_abuser", "fake_out", "redirector"] },
    "Tailwind Offense": { required: ["tailwind_setter"], preferred: ["fast_sweeper", "fake_out", "intimidate", "terrain_setter"] },
    "Goodstuff Balance": { required: [], preferred: ["fake_out", "intimidate", "redirector", "speed_control"] },
};

// Exported so teamOptimizer can dynamically inspect blueprint requirements
// mid-search. Data-driven archetypes (archetype.json) are merged on top of
// the built-ins.
export const typedArchetypesData: Record<string, ArchetypeDef> = {
    ...VGC_META_BLUEPRINTS,
    ...((archetypesData as Record<string, ArchetypeDef>) || {}),
};

const REQUIRED_ROLE_WEIGHT = 2;

/** Accumulates total role weights present across a team. */
function getRoleScores(team: string[]): Record<string, number> {
    const roleScores: Record<string, number> = {};

    for (const pokemonName of team) {
        const pokemon = pokemonMap[pokemonName.toLowerCase()];
        if (!pokemon?.roles) continue;

        for (const [role, weight] of Object.entries(pokemon.roles)) {
            if (weight !== undefined) {
                roleScores[role] = (roleScores[role] || 0) + weight;
            }
        }
    }

    return roleScores;
}

/** Scores one archetype based on required/preferred role coverage. */
function scoreArchetype(roleScores: Record<string, number>, archetypeDef: ArchetypeDef): number {
    let score = 0;

    // Any missing required role disqualifies the archetype entirely.
    for (const role of archetypeDef.required) {
        if (!roleScores[role] || roleScores[role] <= 0) {
            return 0;
        }
        score += roleScores[role] * REQUIRED_ROLE_WEIGHT;
    }

    for (const role of archetypeDef.preferred) {
        if (roleScores[role]) {
            score += roleScores[role];
        }
    }

    // Archetypes with no required roles (e.g. Goodstuff) should still
    // register as viable even with a zero preferred-role score.
    if (archetypeDef.required.length === 0 && score === 0) {
        return 1;
    }

    return score;
}

/** Evaluates a candidate box and returns viable archetypes, best first. */
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