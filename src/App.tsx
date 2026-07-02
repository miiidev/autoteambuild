// src/App.tsx
import { useState, useEffect, useRef } from "react";
import PokemonGrid from "./components/PokemonGrid";
import PokemonSprite from "./components/PokemonSprite";
import { optimizeTeam, type OptimizedTeamResult } from "./lib/teamOptimizer";
import IconButton from "@mui/material/IconButton";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import { getTacticalAdvice } from "./lib/tacticalAdvisor";

import { animate, stagger } from "animejs";

const TYPE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  Normal: { bg: "bg-[#A0A29F]", border: "border-[#737573]", icon: "/icons/normal.svg" },
  Fire: { bg: "bg-[#E72324]", border: "border-[#AB1A1A]", icon: "/icons/fire.svg" },
  Water: { bg: "bg-[#2481F0]", border: "border-[#1A61B5]", icon: "/icons/water.svg" },
  Electric: { bg: "bg-[#FAC100]", border: "border-[#BD9200]", icon: "/icons/electric.svg" },
  Grass: { bg: "bg-[#3DA224]", border: "border-[#2D781A]", icon: "/icons/grass.svg" },
  Ice: { bg: "bg-[#3DD9FF]", border: "border-[#2DA3BF]", icon: "/icons/ice.svg" },
  Fighting: { bg: "bg-[#FF8100]", border: "border-[#BF6100]", icon: "/icons/fighting.svg" },
  Poison: { bg: "bg-[#923FCC]", border: "border-[#6E2F99]", icon: "/icons/poison.svg" },
  Ground: { bg: "bg-[#92501B]", border: "border-[#6E3C14]", icon: "/icons/ground.svg" },
  Flying: { bg: "bg-[#82BAEF]", border: "border-[#628CB5]", icon: "/icons/flying.svg" },
  Psychic: { bg: "bg-[#EF3F7A]", border: "border-[#B52F5C]", icon: "/icons/psychic.svg" },
  Bug: { bg: "bg-[#92A212]", border: "border-[#6E7A0D]", icon: "/icons/bug.svg" },
  Rock: { bg: "bg-[#B0AB82]", border: "border-[#858162]", icon: "/icons/rock.svg" },
  Ghost: { bg: "bg-[#713F71]", border: "border-[#542F54]", icon: "/icons/ghost.svg" },
  Dragon: { bg: "bg-[#4F60E2]", border: "border-[#3B48A8]", icon: "/icons/dragon.svg" },
  Dark: { bg: "bg-[#4F3F3D]", border: "border-[#3B2F2E]", icon: "/icons/dark.svg" },
  Steel: { bg: "bg-[#60A2B9]", border: "border-[#487A8C]", icon: "/icons/steel.svg" },
  Fairy: { bg: "bg-[#EF71F0]", border: "border-[#B555B5]", icon: "/icons/fairy.svg" },
};

const loadMoveCache = () => {
  try {
    const saved = localStorage.getItem("vgc-move-cache");
    return saved ? new Map<string, string>(JSON.parse(saved)) : new Map<string, string>();
  } catch {
    return new Map<string, string>();
  }
};

const moveTypeCache = loadMoveCache();

function MoveItem({ moveName, isDark }: { moveName: string; isDark: boolean }) {
  const [moveType, setMoveType] = useState<string>("Normal");

  useEffect(() => {
    const cleanName = moveName.toLowerCase().replace(/[\s_]+/g, "-");
    if (moveTypeCache.has(cleanName)) {
      setMoveType(moveTypeCache.get(cleanName)!);
      return;
    }
    fetch(`https://pokeapi.co/api/v2/move/${cleanName}`)
      .then((res) => {
        if (!res.ok) throw new Error("Move not found");
        return res.json();
      })
      .then((data) => {
        const type = data.type.name;
        const formattedType = type.charAt(0).toUpperCase() + type.slice(1);
        moveTypeCache.set(cleanName, formattedType);
        setMoveType(formattedType);
      })
      .catch(() => {
        console.warn(`Could not fetch type for move: ${moveName}`);
      });
  }, [moveName]);

  const style = TYPE_COLORS[moveType] || TYPE_COLORS["Normal"];

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg border ${style.border} ${style.bg} bg-opacity-10`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${style.bg} shadow-sm`}>
        <img src={style.icon} alt={moveType} className="w-4 h-4 drop-shadow-sm brightness-0 invert" />
      </div>
      <span className={`font-bold text-sm capitalize ${isDark ? "text-slate-200" : "text-gray-800"}`}>
        {moveName.replace(/-/g, " ")}
      </span>
    </div>
  );
}

