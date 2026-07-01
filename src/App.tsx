// src/App.tsx
import { useState } from "react";
import PokemonGrid from "./components/PokemonGrid";
import PokemonSprite from "./components/PokemonSprite"; // 🌟 NEW: Imported the smart sprite component
import { optimizeTeam, type OptimizedTeamResult } from "./lib/teamOptimizer";

// 🎨 GOAL 4: 18-Element Thematic UI Mapping
const TYPE_COLORS: Record<string, { bg: string; border: string; emoji: string }> = {
  Normal: { bg: "bg-[#A8A77A]", border: "border-[#8A8A59]", emoji: "⚪" },
  Fire: { bg: "bg-[#EE8130]", border: "border-[#C66320]", emoji: "🔥" },
  Water: { bg: "bg-[#6390F0]", border: "border-[#4A7AD6]", emoji: "💧" },
  Electric: { bg: "bg-[#F7D02C]", border: "border-[#D4AF21]", emoji: "⚡" },
  Grass: { bg: "bg-[#7AC74C]", border: "border-[#5E9E3A]", emoji: "🌿" },
  Ice: { bg: "bg-[#96D9D6]", border: "border-[#74B3B0]", emoji: "❄️" },
  Fighting: { bg: "bg-[#C22E28]", border: "border-[#99221D]", emoji: "🥊" },
  Poison: { bg: "bg-[#A33EA1]", border: "border-[#7C2D7A]", emoji: "☠️" },
  Ground: { bg: "bg-[#E2BF65]", border: "border-[#B89A50]", emoji: "⛰️" },
  Flying: { bg: "bg-[#A98FF3]", border: "border-[#856DCC]", emoji: "💨" },
  Psychic: { bg: "bg-[#F95587]", border: "border-[#C9426B]", emoji: "🔮" },
  Bug: { bg: "bg-[#A6B91A]", border: "border-[#829114]", emoji: "🐛" },
  Rock: { bg: "bg-[#B6A136]", border: "border-[#8F7E2A]", emoji: "🪨" },
  Ghost: { bg: "bg-[#735797]", border: "border-[#574173]", emoji: "👻" },
  Dragon: { bg: "bg-[#6F35FC]", border: "border-[#5629C4]", emoji: "🐉" },
  Dark: { bg: "bg-[#705746]", border: "border-[#544134]", emoji: "🌙" },
  Steel: { bg: "bg-[#B7B7CE]", border: "border-[#9292A6]", emoji: "⚙️" },
  Fairy: { bg: "bg-[#D685AD]", border: "border-[#B06B8D]", emoji: "✨" },
};

// Smart fallback to guess a Move's Type based on name if we don't have a DB for it
const guessMoveType = (moveName: string): string => {
  const name = moveName.toLowerCase();
  if (name.includes("fire") || name.includes("flame") || name.includes("heat") || name.includes("flare")) return "Fire";
  if (name.includes("water") || name.includes("hydro") || name.includes("aqua") || name.includes("surf")) return "Water";
  if (name.includes("thunder") || name.includes("volt") || name.includes("electro") || name.includes("zap")) return "Electric";
  if (name.includes("grass") || name.includes("leaf") || name.includes("wood") || name.includes("solar")) return "Grass";
  if (name.includes("ice") || name.includes("blizzard") || name.includes("frost") || name.includes("snow")) return "Ice";
  if (name.includes("draco") || name.includes("dragon") || name.includes("outrage")) return "Dragon";
  if (name.includes("dark") || name.includes("crunch") || name.includes("sucker") || name.includes("foul")) return "Dark";
  if (name.includes("moon") || name.includes("fairy") || name.includes("play rough") || name.includes("dazzling")) return "Fairy";
  if (name.includes("psychic") || name.includes("zen") || name.includes("mind") || name.includes("psyshock")) return "Psychic";
  if (name.includes("shadow") || name.includes("ghost") || name.includes("phantom") || name.includes("poltergeist")) return "Ghost";
  if (name.includes("protect") || name.includes("fake out") || name.includes("extreme speed")) return "Normal";
  return "Normal"; // Default fallback
};

