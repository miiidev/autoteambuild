// src/lib/pokeApi.ts

export type LiveGameData = {
    abilities: string[];
    types: string[];
    stats: { name: string; base_stat: number }[];
};

// 🌟 UPDATE: In-memory cache to prevent API spam on a 50-slot workbench
const apiCache = new Map<string, LiveGameData>();

/**
 * Fetches dynamic, real-time data from PokeAPI and normalizes it for the optimizer
 */
export async function fetchPokemonGameData(name: string): Promise<LiveGameData | null> {
    try {
        const cleanedName = name.toLowerCase().trim().replace(/[\s_]+/g, "-");
        
        // Return from cache if we already fetched it this session
        if (apiCache.has(cleanedName)) {
            return apiCache.get(cleanedName)!;
        }

        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${cleanedName}`);
        
        if (!response.ok) {
            console.warn(`PokeAPI fetch failed for: ${name}`);
            return null;
        }

        const data = await response.json();

        // Flatten attributes into simple lowercase arrays for our synergy scripts
        const abilities = data.abilities.map((a: any) => a.ability.name.toLowerCase());
        const types = data.types.map((t: any) => t.type.name.toLowerCase());
        const stats = data.stats.map((s: any) => ({
            name: s.stat.name.toLowerCase(), 
            base_stat: s.base_stat
        }));

        const resultData = { abilities, types, stats };
        
        // Save to cache for next time
        apiCache.set(cleanedName, resultData);

        return resultData;
    } catch (error) {
        console.error(`Error fetching game data for ${name}:`, error);
        return null;
    }
}