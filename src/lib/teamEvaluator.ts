// src/lib/teamEvaluator.ts
import pokemonData from "../data/pokemon.json";

export type PokemonBuild = {
  ability: string;
  item: string;
  nature: string;
  evs: string;
  moves: string[];
};

export type Pokemon = {
  name: string;
  types: string[];
  archetypes: string[];
  roles: Record<string, number>;
  builds: Record<string, PokemonBuild>;
  requires_item?: string;
  usageData?: {
    moves: { name: string; usage: string }[];
    items: { name: string; usage: string }[];
    abilities: { name: string; usage: string }[];
  };
};

export const pokemonMap: Record<string, Pokemon & { baseStats?: any; availableForms?: any }> = Object.fromEntries(
  (pokemonData as any[]).map((p) => {
    return [
      p.name.toLowerCase(),
      {
        name: p.name,
        types: p.types || ["Normal"],
        roles: p.roles || { goodstuff: 1 },
        archetypes: p.archetypes || ["goodstuff"],
        builds: p.builds || {},
        usageData: p.usageData,
        requires_item: p.requires_item,
        // 💾 Save stat objects locally so the app can access them instantly
        baseStats: p.baseStats,
        availableForms: p.availableForms
      }
    ];
  })
);

/**
 * Structural macro evaluation focusing purely on stat checks and defensive type coverage.
 */
export function evaluateTeam(team: string[]) {
  let score = 100;
  const uniqueTypes = new Set<string>();
  const typeCounts: Record<string, number> = {};
  const breakdown: string[] = ["Base Score: 100"]; // 🌟 ADDED: Breakdown array

  for (const name of team) {
    const pData = pokemonMap[name.toLowerCase()];
    if (!pData) continue;

    pData.types.forEach(t => {
      const lowerType = t.toLowerCase();
      uniqueTypes.add(lowerType);
      typeCounts[lowerType] = (typeCounts[lowerType] || 0) + 1;
    });
  }

  // Reward diverse typing
  const typeBonus = uniqueTypes.size * 10;
  score += typeBonus;
  breakdown.push(`+${typeBonus} Synergy: Diverse Type Coverage (${uniqueTypes.size} types)`); // 🌟 ADDED

  // VGC RULE: Check for extreme type stacking (3+ of the same type)
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count >= 3) {
      score -= 150;
      breakdown.push(`-150 Penalty: Excessive ${type.charAt(0).toUpperCase() + type.slice(1)}-Type Stacking (${count})`); // 🌟 ADDED
    }
  }

  // 🌟 UPDATE: Return breakdown alongside the rest of the data
  return { score, uniqueTypes: Array.from(uniqueTypes), breakdown };
}