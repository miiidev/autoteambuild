// src/lib/tacticalAdvisor.ts
//
// 🧠 Tactical Advisor
// Analyzes a drafted doubles team and produces coaching notes: leads, pairs,
// counters, speed-control reads, and gaps worth shoring up.
//
// This replaces the old inline getTacticalAdvice(). Two things changed on
// purpose vs. the old version:
//   1. Detection is broader — it also looks at type-weakness overlap, missing
//      Protect coverage, and conflicting speed-control tools, not just a
//      handful of move/ability combos.
//   2. Each finding has 2-3 phrasing variants. A variant is picked
//      deterministically from a hash of the Pokémon involved, so the same
//      team always reads the same way (no flicker on re-render), but two
//      different teams hitting the same synergy won't read like a mail-merge.

export interface TeamMember {
    name: string;
    types?: string[];
    build?: {
        ability?: string;
        item?: string;
        nature?: string;
        evs?: string;
        moves?: string[];
    } | null;
    [key: string]: any;
}

export type AdviceCategory = "Lead" | "Pair" | "Speed" | "Counter" | "Gap" | "General";

export interface TacticalNote {
    category: AdviceCategory;
    icon: string;
    title: string;
    desc: string;
}

// ---------------------------------------------------------------------------
// Small deterministic helpers — keep phrasing varied without being random
// on every render.
// ---------------------------------------------------------------------------

function hashSeed(seed: string): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return h;
}

function pick<T>(options: T[], seed: string): T {
    return options[hashSeed(seed) % options.length];
}

const norm = (s: string) => s.toLowerCase().replace(/[-_]/g, " ").trim();

function hasAnyMove(p: TeamMember, needles: string[]): boolean {
    const moves = p.build?.moves ?? [];
    return moves.some((m) => needles.some((n) => norm(m).includes(n)));
}

function hasAbility(p: TeamMember, needles: string[]): boolean {
    const ability = p.build?.ability;
    if (!ability) return false;
    return needles.some((n) => norm(ability).includes(n));
}

function findByMove(team: TeamMember[], needles: string[]): TeamMember[] {
    return team.filter((p) => hasAnyMove(p, needles));
}

function findByAbility(team: TeamMember[], needles: string[]): TeamMember[] {
    return team.filter((p) => hasAbility(p, needles));
}

// ---------------------------------------------------------------------------
// Compact type effectiveness chart, used for the shared-weakness scan below.
// Attacker-oriented: se = super effective against, nv = not very effective
// against, ne = no effect against. Unlisted defending types are neutral (1x).
// ---------------------------------------------------------------------------

type PType =
    | "Normal" | "Fire" | "Water" | "Electric" | "Grass" | "Ice" | "Fighting"
    | "Poison" | "Ground" | "Flying" | "Psychic" | "Bug" | "Rock" | "Ghost"
    | "Dragon" | "Dark" | "Steel" | "Fairy";

const ALL_TYPES: PType[] = [
    "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison",
    "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark",
    "Steel", "Fairy",
];

