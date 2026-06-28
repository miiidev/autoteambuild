// src/lib/pokeApi.ts

export interface LiveGameData {
    types: string[];
    sprite: string;
    stats: { name: string; base_stat: number }[];
    abilities: string[];
}

export interface PokedexListItem {
    name: string;
    url: string;
}

const pokeCache = new Map<string, LiveGameData>();

export async function fetchPokemonGameData(pokemonName: string): Promise<LiveGameData | null> {
    // Format name to match PokeAPI specifications (e.g. "Chien-Pao" -> "chien-pao")
    const formattedName = pokemonName.toLowerCase().trim().replace(/\s+/g, "-");

    if (pokeCache.has(formattedName)) {
        return pokeCache.get(formattedName)!;
    }

    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${formattedName}`);
        if (!response.ok) throw new Error(`Not found in PokeAPI database: ${pokemonName}`);

        const data = await response.json();

        const gameData: LiveGameData = {
            // Extracts and capitalizes typing records cleanly
            types: data.types.map((t: any) => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)),
            // Captures default sharp 2D official front sprite asset
            sprite: data.sprites.front_default || "",
            // Passes complete baseline values over for stat-bias fallback generation
            stats: data.stats.map((s: any) => ({
                name: s.stat.name,
                base_stat: s.base_stat
            })),
            // Extracts all standard/hidden abilities assigned to the creature
            abilities: data.abilities.map((a: any) => a.ability.name)
        };

        pokeCache.set(formattedName, gameData);
        return gameData;
    } catch (error) {
        console.warn(`Failed to resolve dynamic game metrics for: ${pokemonName}`, error);
        return null;
    }
}

export async function fetchAllPokemonNames(): Promise<string[]> {
    try {
        // limit=1025 captures all canonical species across Generations 1 through 9
        const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
        if (!response.ok) throw new Error("Failed to pull directory");

        const data = await response.json();

        // Map the results array to return an array of strings with proper VGC casing conventions
        return data.results.map((p: any) => {
            // Capitalize names nicely for UI elements (e.g. "bulbasaur" -> "Bulbasaur")
            return p.name.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("-");
        });
    } catch (error) {
        console.error("Failed to populate master grid registry", error);
        return []; // Safe array fallback layout so UI doesn't drop dead
    }
}