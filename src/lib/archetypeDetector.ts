// src/lib/archetypeDetector.ts
import { pokemonMap } from "./teamEvaluator";
import archetypesData from "../data/archetype.json";

type ArchetypeDef = {
    required: string[];
    preferred: string[];
};

type ArchetypeScore = {
    archetype: string;
    score: number;
};

// Map your JSON file to the structural definition
const typedArchetypesData: Record<string, ArchetypeDef> = archetypesData as Record<string, ArchetypeDef>;

/**
 * Scans a team string array and accumulates total role weights.
 */
function getRoleScores(team: string[]): Record<string, number> {
    const roleScores: Record<string, number> = {};

    for (const pokemonName of team) {
        // 🌟 UPDATE: Utilizing the centralized map from teamEvaluator
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

    // Sort highest scoring archetypes to prioritize them in the beam search
    return scores.sort((a, b) => b.score - a.score);
}