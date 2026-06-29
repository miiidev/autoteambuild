// src/components/PokemonGrid.tsx
import { useEffect, useState } from "react";
import pokemonData from "../data/pokemon.json";

interface PokemonGridProps {
  onSelect: (name: string) => void;
}

export default function PokemonGrid({ onSelect }: PokemonGridProps) {
  const [allPokemon, setAllPokemon] = useState<{name: string, types: string[]}[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 1. Load the pristine roster directly from our ultimate JSON sandbox data
  useEffect(() => {
    // Simulating a quick initialization cycle for the UI
    setTimeout(() => {
      const roster = (pokemonData as any[]).map(p => ({
        name: p.name,
        types: p.types || ["Normal"]
      }));
      setAllPokemon(roster);
      setIsLoading(false);
    }, 400);
  }, []);

  // 2. Real-time filtering
  const filteredPokemon = allPokemon.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Helper to format the name for the animated sprite URL
  const getSpriteUrl = (name: string) => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `https://play.pokemonshowdown.com/sprites/ani/${cleanName}.gif`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>🏆</span> Champions Dex Roster
        </h2>
        <input
          type="text"
          placeholder="Search species..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono">Loading 3D Assets...</span>
        </div>
      ) : (
        <div className="max-h-[500px] overflow-y-auto border border-gray-100 rounded-lg p-3 bg-gray-50 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 scrollbar-thin">
          {filteredPokemon.length === 0 ? (
            <div className="col-span-full text-center py-12 text-sm text-gray-400 italic">
              No Pokémon matches "{searchQuery}"
            </div>
          ) : (
            filteredPokemon.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => onSelect(p.name)}
                className="relative group flex flex-col items-center justify-end h-28 p-2 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded-xl transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md overflow-hidden"
              >
                {/* 3D Animated Sprite */}
                <div className="absolute top-2 left-0 right-0 bottom-8 flex items-center justify-center pointer-events-none">
                   <img 
                      src={getSpriteUrl(p.name)} 
                      alt={p.name}
                      onError={(e) => {
                        // Fallback to static sprite if the animated one hasn't loaded/doesn't exist
                        (e.target as HTMLImageElement).src = `https://play.pokemonshowdown.com/sprites/dex/${p.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;
                      }}
                      className="max-h-16 max-w-full object-contain group-hover:scale-110 transition-transform duration-300"
                      style={{ imageRendering: 'pixelated' }}
                   />
                </div>
                
                {/* Name Label */}
                <div className="w-full text-center bg-gray-100 group-hover:bg-blue-100 rounded py-1 px-1 mt-auto z-10">
                    <span className="text-[11px] font-bold text-gray-700 block truncate">
                      {p.name}
                    </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}