// src/lib/pokeApi.ts
//
// Instant local data provider. Despite the name, this never hits the network:
// it reads base stats, types, and abilities straight out of the bundled
// dataset so the UI gets a zero-latency, fully-offline stat matrix.

import pokemonData from "../data/pokemon.json";

export type StatEntry = { name: string; base_stat: number };

export type LiveGameData = {
    abilities: string[];
    types: string[];
    stats: StatEntry[];
};

const STAT_ORDER: { name: string; baseKey: string; formKey: string }[] = [
    { name: "hp", baseKey: "hp", formKey: "hp" },
    { name: "attack", baseKey: "attack", formKey: "atk" },
    { name: "defense", baseKey: "defense", formKey: "def" },
    { name: "special-attack", baseKey: "sp_attack", formKey: "spa" },
    { name: "special-defense", baseKey: "sp_defense", formKey: "spd" },
    { name: "speed", baseKey: "speed", formKey: "spe" },
];

function findLocalEntry(name: string): any | undefined {
    const target = name.toLowerCase().trim();
    return (pokemonData as any[]).find((p) => p.name.toLowerCase().trim() === target);
}

function extractStats(entry: any): StatEntry[] {
    const baseStats = entry.baseStats;
    const formStats = entry.availableForms?.[0]?.stats;

    return STAT_ORDER.map(({ name, baseKey, formKey }) => ({
        name,
        base_stat: baseStats?.[baseKey] ?? formStats?.[formKey] ?? 0,
    }));
}

/**
 * Looks up a Pokémon's live game data (abilities, types, stats) from the
 * local dataset. Case-insensitive on name. Resolves to `null` when the
 * species can't be found locally.
 */
export async function fetchPokemonGameData(name: string): Promise<LiveGameData | null> {
    const localPoke = findLocalEntry(name);

    if (!localPoke) {
        console.warn(`Local look-up failed for species: "${name}"`);
        return null;
    }

    const rawAbilities: string[] = localPoke.availableForms?.[0]?.abilities || [];
    const abilities = rawAbilities.map((a) => a.toLowerCase());
    const types = localPoke.types?.map((t: string) => t.toLowerCase()) || ["normal"];

    return { abilities, types, stats: extractStats(localPoke) };
}