// src/lib/archetypeDetector.ts
import pokemonData from "../data/pokemon.json";
import archetypesData from "../data/archetype.json";

export interface Pokemon {
    name: string;
    types?: string[]; // Optional property to let PokeAPI inject types dynamically
    roles: Partial<Record<string, number>>;
    archetypes: string[];
}

type Archetype = {
    required: string[];
    preferred: string[];
};

type ArchetypeScore = {
    archetype: string;
    score: number;
};

// Use explicit unknown casting step to decouple rigid structural JSON validation constraints
const pokemonMap: Record<string, Pokemon> = Object.fromEntries(
    (pokemonData as unknown as Pokemon[]).map((p) => [p.name.toLowerCase(), p])
);

function getRoleScores(team: string[]): Record<string, number> {
    const roleScores: Record<string, number> = {};
    for (const pokemonName of team) {
        const pokemon = pokemonMap[pokemonName.toLowerCase()];
        if (!pokemon) continue;
        for (const [role, weight] of Object.entries(pokemon.roles)) {
            if (weight !== undefined) {
                roleScores[role] = (roleScores[role] || 0) + weight;
            }
        }
    }
    return roleScores;
}

function scoreArchetype(roleScores: Record<string, number>, archetype: Archetype): number {
    let score = 0;
    for (const role of archetype.required) {
        if (!roleScores[role] || roleScores[role] <= 0) {
            return 0; 
        }
        score += roleScores[role] * 2;
    }
    for (const role of archetype.preferred) {
        if (roleScores[role]) {
            score += roleScores[role];
        }
    }
    return score;
}

export function detectArchetypes(box: string[]): ArchetypeScore[] {
    const roleScores = getRoleScores(box);
    const scores: ArchetypeScore[] = [];

    for (const [archetypeName, archetypeDetails] of Object.entries(archetypesData as Record<string, Archetype>)) {
        const score = scoreArchetype(roleScores, archetypeDetails);
        scores.push({ archetype: archetypeName, score });
    }

    return scores.sort((a, b) => b.score - a.score);
}