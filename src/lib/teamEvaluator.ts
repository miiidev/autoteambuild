// src/lib/teamEvaluator.ts
import pokemonData from "../data/pokemon.json";

export type PokemonBuild = {
  ability: string;
  item: string;
  nature: string;
  evs: string;
  moves: string[];
  teraType: string;
};

export type Pokemon = {
  name: string;
  types: string[];
  archetypes: string[];
  roles: Record<string, number>;
  builds: Record<string, PokemonBuild>;
  requires_item?: string;
};

// 🌟 UPDATE: Unified Single Source of Truth
// Hydrate the baseline competitive map dynamically from your local JSON database
export const pokemonMap: Record<string, Pokemon> = Object.fromEntries(
  (pokemonData as any[]).map((p) => {
    return [
      p.name.toLowerCase(),
      {
        name: p.name,
        types: p.types || ["Normal"],
        roles: p.roles || { goodstuff: 1 },        // Safe fallback
        archetypes: p.archetypes || ["goodstuff"], // Safe fallback
        builds: p.builds || {}                     // Empty object fallback for optimizer injection
      }
    ];
  })
);

/**
 * Structural macro evaluation focusing purely on stat checks and defensive type coverage.
 * (Micro-synergy like weather and Trick Room is handled by teamOptimizer.ts)
 */
export function evaluateTeam(team: string[]) {
  let score = 100; // Starting baseline evaluation score
  const uniqueTypes = new Set<string>();

  for (const name of team) {
    const pData = pokemonMap[name.toLowerCase()];
    if (!pData) continue;

    // Collect all unique typings present on this core combination
    pData.types.forEach(t => uniqueTypes.add(t.toLowerCase()));
  }

  // Reward diverse typing coverage to prevent massive structural weaknesses
  score += uniqueTypes.size * 10;

  return {
    score,
    breakdown: {
      uniqueTypesCount: uniqueTypes.size,
      typesPresent: Array.from(uniqueTypes)
    }
  };
}