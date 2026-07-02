// src/lib/optimizer/synergy.ts
//
// Heuristic bonuses/penalties layered on top of the base team evaluation:
// weather clutter, speed-control coverage, named synergy pairs, and
// defensive-typing "cores".

import { pokemonMap } from "./teamEvaluator";

const ARCHETYPE_MEMBER_BONUS = 5;

/** Small bonus per team member that natively belongs to the target archetype. */
export function getArchetypeBonus(team: string[], archetype: string): number {
    let bonus = 0;
    for (const pokemonName of team) {
        const pokemon = pokemonMap[pokemonName.toLowerCase()];
        if (pokemon?.archetypes?.includes(archetype)) {
            bonus += ARCHETYPE_MEMBER_BONUS;
        }
    }
    return bonus;
}

const WEATHER_CLUTTER_PENALTY = -300;
const SPEED_CONTROL_BONUS = 100;
const NO_SPEED_CONTROL_PENALTY = -150;
const NO_PRIORITY_PENALTY = -75;
const NAMED_PAIR_BONUS = 150;
const CORE_TYPING_BONUS = 50;

/** Named duo synergies that get a flat bonus when both members are present. */
const NAMED_SYNERGY_PAIRS: [string, string][] = [
    ["sneasler", "kingambit"],
    ["mega floette", "whimsicott"],
];

/** Elemental "core" typings that get a flat bonus when all three are represented. */
const CORE_TYPE_TRIOS: string[][] = [
    ["fire", "water", "grass"],
    ["fairy", "dragon", "steel"],
];

/**
 * Heuristic synergy score: penalizes conflicting weather setters and a lack
 * of speed control / priority, and rewards a few known-good pairings and
 * defensive typing cores.
 */
export function getSynergyScore(teamNames: string[]): number {
    let synergyScore = 0;
    const teamData = teamNames.map((name) => pokemonMap[name.toLowerCase()]).filter(Boolean);
    const lowerNames = teamNames.map((n) => n.toLowerCase());

    let weatherCount = 0;
    if (teamData.some((p) => p.roles?.["rain_setter"])) weatherCount++;
    if (teamData.some((p) => p.roles?.["sun_setter"])) weatherCount++;
    if (teamData.some((p) => p.roles?.["snow_setter"])) weatherCount++;
    if (teamData.some((p) => p.roles?.["sand_setter"])) weatherCount++;
    if (weatherCount > 1) synergyScore += WEATHER_CLUTTER_PENALTY;

    let speedControlCount = 0;
    let hasPriority = false;

    for (const p of teamData) {
        if (p.roles?.["tailwind_setter"]) speedControlCount++;
        if (p.roles?.["trick_room_setter"]) speedControlCount++;
        if (p.roles?.["fake_out"]) hasPriority = true;
    }

    if (speedControlCount >= 2) synergyScore += SPEED_CONTROL_BONUS;
    else if (speedControlCount === 0) synergyScore += NO_SPEED_CONTROL_PENALTY;
    if (!hasPriority) synergyScore += NO_PRIORITY_PENALTY;

    for (const [a, b] of NAMED_SYNERGY_PAIRS) {
        if (lowerNames.includes(a) && lowerNames.includes(b)) synergyScore += NAMED_PAIR_BONUS;
    }

    const types = teamData.flatMap((p) => p.types.map((t) => (typeof t === "string" ? t.toLowerCase() : "")));
    for (const trio of CORE_TYPE_TRIOS) {
        if (trio.every((t) => types.includes(t))) synergyScore += CORE_TYPING_BONUS;
    }

    return synergyScore;
}