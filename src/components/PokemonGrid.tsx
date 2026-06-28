// src/components/PokemonGrid.tsx
import { useEffect, useState } from "react";
import { fetchAllPokemonNames } from "../lib/pokeApi";

interface PokemonGridProps {
  onSelect: (name: string) => void;
}

export default function PokemonGrid({ onSelect }: PokemonGridProps) {
  const [allPokemon, setAllPokemon] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch the master national Pokedex list on mount
  useEffect(() => {
    async function loadPokedex() {
      try {
        setIsLoading(true);
        const masterList = await fetchAllPokemonNames();
        setAllPokemon(masterList);
      } catch (error) {
        console.error("Failed loading Pokedex list component", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPokedex();
  }, []);

  // 2. Filter list down in real-time as the user types
  const filteredPokemon = allPokemon.filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">🔍 Draft From National Pokédex</h3>
          <p className="text-xs text-gray-500">Click any Pokémon below to add them to your sandbox box pool.</p>
        </div>

        {/* Search Input field */}
        <input
          type="text"
          placeholder="Search over 1,000+ species... (e.g., Pikachu, Gengar)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
        />
      </div>

      {/* Loading/Grid Viewport State Machine */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono">Syncing Pokédex Directory Tree...</span>
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 scrollbar-thin">
          {filteredPokemon.length === 0 ? (
            <div className="col-span-full text-center py-8 text-sm text-gray-400 italic">
              No Pokémon matches "{searchQuery}"
            </div>
          ) : (
            filteredPokemon.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onSelect(name)}
                className="px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 rounded text-left font-medium text-xs truncate transition-all duration-150 active:scale-95 shadow-2xs"
              >
                {name}
              </button>
            ))
          )}
        </div>
      )}

      <div className="mt-2 text-[10px] text-right text-gray-400 font-mono">
        Total Loaded Assets: {allPokemon.length} entries
      </div>
    </div>
  );
}