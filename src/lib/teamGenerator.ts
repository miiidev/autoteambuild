import pokemonData from "../data/pokemon.json";
import { evaluateTeam } from "./teamEvaluator";
import { detectArchetypes } from "./archetypeDetector";

type Pokemon = {
  name: string;
  types: string[];
  roles: Partial<Record<string, number>>;
  archetypes: string[];
};

const pokemonList = pokemonData as unknown as Pokemon[];

/**
 * Build candidate team pools
 */
function generateCandidates(box: string[]) {
  const pool = pokemonList.filter((p) =>
    box.includes(p.name)
  );

  return pool;
}

/**
 * Generate multiple team combinations (simple heuristic)
 */
function buildTeams(pool: Pokemon[]) {
  const teams: string[][] = [];

  // simple sliding window approach (fast MVP version)
  for (let i = 0; i < pool.length; i++) {
    const team = pool
      .slice(i, i + 6)
      .map((p) => p.name);

    if (team.length >= 3) {
      teams.push(team);
    }
  }

  return teams;
}

/**
 * MAIN FUNCTION
 */
export function generateBestTeam(box: string[]) {
  const archetypes = detectArchetypes(box);
  const bestArchetype = archetypes[0].archetype;

  const pool = generateCandidates(box);

  const teams = buildTeams(pool);

  let best = {
    team: [] as string[],
    score: -Infinity
  };

  for (const team of teams) {
    const evalResult = evaluateTeam(team);

    let score = evalResult.score;

    // archetype bonus
    const archetypeBonus = team.reduce((acc, name) => {
      const p = pool.find((x) => x.name === name);
      if (!p) return acc;

      return p.archetypes.includes(bestArchetype)
        ? acc + 5
        : acc;
    }, 0);

    score += archetypeBonus;

    if (score > best.score) {
      best = {
        team,
        score
      };
    }
  }

  return {
    archetype: bestArchetype,
    team: best.team,
    score: best.score
  };
}