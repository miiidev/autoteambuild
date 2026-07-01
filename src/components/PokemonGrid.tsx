// src/components/PokemonGrid.tsx
import { useEffect, useState } from "react";
import pokemonData from "../data/pokemon.json";
import PokemonSprite from "./PokemonSprite";

interface PokemonGridProps {
  onSelect: (name: string) => void;
}

export default function PokemonGrid({ onSelect }: PokemonGridProps) {
  const [allPokemon, setAllPokemon] = useState<{name: string, types: string[]}[]>([]);
  // 🛠️ FIXED: Removed the invalid backslashes from the empty string
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      const roster = (pokemonData as any[]).map(p => ({
        name: p.name,
        types: p.types || ["Normal"]
      }));
      setAllPokemon(roster);
      setIsLoading(false);
    }, 400);
  }, []);

  const filteredPokemon = allPokemon.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white border border-gray-100 rounded-2xl shadow-sm min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 animate-pulse">Synchronizing Regional Dex Database...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Search Header Bar */}
      <div className="flex items-center bg-white border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl px-4 py-2.5 shadow-sm transition-all duration-200">
        <span className="text-xl mr-2 text-gray-400">🔍</span>
        <input
          type="text"
          placeholder="Search box by species name (e.g., Basculegion, Incineroar)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")}
            className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Grid Canvas Wrapper */}
      {filteredPokemon.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl min-h-[250px]">
          <span className="text-3xl mb-2">📦</span>
          <p className="text-sm font-semibold text-gray-600">No Match Found</p>
          {/* 🛠️ FIXED: Used &apos; instead of an unescaped apostrophe */}
          <p className="text-xs text-gray-400 max-w-xs mt-1">We couldn&apos;t track down that species in the current VGC meta index regulations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredPokemon.map((p) => (
            <div
              key={p.name}
              onClick={() => onSelect(p.name)}
              className="group relative flex flex-col items-center justify-end cursor-pointer h-28 p-2 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded-xl transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md overflow-hidden"
            >
              {/* 3D Animated Sprite Container */}
              <div className="absolute top-2 left-0 right-0 bottom-8 flex items-center justify-center pointer-events-none">
                 <PokemonSprite displayName={p.name} />
              </div>
              
              {/* Name Label */}
              <div className="w-full text-center bg-gray-100 group-hover:bg-blue-100 rounded py-1 px-1 mt-auto z-10 transition-colors duration-200">
                  <span className="text-[11px] font-bold text-gray-700 block truncate">
                    {p.name}
                  </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}