// src/App.tsx
import { useState } from "react";
import PokemonGrid from "./components/PokemonGrid";
import { optimizeTeam, type OptimizedTeamResult } from "./lib/teamOptimizer";

export default function App() {
  const [sandboxBox, setSandboxBox] = useState<string[]>([]);
  const [optimizedStrategies, setOptimizedStrategies] = useState<OptimizedTeamResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Phase 2 State: Tracks which Pokémon is currently being inspected in the modal
  const [selectedInspectPokemon, setSelectedInspectPokemon] = useState<any | null>(null);

  // Adds a unique Pokemon selection to our active drafting box pool
  const handleAddPokemon = (name: string) => {
    setErrorMessage(null);
    if (sandboxBox.includes(name)) {
      setErrorMessage(`${name} is already inside your sandbox workbench box.`);
      return;
    }
    if (sandboxBox.length >= 12) {
      setErrorMessage("Your workbench box is full! Max limit is 12 entries.");
      return;
    }
    setSandboxBox([...sandboxBox, name]);
  };

  // Removes a drafted element from the active workbench box pool
  const handleRemovePokemon = (name: string) => {
    setSandboxBox(sandboxBox.filter((p) => p !== name));
    setErrorMessage(null);
  };

  // Clears the workbench to draft completely fresh
  const handleClearBox = () => {
    setSandboxBox([]);
    setOptimizedStrategies([]);
    setErrorMessage(null);
  };

  // Triggers the tactical Beam Search Optimizer Engine asynchronously
  const handleRunOptimization = async () => {
    if (sandboxBox.length < 6) {
      setErrorMessage("You must select at least 6 Pokémon to initialize calculation vectors.");
      return;
    }

    try {
      setIsOptimizing(true);
      setErrorMessage(null);
      const results = await optimizeTeam(sandboxBox);
      setOptimizedStrategies(results);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected optimization failure occurred.");
    } finally {
      setIsOptimizing(false);
    }
  };

  // PHASE 2: Export to Pokémon Showdown Format
  const handleExportToShowdown = (team: any[]) => {
    const exportText = team.map(pokemon => {
      if (!pokemon.build) return pokemon.name; 
      
      const p = pokemon.build;
      let text = `${pokemon.name} @ ${p.item}\n`;
      text += `Ability: ${p.ability}\n`;
      text += `Level: 50\n`;
      if (p.teraType) text += `Tera Type: ${p.teraType}\n`;
      text += `EVs: ${p.evs}\n`;
      text += `${p.nature} Nature\n`;
      p.moves.forEach((move: string) => {
        text += `- ${move}\n`;
      });
      return text;
    }).join('\n\n');

    navigator.clipboard.writeText(exportText);
    alert("✅ Team copied to clipboard! You can now paste this into Pokémon Showdown.");
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4 md:p-8 font-sans relative">
      <header className="max-w-6xl mx-auto mb-6">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">🏆 VGC Team Generator Sandbox</h1>
        <p className="text-sm text-gray-500 mt-1">Phase 2: Advanced Strategy Tooling & Moveset UI Expansion</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        {/* LEFT SIDE PANEL: Master Pokedex Search Selection Grid Component */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <PokemonGrid onSelect={handleAddPokemon} />

          {/* DRAFT WORKBENCH DRAWER SECTION */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">🧰 Your Sandbox Workbench</h3>
                <p className="text-xs text-gray-400">({sandboxBox.length}/12 selected) Add 6 or more to run engine rulesets.</p>
              </div>
              {sandboxBox.length > 0 && (
                <button
                  onClick={handleClearBox}
                  className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer"
                >
                  Clear Box
                </button>
              )}
            </div>

            {sandboxBox.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg py-10 text-center text-sm text-gray-400">
                Click species from the Pokédex selection grid above to fill your workbench.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sandboxBox.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-medium text-xs rounded-full"
                  >
                    {name}
                    <button
                      onClick={() => handleRemovePokemon(name)}
                      className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Trigger Calculation Vectors Button */}
            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing || sandboxBox.length < 6}
              className={`w-full mt-5 py-3 rounded-lg text-white font-bold text-sm tracking-wide shadow-sm transition-all cursor-pointer ${isOptimizing || sandboxBox.length < 6
                ? "bg-gray-300 cursor-not-allowed text-gray-500"
                : "bg-blue-600 hover:bg-blue-700 active:scale-98"
                }`}
            >
              {isOptimizing ? "🤖 Crunching Beam Search Trees..." : "🚀 Optimize VGC Tournament Teams"}
            </button>

            {/* Dynamic Alert Banner Notifications */}
            {errorMessage && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                ⚠️ {errorMessage}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE PANEL: Optimization Results Rendering Viewports */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 text-white rounded-xl p-5 shadow-md h-full min-h-[400px]">
            <h2 className="text-lg font-black tracking-tight mb-1 border-b border-gray-800 pb-2">📋 Recommended Core Compositions</h2>

            {isOptimizing && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-mono animate-pulse">Running heuristic archetype score vectors...</p>
              </div>
            )}

            {!isOptimizing && optimizedStrategies.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500 p-4">
                <span className="text-3xl mb-2">⚖️</span>
                <p className="text-xs">No active calculations loaded. Choose your team criteria and hit optimize to generate meta compositions!</p>
              </div>
            )}

            {!isOptimizing && optimizedStrategies.map((strategy, idx) => (
              <div key={strategy.archetype + idx} className="mb-6 last:mb-0 bg-gray-800/50 border border-gray-800 rounded-xl p-4">
                
                {/* PHASE 2: Export Button and Scores */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-900 text-blue-200 border border-blue-800 rounded text-[10px] font-bold uppercase tracking-wider">
                      {strategy.archetype === "goodstuff" ? "Standard Balance Core" : `${strategy.archetype.replace("_", " ")} Archetype`}
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-green-900/50 text-green-400 border border-green-800 rounded">
                      Score: {strategy.score}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleExportToShowdown(strategy.team)}
                    className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded border border-gray-600 transition-colors cursor-pointer"
                  >
                    📋 Export
                  </button>
                </div>

                {/* PHASE 2: Dynamic Grid Loop with Abilities and Badges */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {strategy.team.map((pokemon) => (
                    <div
                      key={pokemon.name}
                      onClick={() => setSelectedInspectPokemon(pokemon)}
                      className="p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-colors text-center flex flex-col items-center cursor-pointer relative group"
                    >
                      {/* Auto-Generated Badge */}
                      {pokemon.isAutoGenerated && (
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" title="Auto-Generated Build"></span>
                        </span>
                      )}

                      {pokemon.sprite ? (
                        <img src={pokemon.sprite} alt={pokemon.name} className="w-16 h-16 object-contain group-hover:scale-110 transition-transform" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-[10px] text-gray-500">
                          No Art
                        </div>
                      )}

                      <div className="font-bold text-sm text-gray-100 mt-2 truncate w-full">
                        {pokemon.name}
                      </div>

                      {/* Displaying Item and Ability */}
                      {pokemon.build && (
                        <div className="text-[10px] text-gray-400 mt-1 w-full text-center flex flex-col gap-0.5">
                          <span className="truncate">📦 {pokemon.build.item}</span>
                          <span className="truncate">✨ {pokemon.build.ability}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Displaying Synergy Penalties or Breakdown flags */}
                <div className="mt-3 text-[10px] text-gray-400 font-mono flex flex-col gap-1 bg-gray-900/50 p-2 rounded border border-gray-800">
                  <div className="flex justify-between">
                    <span>⚔️ Offense/Support: +{strategy.evaluation.breakdown.offense} / +{strategy.evaluation.breakdown.support}</span>
                    <span>⚡ Speed Control: +{strategy.evaluation.breakdown.speed}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-800 pt-1 mt-1 text-gray-500">
                    <span>⚠️ Missing Core Roles: {strategy.evaluation.breakdown.missingCore}</span>
                    <span>👑 Restricted Count: {strategy.evaluation.breakdown.restrictedCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* PHASE 2: BUILD INSPECT MODAL */}
      {selectedInspectPokemon && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" 
          onClick={() => setSelectedInspectPokemon(null)}
        >
          <div 
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-gray-100 max-h-[90vh] overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-800 p-6 flex flex-col items-center relative border-b border-gray-700">
              <button 
                onClick={() => setSelectedInspectPokemon(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
              
              {selectedInspectPokemon.isAutoGenerated && (
                 <span className="absolute top-4 left-4 bg-orange-900/50 text-orange-400 border border-orange-700 px-2 py-1 rounded text-[10px] font-bold uppercase">
                   ⚠️ Auto-Generated
                 </span>
              )}

              <img src={selectedInspectPokemon.sprite} alt={selectedInspectPokemon.name} className="w-24 h-24 object-contain" />
              <h2 className="text-2xl font-black tracking-tight mt-2">{selectedInspectPokemon.name}</h2>
              <div className="flex gap-2 mt-2 items-center">
                {selectedInspectPokemon.types.map((type: string) => (
                  <span key={type} className="px-2 py-0.5 bg-gray-700 rounded text-xs font-bold uppercase tracking-wider">
                    {type}
                  </span>
                ))}
                {selectedInspectPokemon.buildName && (
                  <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 border border-indigo-700 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    🛠️ {selectedInspectPokemon.buildName}
                  </span>
                )}
              </div>
            </div>

            {selectedInspectPokemon.build ? (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Item</span>
                    <span className="text-sm font-medium">{selectedInspectPokemon.build.item}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Ability</span>
                    <span className="text-sm font-medium">{selectedInspectPokemon.build.ability}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Nature</span>
                    <span className="text-sm font-medium">{selectedInspectPokemon.build.nature}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Tera Type</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      💎 {selectedInspectPokemon.build.teraType || "Varies"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">EV Spread</span>
                    <span className="text-sm font-mono bg-gray-800 px-2 py-1 rounded block">{selectedInspectPokemon.build.evs}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block mb-2">Moveset</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedInspectPokemon.build.moves.map((move: string) => (
                      <div key={move} className="bg-blue-900/20 border border-blue-900/50 text-blue-200 px-3 py-2 rounded text-sm text-center font-medium">
                        {move}
                      </div>
                    ))}
                  </div>
                </div>

                {/* PHASE 2: LIVE BASE STAT BARS */}
                {selectedInspectPokemon.stats && selectedInspectPokemon.stats.length > 0 && (
                  <div className="mt-6 border-t border-gray-700 pt-4">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-3">Base Stats</span>
                    <div className="flex flex-col gap-1.5">
                      {selectedInspectPokemon.stats.map((stat: any) => {
                        const fillPercentage = Math.min(100, (stat.base_stat / 255) * 100);
                        const statLabels: Record<string, string> = { hp: "HP", attack: "ATK", defense: "DEF", "special-attack": "SPA", "special-defense": "SPD", speed: "SPE" };
                        
                        return (
                          <div key={stat.name} className="flex items-center text-xs font-mono">
                            <span className="w-10 text-gray-400">{statLabels[stat.name] || stat.name}</span>
                            <span className="w-8 text-right mr-2 font-bold">{stat.base_stat}</span>
                            <div className="flex-1 bg-gray-800 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${stat.base_stat >= 100 ? 'bg-green-500' : stat.base_stat >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${fillPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                No competitive build data available.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}