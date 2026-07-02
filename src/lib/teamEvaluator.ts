// src/lib/teamEvaluator.ts
//
// Builds the in-memory Pokémon lookup table (`pokemonMap`) from the local
// dataset and provides a lightweight structural evaluation of a drafted
// team (type diversity + type-stacking penalties).

import pokemonData from "../data/pokemon.json";

export type PokemonBuild = {
  ability: string;
  item: string;
  nature: string;
  evs: string;
  moves: string[];
};

export type UsageEntry = { name: string; usage: string };

export type Pokemon = {
  name: string;
  types: string[];
  archetypes: string[];
  roles: Record<string, number>;
  builds: Record<string, PokemonBuild>;
  requires_item?: string;
  usageData?: {
    moves: UsageEntry[];
    items: UsageEntry[];
    abilities: UsageEntry[];
  };
};

// Extra fields carried over from the raw dataset that the optimizer/pokeApi
// layers need but that aren't part of the "evaluation" concept of a Pokemon.
export type PokemonWithRawData = Pokemon & {
  baseStats?: any;
  availableForms?: any;
};

const DEFAULT_TYPES = ["Normal"];
const DEFAULT_ROLES: Record<string, number> = { goodstuff: 1 };
const DEFAULT_ARCHETYPES = ["goodstuff"];

function toPokemonEntry(raw: any): PokemonWithRawData {
  return {
    name: raw.name,
    types: raw.types || DEFAULT_TYPES,
    roles: raw.roles || { ...DEFAULT_ROLES },
    archetypes: raw.archetypes || [...DEFAULT_ARCHETYPES],
    builds: raw.builds || {},
    usageData: raw.usageData,
    requires_item: raw.requires_item,
    // Kept as-is so downstream consumers (pokeApi) can read stats/forms
    // straight off the dataset without a second lookup.
    baseStats: raw.baseStats,
    availableForms: raw.availableForms,
  };
}

/** Case-insensitive (lowercased name) lookup table for every known Pokémon. */
export const pokemonMap: Record<string, PokemonWithRawData> = Object.fromEntries(
  (pokemonData as any[]).map((raw) => [raw.name.toLowerCase(), toPokemonEntry(raw)])
);

export type TeamEvaluation = {
  score: number;
  uniqueTypes: string[];
  breakdown: string[];
};

const BASE_SCORE = 100;
const POINTS_PER_UNIQUE_TYPE = 10;
const TYPE_STACK_THRESHOLD = 3;
const TYPE_STACK_PENALTY = 150;

/**
 * Structural macro evaluation focusing purely on stat checks and defensive
 * type coverage. Rewards type diversity, penalizes stacking 3+ Pokémon of
 * the same type.
 */
export function evaluateTeam(team: string[]): TeamEvaluation {
  const uniqueTypes = new Set<string>();
  const typeCounts: Record<string, number> = {};
  const breakdown: string[] = [`Base Score: ${BASE_SCORE}`];

  for (const name of team) {
    const pData = pokemonMap[name.toLowerCase()];
    if (!pData) continue;

    for (const type of pData.types) {
      const lowerType = type.toLowerCase();
      uniqueTypes.add(lowerType);
      typeCounts[lowerType] = (typeCounts[lowerType] || 0) + 1;
    }
  }

  let score = BASE_SCORE;

  const typeBonus = uniqueTypes.size * POINTS_PER_UNIQUE_TYPE;
  score += typeBonus;
  breakdown.push(`+${typeBonus} Synergy: Diverse Type Coverage (${uniqueTypes.size} types)`);

  for (const [type, count] of Object.entries(typeCounts)) {
    if (count >= TYPE_STACK_THRESHOLD) {
      score -= TYPE_STACK_PENALTY;
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      breakdown.push(`-${TYPE_STACK_PENALTY} Penalty: Excessive ${label}-Type Stacking (${count})`);
    }
  }

  return { score, uniqueTypes: Array.from(uniqueTypes), breakdown };
}