const CHART: Record<PType, { se?: PType[]; nv?: PType[]; ne?: PType[] }> = {
    Normal: { nv: ["Rock", "Steel"], ne: ["Ghost"] },
    Fire: { se: ["Grass", "Ice", "Bug", "Steel"], nv: ["Fire", "Water", "Rock", "Dragon"] },
    Water: { se: ["Fire", "Ground", "Rock"], nv: ["Water", "Grass", "Dragon"] },
    Electric: { se: ["Water", "Flying"], nv: ["Electric", "Grass", "Dragon"], ne: ["Ground"] },
    Grass: { se: ["Water", "Ground", "Rock"], nv: ["Fire", "Grass", "Poison", "Flying", "Bug", "Dragon", "Steel"] },
    Ice: { se: ["Grass", "Ground", "Flying", "Dragon"], nv: ["Fire", "Water", "Ice", "Steel"] },
    Fighting: { se: ["Normal", "Ice", "Rock", "Dark", "Steel"], nv: ["Poison", "Flying", "Psychic", "Bug", "Fairy"], ne: ["Ghost"] },
    Poison: { se: ["Grass", "Fairy"], nv: ["Poison", "Ground", "Rock", "Ghost"], ne: ["Steel"] },
    Ground: { se: ["Fire", "Electric", "Poison", "Rock", "Steel"], nv: ["Grass", "Bug"], ne: ["Flying"] },
    Flying: { se: ["Grass", "Fighting", "Bug"], nv: ["Electric", "Rock", "Steel"] },
    Psychic: { se: ["Fighting", "Poison"], nv: ["Psychic", "Steel"], ne: ["Dark"] },
    Bug: { se: ["Grass", "Psychic", "Dark"], nv: ["Fire", "Fighting", "Poison", "Flying", "Ghost", "Steel", "Fairy"] },
    Rock: { se: ["Fire", "Ice", "Flying", "Bug"], nv: ["Fighting", "Ground", "Steel"] },
    Ghost: { se: ["Psychic", "Ghost"], nv: ["Dark"], ne: ["Normal"] },
    Dragon: { se: ["Dragon"], nv: ["Steel"], ne: ["Fairy"] },
    Dark: { se: ["Psychic", "Ghost"], nv: ["Fighting", "Dark", "Fairy"] },
    Steel: { se: ["Ice", "Rock", "Fairy"], nv: ["Fire", "Water", "Electric", "Steel"] },
    Fairy: { se: ["Fighting", "Dragon", "Dark"], nv: ["Fire", "Poison", "Steel"] },
};

function typeMultiplier(attack: PType, defend: PType): number {
    const c = CHART[attack];
    if (!c) return 1;
    if (c.ne?.includes(defend)) return 0;
    if (c.se?.includes(defend)) return 2;
    if (c.nv?.includes(defend)) return 0.5;
    return 1;
}

function comboMultiplier(attack: PType, defendTypes: PType[]): number {
    return defendTypes.reduce((mult, t) => mult * typeMultiplier(attack, t), 1);
}