export default function App() {
  const [sandboxBox, setSandboxBox] = useState<string[]>([]);
  const [optimizedStrategies, setOptimizedStrategies] = useState<OptimizedTeamResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedInspectPokemon, setSelectedInspectPokemon] = useState<any | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);

  const navbarRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  const appContainerRef = useRef<HTMLDivElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);

  const isDark = theme === "dark";

  // 4. ANIME.JS: Smooth Theme Switch & Button Spin
  useEffect(() => {
    // Animate the main container's background and text colors
    if (appContainerRef.current) {
      animate(appContainerRef.current, {
        backgroundColor: isDark ? "#020617" : "#f8fafc",
        color: isDark ? "#f1f5f9" : "#1e293b",
        duration: 600,
        easing: "easeInOutSine",
      });
    }

    // Animate the toggle button
    if (themeButtonRef.current) {
      animate(themeButtonRef.current, {
        rotate: isDark ? [-180, 0] : [180, 0],
        scale: [0.5, 1],
        duration: 600,
        easing: "easeOutBack",
      });
    }
  }, [isDark]);

  // Auto-hide navbar logic mapping
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) {
        setIsNavbarVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsNavbarVisible(false);
      } else {
        setIsNavbarVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 1. ANIME.JS: Navbar Disappear/Reappear Translation Engine
  useEffect(() => {
    if (navbarRef.current) {
      animate(navbarRef.current, {
        translateY: isNavbarVisible ? 0 : -110,
        duration: 350,
        easing: "easeOutQuad",
      });
    }
  }, [isNavbarVisible]);

  // 2. ANIME.JS: Staggered Cascade Entry Animation for Meta Strategy Cards
  useEffect(() => {
    if (optimizedStrategies.length > 0 && !isOptimizing) {
      // Ensure elements are in the DOM before animating
      setTimeout(() => {
        animate(".strategy-card", {
          opacity: [0, 1],
          translateY: [24, 0],
          scale: [0.98, 1],
          delay: stagger(120),
          duration: 500,
          easing: "easeOutCubic",
        });
      }, 50);
    }
  }, [optimizedStrategies, isOptimizing]);

  // 3. ANIME.JS: Spring Physics Matrix Pop for Inspect Modal
  useEffect(() => {
    if (selectedInspectPokemon) {
      animate(".modal-backdrop", {
        opacity: [0, 1],
        duration: 200,
        easing: "easeOutQuad",
      });

      animate(".modal-content", {
        scale: [0.92, 1],
        opacity: [0, 1],
        duration: 450,
        easing: "easeOutBack",
      });
    }
  }, [selectedInspectPokemon]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

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

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(async () => {
        try {
          const results = await optimizeTeam(sandboxBox);
          setOptimizedStrategies(results);
        } catch (err: any) {
          setErrorMessage(err.message || "An error occurred during Beam Search optimization.");
        } finally {
          setIsOptimizing(false);
        }
      }, 600);
    }, 50);
  };

  const exportShowdownText = (team: any[]) => {
    const text = team
      .map((p) => {
        const build = p.build;
        if (!build) return `${p.name} @ Leftovers\nAbility: Unknown\nEVs: 252 HP / 252 Spe\nHardy Nature\n- Protect`;
        return `${p.name} @ ${build.item}\nAbility: ${build.ability}\nEVs: ${build.evs}\n${build.nature} Nature\n${build.moves.map((m: string) => `- ${m}`).join("\n")}`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text);
    alert("Copied Champions Team to clipboard!");
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      {/* 🏝️ FLOATING ISLAND NAVBAR WITH ANIME.JS TRANSLATION MANAGEMENT */}
      <nav ref={navbarRef} className="sticky top-4 z-40 px-4 sm:px-6 will-change-transform">
        <div className={`max-w-7xl mx-auto flex justify-between items-center gap-4 backdrop-blur-lg rounded-full shadow-lg shadow-slate-900/5 px-4 py-2.5 sm:px-5 border ${isDark ? "bg-slate-900/80 border-slate-800/80" : "bg-white/80 border-slate-200/70"}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0">
              <img src="/pokeball.svg" alt="pokeball icon" className={isDark ? "brightness-90" : ""} />
            </div>
            <span className={`text-base sm:text-lg font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              autoteambuild
            </span>
          </div>

          <IconButton
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            size="small"
            sx={{
              width: 36,
              height: 36,
              borderRadius: "9999px",
              backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
              color: isDark ? "#facc15" : "#475569",
              transition: "background-color 0.2s, color 0.2s",
              "&:hover": { backgroundColor: isDark ? "#334155" : "#e2e8f0" },
            }}
          >
            {isDark ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
          </IconButton>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* 🏆 UNIFIED RESULTS CONTAINER */}
        <div ref={resultsRef} className={`rounded-3xl p-6 sm:p-8 border shadow-inner scroll-mt-24 transition-colors duration-300 flex flex-col max-h-[800px] ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-100/50 border-slate-200"}`}>
          <h2 className={`text-xl font-black mb-6 flex items-center gap-2 shrink-0 ${isDark ? "text-white" : "text-slate-900"}`}>
            <span>📊</span> Meta Draft Analysis
          </h2>

          {/* 📜 SCROLLABLE WRAPPER REGION */}
          <div className="flex-1 max-h-[620px] overflow-y-auto pr-2 custom-scrollbar">
            {isOptimizing ? (
              <div className={`border rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[350px] space-y-6 animate-pulse ${isDark ? "bg-slate-950 border-indigo-900/50" : "bg-white border-indigo-100"}`}>
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className={`absolute inset-0 border-4 rounded-full ${isDark ? "border-indigo-950" : "border-indigo-100"}`}></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-2xl animate-bounce">⚙️</span>
                </div>
                <div className="text-center space-y-2">
                  <h3 className={`text-sm font-black tracking-wider uppercase ${isDark ? "text-slate-200" : "text-slate-900"}`}>Executing Beam Search Matrix</h3>
                  <p className={`text-xs max-w-md leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>Evaluating dynamic ability counters, mapping defensive type coverage weights, and optimizing active synergy configurations...</p>
                </div>
                <div className={`w-64 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                  <div className="bg-indigo-600 h-full w-2/3 rounded-full animate-[loading_1.5s_ease-in-out_infinite]"></div>
                </div>
              </div>
            ) : optimizedStrategies.length > 0 ? (
              <div className="space-y-6">
                {optimizedStrategies.map((strategy, index) => {
                  const evaluation = strategy.evaluation;
                  const baseEvalScore = evaluation?.score || 0;
                  const uniqueTypesList = evaluation?.uniqueTypes || [];
                  const uniqueTypesCount = uniqueTypesList.length;
                  const synergyScore = strategy.score - baseEvalScore;
                  const breakdownLogs = evaluation?.breakdown || [];
                  const tacticalAdvice = getTacticalAdvice(strategy.team);

                  return (
                    // Added .strategy-card and opacity-0 for Anime.js selection orchestration
                    <div key={`${strategy.archetype}-${index}`} className={`strategy-card opacity-0 rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow duration-200 ${isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}>
                      <div className={`flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 mb-6 gap-4 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                        <div>
                          <h3 className="text-base font-black text-indigo-500 uppercase tracking-wider">{strategy.archetype.replace("_", " ")} CORE (Variant {index + 1})</h3>
                          <p className={`text-xs font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Composite Rating: <span className="text-indigo-500 font-black font-mono text-sm">{strategy.score}</span></p>
                        </div>
                        <button onClick={() => exportShowdownText(strategy.team)} className="text-[11px] bg-slate-900 text-white px-3 py-2 rounded-xl hover:bg-slate-800 font-bold tracking-wide transition shadow-sm self-start sm:self-center dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">Copy Showdown Text</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className={`border rounded-xl p-4 shadow-sm ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>🛡️ Defensive Core Types</span>
                            <span className={`text-xs font-bold font-mono ${isDark ? "text-slate-300" : "text-slate-700"}`}>{uniqueTypesCount} Unique</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (uniqueTypesCount / 18) * 100)}%` }} />
                          </div>
                          <p className={`text-[10px] mt-2 truncate w-full ${isDark ? "text-slate-500" : "text-slate-400"}`}>Coverage: {uniqueTypesList.join(', ')}</p>
                        </div>

                        <div className={`border rounded-xl p-4 shadow-sm ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>🤝 Mechanical Synergy</span>
                            <span className={`text-xs font-bold font-mono ${isDark ? "text-slate-300" : "text-slate-700"}`}>{Math.round(synergyScore)} pts</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, synergyScore))}%` }} />
                          </div>
                          <p className={`text-[10px] mt-2 truncate w-full ${isDark ? "text-slate-500" : "text-slate-400"}`}>Calculated from abilities, items, movesets, and field mechanics.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        {strategy.team.map((member) => (
                          <div key={member.name} onClick={() => setSelectedInspectPokemon(member)} className={`border rounded-xl p-3 flex flex-col items-center cursor-pointer transition-colors duration-200 group relative shadow-sm ${isDark ? "bg-slate-900 border-slate-800 hover:border-indigo-500 hover:bg-indigo-900/20" : "bg-slate-50 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50"}`}>
                            {member.isAutoGenerated && <span className="absolute top-1 right-1 text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">Auto</span>}
                            <div className="h-16 flex items-end justify-center mb-2">
                              <PokemonSprite displayName={member.name} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-200" />
                            </div>
                            <span className={`text-xs font-bold truncate w-full text-center ${isDark ? "text-slate-200" : "text-slate-800"}`}>{member.name}</span>
                            <span className="text-[10px] text-slate-400 truncate w-full text-center mt-0.5">{member.build?.item || "No Item"}</span>
                          </div>
                        ))}
                      </div>

                      <div className={`mt-6 border rounded-xl p-5 ${isDark ? "bg-indigo-950/20 border-indigo-900/30" : "bg-indigo-50/30 border-indigo-50"}`}>
                        <h4 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? "text-indigo-400" : "text-indigo-900"}`}><span>🤖</span> Coach's Tactical Playbook</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Winning Positions & Counters</h5>
                            <ul className="space-y-3">
                              {tacticalAdvice.map((strat, i) => (
                                <li key={i} className={`p-3 rounded-xl border shadow-sm relative overflow-hidden ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                                  <div className={`absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[9px] font-bold uppercase text-white ${strat.category === 'Lead' ? 'bg-indigo-500' : strat.category === 'Pair' ? 'bg-emerald-500' : strat.category === 'Speed' ? 'bg-sky-500' : strat.category === 'Counter' ? 'bg-rose-500' : strat.category === 'Gap' ? 'bg-amber-500' : 'bg-slate-500'}`}>{strat.category}</div>
                                  <h6 className={`text-xs font-bold flex items-center gap-1.5 mb-1 ${isDark ? "text-slate-200" : "text-slate-800"}`}><span>{strat.icon}</span> {strat.title}</h6>
                                  <p className={`text-[11px] leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>{strat.desc}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Algorithm Evaluation Logs</h5>
                            <div className="bg-slate-900 rounded-xl p-3.5 h-full max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner text-[11px] font-mono">
                              {breakdownLogs.length > 0 ? breakdownLogs.map((log: string, i: number) => {
                                const isPositive = log.includes("+");
                                const isNegative = log.includes("-");
                                return <div key={i} className={`mb-1 ${isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-slate-400"}`}>{`> ${log}`}</div>;
                              }) : <div className="text-slate-500 italic">No detailed logs generated for this configuration.</div>}
                              <div className="text-indigo-400 mt-2 border-t border-slate-800 pt-2 font-bold">{`> ${synergyScore >= 0 ? '+' : ''}${Math.round(synergyScore)} Mechanical Synergy Applied`}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`border rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[250px] border-dashed transition-all duration-300 ${isDark ? "bg-slate-900/30 border-slate-800" : "bg-slate-50/50 border-slate-200"}`}>
                <span className="text-4xl opacity-60 mb-4 hover:animate-pulse cursor-default transition-all duration-300">💤</span>
                <h3 className={`text-sm font-bold tracking-wider uppercase mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Awaiting Sandbox Data</h3>
                <p className={`text-xs max-w-sm text-center leading-relaxed ${isDark ? "text-slate-600" : "text-slate-500"}`}>Select at least 6 Pokémon in your workbench and click "Optimize Team" to generate synergy analysis and meta team cores.</p>
              </div>
            )}
          </div>

          {/* 📌 FIXED CONTROL FOOTER BAR */}
          <div className={`mt-6 pt-6 flex items-center justify-end gap-3 border-t shrink-0 ${isDark ? "border-slate-800/80" : "border-slate-200"}`}>
            <button
              onClick={handleClearBox}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"}`}
            >
              Clear Workbench
            </button>
            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing || sandboxBox.length < 6}
              className={`px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 ${isOptimizing || sandboxBox.length < 6 ? (isDark ? "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed shadow-none" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none") : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-500/20"}`}
            >
              {isOptimizing ? "Running Optimization..." : "Optimize Team"}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className={`border-l-4 p-4 rounded-xl shadow-sm font-medium text-sm ${isDark ? "bg-red-950/40 border-red-500 text-red-300" : "bg-red-50 border-red-500 text-red-700"}`}>
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[620px]">
          {/* LEFT: Pokédex Grid */}
          <div className={`lg:col-span-2 h-[500px] lg:h-full rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-colors duration-300 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <PokemonGrid onSelect={handleAddPokemon} isDark={isDark} />
          </div>

          {/* RIGHT: Sandbox Workbench */}
          <div className={`border rounded-2xl p-5 shadow-sm flex flex-col h-[500px] lg:h-full overflow-hidden transition-colors duration-300 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <h2 className={`text-sm font-black tracking-wider uppercase flex items-center gap-2 mb-4 shrink-0 ${isDark ? "text-slate-200" : "text-slate-900"}`}>
              <span>🧰</span> Drafting Workbench ({sandboxBox.length}/50)
            </h2>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2.5 flex-1 content-start overflow-y-auto pr-1 pb-2 custom-scrollbar">
              {Array.from({ length: 50 }).map((_, i) => {
                const pokemonName = sandboxBox[i];
                return (
                  <div
                    key={i}
                    onClick={() => pokemonName && handleRemovePokemon(pokemonName)}
                    className={`relative h-24 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${pokemonName ? (isDark ? "bg-slate-950 border-indigo-500 cursor-pointer hover:bg-red-950/40 hover:border-red-500 shadow-sm group" : "bg-slate-50 border-indigo-400 cursor-pointer hover:bg-red-50 hover:border-red-400 shadow-sm group") : (isDark ? "bg-slate-950/40 border-dashed border-slate-800" : "bg-slate-50/50 border-dashed border-slate-200")}`}
                  >
                    {pokemonName ? (
                      <>
                        <PokemonSprite displayName={pokemonName} className="max-h-14 z-10 pointer-events-none group-hover:scale-90 transition-transform" />
                        <div className="absolute inset-0 bg-red-500/90 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-20">
                          <span className="text-white font-extrabold text-[10px] tracking-wider">REMOVE</span>
                        </div>
                        <span className={`absolute bottom-1 w-full text-center text-[10px] font-bold truncate px-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          {pokemonName}
                        </span>
                      </>
                    ) : (
                      <span className={`text-xl font-black ${isDark ? "text-slate-800" : "text-slate-200"}`}>?</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* INSPECT MODAL MODIFIED WITH TARGETING CLASSES FOR ANIME.JS */}
      {selectedInspectPokemon && (
        <div className="modal-backdrop fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 opacity-0">
          <div className={`modal-content opacity-0 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl transition-colors duration-300 ${isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-800"}`}>
            <div className="bg-slate-950 p-5 flex justify-between items-center text-white border-b border-slate-800">
              <div className="flex items-center gap-4">
                <PokemonSprite displayName={selectedInspectPokemon.name} className="w-16 h-16 object-contain drop-shadow-md" />
                <div>
                  <h2 className="text-xl font-black tracking-tight">{selectedInspectPokemon.name}</h2>
                  <div className="flex gap-1.5 mt-1">
                    {selectedInspectPokemon.types.map((type: string) => {
                      const formattedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
                      const t = TYPE_COLORS[formattedType] || TYPE_COLORS.Normal;
                      return (
                        <span key={type} className={`${t.bg} ${t.border} text-white text-[9px] font-black px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1`}>
                          <img src={t.icon} alt={formattedType} className="w-2.5 h-2.5 drop-shadow-sm brightness-0 invert" />
                          {formattedType}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedInspectPokemon(null)} className="text-slate-400 hover:text-white text-2xl transition duration-200">&times;</button>
            </div>

            <div className="p-6">
              {selectedInspectPokemon.build ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Equipment Parameters</h4>
                      <div className={`rounded-xl p-3 border text-xs font-semibold ${isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-700"}`}>
                        <div className={`flex justify-between border-b pb-1.5 mb-1.5 ${isDark ? "border-slate-800" : "border-slate-100"}`}><span className="text-slate-400">Held Item</span><span>{selectedInspectPokemon.build.item}</span></div>
                        <div className={`flex justify-between border-b pb-1.5 mb-1.5 ${isDark ? "border-slate-800" : "border-slate-100"}`}><span className="text-slate-400">Signature Ability</span><span className="capitalize">{selectedInspectPokemon.build.ability.replace("-", " ")}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Nature Attribute</span><span>{selectedInspectPokemon.build.nature}</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Active Moveset Matrix</h4>
                      <div className="grid grid-cols-1 gap-1.5">
                        {selectedInspectPokemon.build.moves.map((moveName: string, i: number) => <MoveItem key={i} moveName={moveName} isDark={isDark} />)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">EV Spread Index</h4>
                      <div className={`border rounded-xl p-3 text-xs font-mono font-bold text-center ${isDark ? "bg-indigo-950/40 text-indigo-300 border-indigo-900/50" : "bg-indigo-50/50 text-indigo-950 border-indigo-100"}`}>
                        {selectedInspectPokemon.build.evs}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Base Statistics Matrix</h4>
                      <div className={`rounded-xl p-4 border space-y-2 ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                        {selectedInspectPokemon.stats?.map((stat: any) => {
                          const fillPercentage = Math.min(100, (stat.base_stat / 255) * 100);
                          const statLabels: Record<string, string> = { hp: "HP", attack: "ATK", defense: "DEF", "special-attack": "SPA", "special-defense": "SPD", speed: "SPE" };
                          return (
                            <div key={stat.name} className="flex items-center text-[11px] font-mono">
                              <span className="w-10 text-slate-400">{statLabels[stat.name] || stat.name}</span>
                              <span className={`w-8 text-right mr-3 font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{stat.base_stat}</span>
                              <div className={`flex-1 h-2 rounded-full overflow-hidden shadow-inner ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                                <div className={`h-full rounded-full ${stat.base_stat >= 100 ? 'bg-emerald-500' : stat.base_stat >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${fillPercentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-12 text-center text-xs border border-dashed rounded-xl ${isDark ? "bg-slate-950 border-slate-800 text-slate-500" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
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