// 🧠 PHASE 5: Comprehensive Tactical Strategy & Pairing Guide
const getTacticalAdvice = (team: any[]) => {
  const advice: { category: string; icon: string; title: string; desc: string }[] = [];

  const findMove = (regex: RegExp) => team.filter(p => p.build?.moves.some((m: string) => m.toLowerCase().match(regex)));
  const findAbility = (regex: RegExp) => team.filter(p => p.build?.ability.toLowerCase().match(regex));

  const fakeOuts = findMove(/fake out/);
  const tailwinds = findMove(/tailwind/);
  const trickRooms = findMove(/trick room/);
  const weatherSetters = findAbility(/(drizzle|drought|snow warning|sand stream)/);
  const redirectors = findMove(/(follow me|rage powder)/);
  const intimids = findAbility(/intimidate/);
  const wideGuards = findMove(/wide guard/);
  const taunts = findMove(/taunt/);
  const swiftSwims = findAbility(/swift swim/);
  const chlorophylls = findAbility(/chlorophyll/);

  // --- 🏎️ LEADS ---
  if (fakeOuts.length > 0 && tailwinds.length > 0) {
    advice.push({ category: "Lead", icon: "🏎️", title: "Speed Control Lead", desc: `Lead ${fakeOuts[0].name} + ${tailwinds[0].name}. Use Fake Out to flinch a threat, ensuring Tailwind goes up safely.` });
  } else if (fakeOuts.length > 0 && trickRooms.length > 0) {
    advice.push({ category: "Lead", icon: "⏳", title: "Trick Room Lead", desc: `Lead ${fakeOuts[0].name} + ${trickRooms[0].name}. Use Fake Out to protect your setter while it reverses the turn order.` });
  }

  // --- 🤝 PAIRS ---
  if (weatherSetters.length > 0) {
    const setter = weatherSetters[0];
    const weather = setter.build.ability.toLowerCase();
    let abuser = null;

    if (weather === 'drizzle' && swiftSwims.length > 0) abuser = swiftSwims[0];
    if (weather === 'drought' && chlorophylls.length > 0) abuser = chlorophylls[0];

    if (abuser) {
      advice.push({ category: "Pair", icon: "🌦️", title: "Weather Core", desc: `Keep ${setter.name} in the back to pivot in, resetting the weather and doubling ${abuser.name}'s speed for a late-game sweep.` });
    } else {
      advice.push({ category: "Pair", icon: "🌤️", title: "Weather Control", desc: `Use ${setter.name} to disrupt your opponent's weather reliance and passively boost your team's elemental damage.` });
    }
  }

  if (redirectors.length > 0) {
    advice.push({ category: "Pair", icon: "🛡️", title: "Redirection Support", desc: `Pair ${redirectors[0].name} with your main glass cannon. Use Follow Me/Rage Powder to absorb single-target nukes so your attacker can strike freely.` });
  }

  if (intimids.length >= 2) {
    advice.push({ category: "Pair", icon: "🦁", title: "Intimidate Cycle", desc: `Cycle ${intimids[0].name} and ${intimids[1].name} in and out to repeatedly drop physical attack stats. Highly oppressive against physical teams.` });
  }

  // --- 🛑 COUNTERS ---
  if (wideGuards.length > 0) {
    advice.push({ category: "Counter", icon: "🛑", title: "Spread Move Blocker", desc: `${wideGuards[0].name}'s Wide Guard completely shuts down teams relying on Earthquake, Rock Slide, or Make It Rain.` });
  }
  if (taunts.length > 0) {
    advice.push({ category: "Counter", icon: "🤐", title: "Setup Disruption", desc: `${taunts[0].name}'s Taunt stops Amoonguss (Spore), prevents Trick Room setups, and breaks stall teams.` });
  }

  // Fallback
  if (advice.length === 0) {
    advice.push({ category: "General", icon: "⚖️", title: "Balanced Approach", desc: "No extreme meta-cores detected. Rely on your defensive type immunities to pivot safely." });
  }

  return advice;
};