function toPType(t: string): PType | null {
    const formatted = (t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()) as PType;
    return ALL_TYPES.includes(formatted) ? formatted : null;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function getTacticalAdvice(team: TeamMember[]): TacticalNote[] {
    const advice: TacticalNote[] = [];
    if (!team || team.length === 0) return advice;

    const fakeOuts = findByMove(team, ["fake out"]);
    const tailwinds = findByMove(team, ["tailwind"]);
    const trickRooms = findByMove(team, ["trick room"]);
    const redirectors = findByMove(team, ["follow me", "rage powder"]);
    const wideGuards = findByMove(team, ["wide guard"]);
    const quickGuards = findByMove(team, ["quick guard"]);
    const taunts = findByMove(team, ["taunt"]);
    const screeners = findByMove(team, ["reflect", "light screen", "aurora veil"]);
    const perishSongs = findByMove(team, ["perish song"]);
    const protectors = findByMove(team, [
        "protect", "detect", "spiky shield", "king's shield", "kings shield",
        "baneful bunker", "obstruct", "silk trap", "burning bulwark",
    ]);
    const speedSpreads = findByMove(team, ["icy wind", "electroweb", "bulldoze"]);

    const weatherSetters = findByAbility(team, ["drizzle", "drought", "snow warning", "sand stream"]);
    const swiftSwims = findByAbility(team, ["swift swim"]);
    const chlorophylls = findByAbility(team, ["chlorophyll"]);
    const sandRush = findByAbility(team, ["sand rush"]);
    const slushRush = findByAbility(team, ["slush rush"]);
    const intimids = findByAbility(team, ["intimidate"]);
    const speedAbilities = findByAbility(team, ["unburden", "quick feet", "surge surfer"]);

    // --- 🏎️ LEADS ---------------------------------------------------------
    if (fakeOuts.length > 0 && tailwinds.length > 0) {
        const a = fakeOuts[0].name, b = tailwinds[0].name;
        advice.push({
            category: "Lead", icon: "🏎️", title: "Speed Control Lead",
            desc: pick([
                `Open with ${a} and ${b}. Flinch whatever threatens ${b}, then set Tailwind up for free the same turn.`,
                `${a} into ${b} is your safest Tailwind window — the flinch buys the turn you need to get speed control online.`,
                `Lead ${a} and ${b} together. A clean Fake Out flinch is usually all the cover Tailwind needs to go up unpunished.`,
            ], `lead-tw-${a}-${b}`),
        });
    } else if (fakeOuts.length > 0 && trickRooms.length > 0) {
        const a = fakeOuts[0].name, b = trickRooms[0].name;
        advice.push({
            category: "Lead", icon: "⏳", title: "Trick Room Lead",
            desc: pick([
                `Lead ${a} and ${b}. The Fake Out flinch covers ${b} on the turn it flips the field into slow-mode.`,
                `${a} protects ${b}'s Trick Room turn — start here when the matchup calls for reversed speed.`,
                `Pair ${a} with ${b} on lead. One flinch is often the difference between Trick Room going up clean or getting checked.`,
            ], `lead-tr-${a}-${b}`),
        });
    }

    if (fakeOuts.length >= 2) {
        const [a, b] = fakeOuts;
        advice.push({
            category: "Lead", icon: "👊", title: "Flexible Fake Out Leads",
            desc: pick([
                `${a.name} and ${b.name} both carry Fake Out, so you can rotate which one leads based on the opposing lead's bulk.`,
                `With Fake Out on both ${a.name} and ${b.name}, you're never locked into one lead pair — pick whichever flinch target matters more that game.`,
            ], `lead-fo2-${a.name}-${b.name}`),
        });
    }

    // --- 🤝 PAIRS -----------------------------------------------------------
    if (weatherSetters.length > 0) {
        const setter = weatherSetters[0];
        const weather = norm(setter.build?.ability || "");
        let abuser: TeamMember | null = null;
        if (weather === "drizzle" && swiftSwims.length > 0) abuser = swiftSwims[0];
        if (weather === "drought" && chlorophylls.length > 0) abuser = chlorophylls[0];
        if (weather === "sand stream" && sandRush.length > 0) abuser = sandRush[0];
        if (weather === "snow warning" && slushRush.length > 0) abuser = slushRush[0];

        if (abuser) {
            advice.push({
                category: "Pair", icon: "🌦️", title: "Weather Core",
                desc: pick([
                    `Keep ${setter.name} alive to reset the weather on demand — every refresh doubles ${abuser.name}'s Speed for a late-game sweep.`,
                    `${setter.name} and ${abuser.name} are a weather core: hold ${setter.name} back as a pivot, then bring it in to re-trigger the weather right before ${abuser.name} needs the boost.`,
                ], `pair-weather-${setter.name}-${abuser.name}`),
            });
        } else {
            advice.push({
                category: "Pair", icon: "🌤️", title: "Weather Control",
                desc: pick([
                    `${setter.name} lets you dictate the weather matchup — even without a dedicated abuser, it denies the opponent's own weather-reliant plans.`,
                    `Use ${setter.name} to overwrite the opponent's weather setup and passively shift damage rolls in your favor.`,
                ], `pair-weatherctrl-${setter.name}`),
            });
        }
    }

    if (redirectors.length > 0) {
        const r = redirectors[0];
        const partner = team.find((p) => p !== r && p.build?.item && norm(p.build.item).includes("choice"));
        const target = partner ?? team.find((p) => p !== r);
        advice.push({
            category: "Pair", icon: "🛡️", title: "Redirection Support",
            desc: target
                ? pick([
                    `Send ${r.name} in alongside ${target.name}. Follow Me/Rage Powder eats the single-target answer so ${target.name} swings freely.`,
                    `${r.name} is built to babysit ${target.name} — pull attacks onto itself so your hardest hitter doesn't have to play around chip damage.`,
                ], `pair-redir-${r.name}-${target.name}`)
                : `${r.name}'s redirection is strongest next to your hardest-hitting teammate — absorb the single-target answer so it can swing freely.`,
        });
    }

    if (intimids.length >= 2) {
        const [a, b] = intimids;
        advice.push({
            category: "Pair", icon: "🦁", title: "Intimidate Cycle",
            desc: pick([
                `Cycle ${a.name} and ${b.name} in and out of the back line to keep re-triggering Intimidate — physical attackers never get a clean turn.`,
                `${a.name} and ${b.name} both bring Intimidate, so repeated switches passively grind down any physical-attack matchup.`,
            ], `pair-intim-${a.name}-${b.name}`),
        });
    }

    if (screeners.length > 0) {
        const s = screeners[0];
        const hardHitter = team.find((p) => p !== s && p.build?.item && !norm(p.build.item).includes("leftovers"));
        advice.push({
            category: "Pair", icon: "🧊", title: "Screens Cover",
            desc: hardHitter
                ? pick([
                    `${s.name}'s screens buy the extra hit ${hardHitter.name} needs to survive and swing back.`,
                    `Set screens with ${s.name} early, then let ${hardHitter.name} play looser knowing incoming damage is halved.`,
                ], `pair-screens-${s.name}-${hardHitter.name}`)
                : `${s.name} can blunt an opposing spread-damage turn — time the screens for the turn you're most exposed.`,
        });
    }

    if (perishSongs.length > 0 && redirectors.length > 0) {
        const p = perishSongs[0], r = redirectors[0];
        advice.push({
            category: "Pair", icon: "☠️", title: "Perish Trap",
            desc: `${r.name} can hold the opponent in place while ${p.name} clicks Perish Song — a slow but very hard-to-escape win condition against stall or setup teams.`,
        });
    }

    // --- 🏃 SPEED CONTROL READS ---------------------------------------------
    if (tailwinds.length > 0 && trickRooms.length > 0) {
        advice.push({
            category: "Speed", icon: "⚖️", title: "Two Speed Plans, One Team",
            desc: `You're carrying both Tailwind and Trick Room. That's flexible across matchups, but decide which one you're leaning on before Turn 1 — running both mid-game usually cancels out your own plan.`,
        });
    } else if (
        tailwinds.length === 0 && trickRooms.length === 0 &&
        speedSpreads.length === 0 && speedAbilities.length === 0 &&
        swiftSwims.length === 0 && chlorophylls.length === 0
    ) {
        advice.push({
            category: "Speed", icon: "🐢", title: "No Dedicated Speed Control",
            desc: `Nothing on this team sets Tailwind, Trick Room, or a speed-boosting ability. That's fine against slower teams, but track EV speed tiers closely — you'll be relying on raw base speed and item choices matchup to matchup.`,
        });
    }

    // --- 🛑 COUNTERS ----------------------------------------------------------
    if (wideGuards.length > 0) {
        const w = wideGuards[0];
        advice.push({
            category: "Counter", icon: "🛑", title: "Spread Move Blocker",
            desc: pick([
                `${w.name}'s Wide Guard shuts the door on Earthquake, Rock Slide, and other spread damage aimed at your whole side.`,
                `Bring ${w.name} in against spread-move-heavy teams — Wide Guard turns their AoE turn into a free turn for you.`,
            ], `counter-wg-${w.name}`),
        });
    }
    if (quickGuards.length > 0) {
        const q = quickGuards[0];
        advice.push({
            category: "Counter", icon: "⚡", title: "Priority Shutdown",
            desc: `${q.name}'s Quick Guard stops opposing Fake Out and other priority cold — useful on the turn you need your slower attacker to land a hit first.`,
        });
    }
    if (taunts.length > 0) {
        const t = taunts[0];
        advice.push({
            category: "Counter", icon: "🤐", title: "Setup Disruption",
            desc: pick([
                `${t.name}'s Taunt shuts down Trick Room setters, sleep-inducers like Amoonguss, and stall plans before they start.`,
                `Bring ${t.name} in to Taunt away a setup turn — it's your answer to anything that wants to talk first and hit second.`,
            ], `counter-taunt-${t.name}`),
        });
    }
    if (perishSongs.length > 0 && redirectors.length === 0) {
        const p = perishSongs[0];
        advice.push({
            category: "Counter", icon: "☠️", title: "Stall Breaker",
            desc: `${p.name}'s Perish Song forces a decision on setup sweepers and stall teams that would otherwise outlast you.`,
        });
    }

    // --- 🕳️ GAPS ---------------------------------------------------------
    if (protectors.length === 0) {
        advice.push({
            category: "Gap", icon: "⚠️", title: "No Protect Coverage",
            desc: `Nobody on this team has a Protect-family move. That's a real risk in doubles — you'll have no way to scout a call, stall a Dynamax/terastal turn, or bank an item like Sitrus Berry safely.`,
        });
    }

    if (weatherSetters.length >= 2) {
        const weathers = new Set(weatherSetters.map((p) => norm(p.build?.ability || "")));
        if (weathers.size >= 2) {
            const names = weatherSetters.map((p) => p.name).join(" and ");
            advice.push({
                category: "Gap", icon: "🌪️", title: "Conflicting Weather",
                desc: `${names} set different weather. Whichever switches in last overwrites the other — decide your primary weather now so you don't cancel your own setup mid-game.`,
            });
        }
    }

    if (fakeOuts.length === 0 && redirectors.length === 0) {
        advice.push({
            category: "Gap", icon: "🎯", title: "Limited Tempo Control",
            desc: `No Fake Out and no redirection on this team. You'll be relying on raw stats and prediction to control the first couple of turns — consider a partner that can grab tempo if this archetype struggles early.`,
        });
    }

    // --- 🧬 SHARED WEAKNESS SCAN ---------------------------------------------
    const typedTeam = team
        .map((p) => ({
            p,
            types: (p.types ?? []).map(toPType).filter((t): t is PType => !!t),
        }))
        .filter((m) => m.types.length > 0);

    if (typedTeam.length >= Math.min(4, team.length)) {
        const weakCounts: Record<string, TeamMember[]> = {};
        for (const attack of ALL_TYPES) {
            const weakMembers = typedTeam.filter((m) => comboMultiplier(attack, m.types) >= 2);
            if (weakMembers.length >= 3) {
                weakCounts[attack] = weakMembers.map((m) => m.p);
            }
        }
        const sharedWeakType = Object.keys(weakCounts).sort(
            (a, b) => weakCounts[b].length - weakCounts[a].length
        )[0];

        if (sharedWeakType) {
            const members = weakCounts[sharedWeakType];
            advice.push({
                category: "Gap", icon: "🧬", title: `Shared ${sharedWeakType} Weakness`,
                desc: `${members.map((m) => m.name).join(", ")} are all weak to ${sharedWeakType}-type attacks. A single well-placed ${sharedWeakType} move can pressure most of your team at once — make sure at least one member resists or checks it.`,
            });

            const resistOrImmune = typedTeam.find(
                (m) => sharedWeakType && comboMultiplier(sharedWeakType as PType, m.types) < 1
            );
            if (resistOrImmune) {
                advice.push({
                    category: "Counter", icon: "🧱", title: `${sharedWeakType} Answer`,
                    desc: `${resistOrImmune.p.name} resists ${sharedWeakType}, which makes it your default switch-in whenever that type shows up across the field.`,
                });
            }
        }
    }

    // --- Fallback -------------------------------------------------------------
    if (advice.length === 0) {
        advice.push({
            category: "General", icon: "⚖️", title: "Balanced Approach",
            desc: "No extreme meta-cores detected. Rely on your defensive type coverage and play reactively to open the game.",
        });
    }

    return advice;
}