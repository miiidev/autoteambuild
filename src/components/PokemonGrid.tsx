// src/components/PokemonGrid.tsx
import { useEffect, useState } from "react";
import pokemonData from "../data/pokemon.json";
import PokemonSprite from "./PokemonSprite";

interface PokemonGridProps {
  onSelect: (name: string) => void;
  isDark: boolean;
}

export default function PokemonGrid({ onSelect, isDark }: PokemonGridProps) {
  const [allPokemon, setAllPokemon] = useState<{ name: string, types: string[] }[]>([]);
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
      <div className={`flex flex-col items-center justify-center p-12 space-y-4 rounded-2xl shadow-sm min-h-[400px] transition-colors duration-300 ${isDark ? "bg-slate-900 text-slate-400" : "bg-white text-gray-500"}`}>
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium animate-pulse">Synchronizing Regional Dex Database...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 🧷 FIXED HEADER */}
      <div className={`shrink-0 px-4 pt-4 pb-4 space-y-3 border-b transition-colors duration-300 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"}`}>
        <h2 className={`text-sm font-black tracking-wider uppercase flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-900"}`}>
          <span>📖</span> Regional Roster ({filteredPokemon.length}/{allPokemon.length})
        </h2>

        {/* 🎨 ROUNDED SEARCH BAR */}
        <div className={`flex items-center border focus-within:ring-2 rounded-full px-5 py-2.5 shadow-sm transition-all duration-200 ${isDark ? "bg-slate-950 border-slate-800 focus-within:border-indigo-500 focus-within:ring-indigo-950" : "bg-white border-gray-200 focus-within:border-blue-400 focus-within:ring-blue-100"}`}>
          <span className="text-xl mr-2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search box by species name (e.g., Basculegion, Incineroar)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-sm outline-none bg-transparent ${isDark ? "text-slate-100 placeholder-slate-600" : "text-gray-800 placeholder-gray-400"}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600"}`}
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* 📜 SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pl-4 pr-3 pb-6 pt-4">
        {filteredPokemon.length === 0 ? (
          <div className={`flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl min-h-[250px] ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-gray-50 border-gray-200"}`}>
            <span className="text-3xl mb-2">📦</span>
            <p className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-gray-600"}`}>No Match Found</p>
            <p className={`text-xs max-w-xs mt-1 ${isDark ? "text-slate-600" : "text-gray-400"}`}>We couldn&apos;t track down that species in the current VGC meta index regulations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredPokemon.map((p) => (
              <div
                key={p.name}
                onClick={() => onSelect(p.name)}
                className={`group relative flex flex-col items-center justify-end cursor-pointer h-28 p-2 border rounded-xl transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md overflow-hidden ${isDark ? "bg-slate-950 hover:bg-indigo-950/40 border-slate-800 hover:border-indigo-500" : "bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-400"}`}
              >
                {/* 3D Animated Sprite Container */}
                <div className="absolute top-2 left-0 right-0 bottom-8 flex items-center justify-center pointer-events-none">
                  <PokemonSprite displayName={p.name} />
                </div>

                {/* Name Label */}
                <div className={`w-full text-center rounded py-1 px-1 mt-auto z-10 transition-colors duration-200 ${isDark ? "bg-slate-900 group-hover:bg-indigo-900/60" : "bg-gray-100 group-hover:bg-blue-100"}`}>
                  <span className={`text-[11px] font-bold block truncate ${isDark ? "text-slate-300 group-hover:text-indigo-200" : "text-gray-700"}`}>
                    {p.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}