export default function App() {
  const [sandboxBox, setSandboxBox] = useState<string[]>([]);
  const [optimizedStrategies, setOptimizedStrategies] = useState<OptimizedTeamResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedInspectPokemon, setSelectedInspectPokemon] = useState<any | null>(null);

  const handleAddPokemon = (name: string) => {
    setErrorMessage(null);
    if (sandboxBox.includes(name)) {
      setErrorMessage(`${name} is already inside your sandbox workbench box.`);
      return;
    }
    if (sandboxBox.length >= 50) {
      setErrorMessage("Your workbench box is full! Max limit is 50 entries.");
      return;
    }
    setSandboxBox([...sandboxBox, name]);
  };

  const handleRemovePokemon = (name: string) => {
    setSandboxBox(sandboxBox.filter((p) => p !== name));
    setErrorMessage(null);
  };

  const handleClearBox = () => {
    setSandboxBox([]);
    setOptimizedStrategies([]);
    setErrorMessage(null);
  };

  const handleRunOptimization = async () => {
    if (sandboxBox.length < 6) {
      setErrorMessage("You must select at least 6 Pokémon to initialize the Champions algorithm.");
      return;
    }

    setIsOptimizing(true);
    setErrorMessage(null);
    try {
      const results = await optimizeTeam(sandboxBox);
      setOptimizedStrategies(results);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during Beam Search optimization.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const exportShowdownText = (team: any[]) => {
    const text = team
      .map((p) => {
        const build = p.build;
        if (!build) return `${p.name} @ Leftovers\nAbility: Unknown\nEVs: 252 HP / 252 Spe\nHardy Nature\n- Protect`;
        return `${p.name} @ ${build.item}\nAbility: ${build.ability}\nTera Type: ${build.teraType}\nEVs: ${build.evs}\n${build.nature} Nature\n${build.moves.map((m: string) => `- ${m}`).join("\n")}`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text);
    alert("Copied Champions Team to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Pokémon Champions Sandbox</h1>
            <p className="text-blue-200 mt-1 text-sm font-medium">Phase 3: Live Meta Drafting & Synergy Analytics</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <button onClick={handleClearBox} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold backdrop-blur-sm transition">
              Clear Workbench
            </button>
            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing || sandboxBox.length < 6}
              className={`px-6 py-2 rounded-lg text-sm font-bold shadow-md transition ${isOptimizing || sandboxBox.length < 6
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-yellow-400 hover:bg-yellow-300 text-yellow-900"
                }`}
            >
              {isOptimizing ? "Running Beam Search..." : "Optimize Team"}
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm font-medium">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[600px]">
          {/* LEFT: Pokédex Grid */}
          <div className="lg:col-span-2 h-[500px] lg:h-full overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <PokemonGrid onSelect={handleAddPokemon} />
          </div>

          {/* RIGHT: Sandbox Workbench */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-[500px] lg:h-full overflow-hidden">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 shrink-0">
              <span>🧰</span> Drafting Workbench ({sandboxBox.length}/50)
            </h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3 flex-1 content-start overflow-y-auto pr-1 pb-2 custom-scrollbar">
              {Array.from({ length: 50 }).map((_, i) => {
                const pokemonName = sandboxBox[i];
                return (
                  <div
                    key={i}
                    onClick={() => pokemonName && handleRemovePokemon(pokemonName)}
                    className={`relative h-24 rounded-xl border-2 flex items-center justify-center transition-all ${pokemonName
                      ? "bg-blue-50 border-blue-400 cursor-pointer hover:bg-red-50 hover:border-red-400 shadow-inner group"
                      : "bg-gray-50 border-dashed border-gray-300"
                      }`}
                  >
                    {pokemonName ? (
                      <>
                        {/* 🌟 USED NEW COMPONENT FOR WORKBENCH SPRITES */}
                        <PokemonSprite
                          displayName={pokemonName}
                          className="max-h-14 z-10 pointer-events-none group-hover:scale-90 transition-transform"
                        />
                        <div className="absolute inset-0 bg-red-500/80 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                          <span className="text-white font-bold text-xs">REMOVE</span>
                        </div>
                        <span className="absolute bottom-1 w-full text-center text-[10px] font-bold text-blue-900 truncate px-1">
                          {pokemonName}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-300 text-2xl font-black">?</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RESULTS: Generated Teams */}
        {optimizedStrategies.length > 0 && (
          <div className="space-y-6 mt-8 animate-fade-in-up">
            <h2 className="text-2xl font-extrabold text-gray-800 border-b-2 border-gray-200 pb-2">
              Recommended Drafts
            </h2>
            {optimizedStrategies.map((strategy, index) => {
              const evaluation = strategy.evaluation;
              const baseEvalScore = evaluation?.score || 0;
              const uniqueTypesList = evaluation?.uniqueTypes || [];
              const uniqueTypesCount = uniqueTypesList.length;
              const synergyScore = strategy.score - baseEvalScore;
              const breakdownLogs = evaluation?.breakdown || [];
              const tacticalAdvice = getTacticalAdvice(strategy.team);

              return (
                <div key={`${strategy.archetype}-${index}`} className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-100 pb-4 mb-6 gap-4">
                    <div>
                      <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 uppercase">
                        {strategy.archetype.replace("_", " ")} CORE (Variant {index + 1})
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">
                        Total Composite Rating: <span className="text-green-600 font-extrabold font-mono text-base">{strategy.score}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => exportShowdownText(strategy.team)}
                      className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 transition self-start sm:self-center shadow"
                    >
                      Copy Showdown Text
                    </button>
                  </div>

                  {/* 📈 COMPREHENSIVE METRICS BREAKDOWN DASHBOARD */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">🛡️ Defensive Core Types</span>
                        <span className="text-sm font-bold font-mono text-gray-700">{uniqueTypesCount} Unique</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (uniqueTypesCount / 18) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 truncate w-full">
                        Coverage: {uniqueTypesList.join(', ')}
                      </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">🤝 Mechanical Synergy</span>
                        <span className="text-sm font-bold font-mono text-gray-700">{Math.round(synergyScore)} pts</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, synergyScore))}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 truncate w-full">
                        Calculated from abilities, items, movesets, and field mechanics.
                      </p>
                    </div>
                  </div>

                  {/* SIX-MAN ROSTER GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {strategy.team.map((member) => (
                      <div
                        key={member.name}
                        onClick={() => setSelectedInspectPokemon(member)}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col items-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors group relative shadow-sm"
                      >
                        {member.isAutoGenerated && (
                          <span className="absolute top-1 right-1 text-[10px] bg-yellow-200 text-yellow-800 px-1 rounded font-bold">Auto</span>
                        )}
                        <div className="h-16 flex items-end justify-center mb-2">
                          {/* 🌟 USED NEW COMPONENT FOR RESULTS GRID SPRITES */}
                          <PokemonSprite
                            displayName={member.name}
                            className="max-h-full object-contain group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-800 truncate w-full text-center">{member.name}</span>
                        <span className="text-[10px] text-gray-500 truncate w-full text-center mt-0.5">{member.build?.item || "No Item"}</span>
                      </div>
                    ))}
                  </div>

                  {/* --- 🧠 AI COACH: SYNERGY, PAIRS & COUNTERS --- */}
                  <div className="mt-6 bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span>🤖</span> Coach's Tactical Playbook
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Winning Positions & Counters</h5>
                        <ul className="space-y-3">
                          {tacticalAdvice.map((strat, i) => (
                            <li key={i} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                              <div className={`absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[9px] font-bold uppercase text-white ${strat.category === 'Lead' ? 'bg-indigo-500' :
                                strat.category === 'Pair' ? 'bg-emerald-500' :
                                  strat.category === 'Counter' ? 'bg-rose-500' : 'bg-gray-500'
                                }`}>
                                {strat.category}
                              </div>
                              <h6 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-1">
                                <span>{strat.icon}</span> {strat.title}
                              </h6>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {strat.desc}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Algorithm Evaluation Logs</h5>
                        <div className="bg-gray-900 rounded-lg p-3 h-full max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner text-xs font-mono">
                          {breakdownLogs.length > 0 ? (
                            breakdownLogs.map((log: string, i: number) => {
                              const isPositive = log.includes("+");
                              const isNegative = log.includes("-");
                              let colorClass = "text-gray-300";
                              if (isPositive) colorClass = "text-green-400";
                              if (isNegative) colorClass = "text-red-400";

                              return (
                                <div key={i} className={`mb-1 ${colorClass}`}>
                                  {`> ${log}`}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-gray-500 italic">No detailed logs generated for this configuration.</div>
                          )}
                          <div className="text-indigo-400 mt-2 border-t border-gray-700 pt-2">
                            {`> ${synergyScore >= 0 ? '+' : ''}${Math.round(synergyScore)} Mechanical Synergy Applied`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INSPECT MODAL */}
      {selectedInspectPokemon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-gray-900 p-5 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                {/* 🌟 USED NEW COMPONENT FOR MODAL SPRITE */}
                <PokemonSprite
                  displayName={selectedInspectPokemon.name}
                  className="w-16 h-16 object-contain drop-shadow-md"
                />
                <div>
                  <h2 className="text-2xl font-black">{selectedInspectPokemon.name}</h2>
                  <div className="flex gap-2 mt-1">
                    {selectedInspectPokemon.types.map((type: string) => {
                      const formattedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
                      const t = TYPE_COLORS[formattedType] || TYPE_COLORS.Normal;
                      return (
                        <span key={type} className={`${t.bg} ${t.border} text-white text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1`}>
                          {t.emoji} {formattedType}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedInspectPokemon(null)} className="text-gray-400 hover:text-white text-3xl transition">
                &times;
              </button>
            </div>

            <div className="p-6">
              {selectedInspectPokemon.build ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Equipment</h4>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-sm font-medium text-gray-700">
                        <div className="flex justify-between border-b pb-1 mb-1">
                          <span className="text-gray-500">Item</span>
                          <span>{selectedInspectPokemon.build.item}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1 mb-1">
                          <span className="text-gray-500">Ability</span>
                          <span className="capitalize">{selectedInspectPokemon.build.ability.replace("-", " ")}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1 mb-1">
                          <span className="text-gray-500">Nature</span>
                          <span>{selectedInspectPokemon.build.nature}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tera Type</span>
                          <span className="flex items-center gap-1 text-[11px] font-bold">
                            {TYPE_COLORS[selectedInspectPokemon.build.teraType]?.emoji} {selectedInspectPokemon.build.teraType}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Moveset</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedInspectPokemon.build.moves.map((move: string, i: number) => {
                          const moveType = guessMoveType(move);
                          const style = TYPE_COLORS[moveType] || TYPE_COLORS.Normal;
                          return (
                            <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${style.border} ${style.bg} bg-opacity-10`}>
                              <span className="text-lg">{style.emoji}</span>
                              <span className="font-bold text-gray-800 text-sm capitalize">{move.replace("-", " ")}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">EV Spread</h4>
                      <div className="bg-blue-50 text-blue-900 border border-blue-200 rounded-lg p-3 text-sm font-mono text-center">
                        {selectedInspectPokemon.build.evs}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Base Stats Matrix</h4>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2">
                        {selectedInspectPokemon.stats?.map((stat: any) => {
                          const fillPercentage = Math.min(100, (stat.base_stat / 255) * 100);
                          const statLabels: Record<string, string> = { hp: "HP", attack: "ATK", defense: "DEF", "special-attack": "SPA", "special-defense": "SPD", speed: "SPE" };

                          return (
                            <div key={stat.name} className="flex items-center text-xs font-mono">
                              <span className="w-10 text-gray-400">{statLabels[stat.name] || stat.name}</span>
                              <span className="w-8 text-right mr-3 font-bold text-gray-700">{stat.base_stat}</span>
                              <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                                <div
                                  className={`h-full rounded-full ${stat.base_stat >= 100 ? 'bg-green-500' : stat.base_stat >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                  style={{ width: `${fillPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  No detailed competitive build data available for this placeholder.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}