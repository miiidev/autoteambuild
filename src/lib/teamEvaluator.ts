import pokemonData from "../data/pokemon.json";

export type PokemonBuild = {
  ability: string;
  item: string;
  nature: string;
  evs: string;
  moves: string[];
  teraType?: string;
};

export type Pokemon = {
  name: string;
  types: string[];
  roles: Partial<Record<string, number>>;
  archetypes: string[];
  restricted_legendary?: boolean;
  requires_item?: string;
  builds?: Partial<Record<string, PokemonBuild>>;
};

const pokemonMap: Record<string, Pokemon> = Object.fromEntries(
  (pokemonData as unknown as Pokemon[]).map((p) => [
    p.name.toLowerCase(),
    p
  ])
);

const REQUIRED_CORE_ROLES = [
  "fake_out",
  "tailwind",
  "trick_room_setter",
  "redirection",
  "pivot",
  "intimidate",
  "speed_control"
];

const OFFENSIVE_ROLES = [
  "physical_sweeper",
  "special_sweeper",
  "wallbreaker",
  "late_game_cleaner"
];

const SUPPORT_ROLES = [
  "support",
  "redirection",
  "fake_out",
  "intimidate",
  "pivot"
];

const SPEED_ROLES = [
  "tailwind",
  "trick_room_setter",
  "speed_control"
];

export function evaluateTeam(team: string[]) {
  const roleCounts: Record<string, number> = {};

  const pokemons = team
    .map((name) => pokemonMap[name.toLowerCase()])
    .filter(Boolean) as Pokemon[];

  // aggregate roles
  for (const p of pokemons) {
    for (const [role, weight] of Object.entries(p.roles || {})) {
      roleCounts[role] = (roleCounts[role] || 0) + (weight ?? 0);
    }
  }

  let score = 100;

  // missing core roles penalty
  let missingCore = 0;

  for (const role of REQUIRED_CORE_ROLES) {
    if ((roleCounts[role] || 0) === 0) {
      missingCore++;
    }
  }

  score -= missingCore * 10;

  // balance checks
  const offense = OFFENSIVE_ROLES.reduce(
    (a, r) => a + (roleCounts[r] || 0),
    0
  );

  const support = SUPPORT_ROLES.reduce(
    (a, r) => a + (roleCounts[r] || 0),
    0
  );

  const speed = SPEED_ROLES.reduce(
    (a, r) => a + (roleCounts[r] || 0),
    0
  );

  if (offense > 10) score -= 10;
  if (support === 0) score -= 15;
  if (speed === 0) score -= 20;

  // 🛡️ NEW: VGC Restricted Legendary Rule Check
  // Official formats permit a maximum of ONE Restricted Uber per team.
  const restrictedCount = pokemons.filter((p) => p.restricted_legendary).length;
  if (restrictedCount > 2) { 
    // Drop the score significantly to prune this candidate branch from the search tree
    score -= 200;
  }

  return {
    // Keep raw score un-clamped here so Beam Search can rank a legal bad team (0) higher than an illegal team (-100)
    score: Math.round(score),
    breakdown: {
      missingCore,
      offense,
      support,
      speed,
      restrictedCount
    }
  };
}