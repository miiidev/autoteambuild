// src/lib/pokeApi.ts
import pokemonData from "../data/pokemon.json";

export type LiveGameData = {
    abilities: string[];
    types: string[];
    stats: { name: string; base_stat: number }[];
};

/**
 * ⚡ INSTANT LOCAL PROVIDER
 * Bypasses PokeAPI network requests entirely and extracts base stats, types, 
 * and abilities directly from our local JSON dataset.
 * * Runs in 0ms, works fully offline, and guarantees a zero-glitch stat matrix layout.
 */
export async function fetchPokemonGameData(name: string): Promise<LiveGameData | null> {
    // Find the matching Pokémon entry in our local json database (case-insensitive)
    const localPoke = (pokemonData as any[]).find(
        (p) => p.name.toLowerCase().trim() === name.toLowerCase().trim()
    );

    if (!localPoke) {
        console.warn(`Local look-up failed for species: "${name}"`);
        return null;
    }

    // 1. Extract abilities from the primary local form entry
    const rawAbilities = localPoke.availableForms?.[0]?.abilities || [];
    const abilities = rawAbilities.map((a: string) => a.toLowerCase());

    // 2. Extract types
    const types = localPoke.types?.map((t: string) => t.toLowerCase()) || ["normal"];

    // 3. Re-map local stats into the standard array matrix structure expected by the UI layouts
    const b = localPoke.baseStats;
    const f = localPoke.availableForms?.[0]?.stats;

    const stats = [
        { name: "hp", base_stat: b?.hp ?? f?.hp ?? 0 },
        { name: "attack", base_stat: b?.attack ?? f?.atk ?? 0 },
        { name: "defense", base_stat: b?.defense ?? f?.def ?? 0 },
        { name: "special-attack", base_stat: b?.sp_attack ?? f?.spa ?? 0 },
        { name: "special-defense", base_stat: b?.sp_defense ?? f?.spd ?? 0 },
        { name: "speed", base_stat: b?.speed ?? f?.spe ?? 0 }
    ];

    return { abilities, types, stats };
}