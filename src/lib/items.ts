// src/lib/optimizer/items.ts
//
// Everything related to held-item legality and assignment: figuring out
// which items are "regulation legal" based on usage stats across the whole
// dataset, ranking candidate items per Pokémon, and assigning a final,
// non-duplicated item to every member of a finished team.

import type { Pokemon } from "./teamEvaluator";
import { pokemonMap } from "./teamEvaluator";
import type { LiveGameData } from "./pokeApi";

const FALLBACK_ITEMS_DEFAULT = ["Sitrus Berry", "Leftovers", "Life Orb"];

/** Builds a global, usage-frequency-sorted pool of items seen across the dataset. */
function getGlobalRegulatedItems(): string[] {
    const itemFrequencies: Record<string, number> = {};

    for (const pData of Object.values(pokemonMap)) {
        const items = pData.usageData?.items;
        if (!items) continue;

        let itemArray: any[] = [];
        if (Array.isArray(items)) {
            itemArray = items;
        } else if (typeof items === "object" && Object.keys(items).length > 0) {
            itemArray = Object.keys(items).map((k) => ({ name: k }));
        }

        for (const itemObj of itemArray) {
            const itemName = typeof itemObj === "string" ? itemObj : itemObj?.name;
            if (
                itemName &&
                typeof itemName === "string" &&
                itemName.toLowerCase() !== "unknown item" &&
                itemName.toLowerCase() !== "nothing"
            ) {
                itemFrequencies[itemName] = (itemFrequencies[itemName] || 0) + 1;
            }
        }
    }

    const sortedItems = Object.entries(itemFrequencies)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);

    return sortedItems.length > 0 ? sortedItems : FALLBACK_ITEMS_DEFAULT;
}

export const REGULATED_FALLBACK_ITEMS = getGlobalRegulatedItems();
const REGULATION_ITEM_SET = new Set(REGULATED_FALLBACK_ITEMS.map(normalizeItem));

export function normalizeItem(item: string): string {
    return item.toLowerCase().replace(/[\s_-]/g, "");
}

export function isInvalidItem(item: string): boolean {
    const lower = item.trim().toLowerCase();
    return lower.length === 0 || lower === "unknown item" || lower === "nothing";
}

export function isRegulationLegalItem(item: string, pData?: Pokemon | null): boolean {
    if (isInvalidItem(item)) return false;
    if (pData?.requires_item && normalizeItem(pData.requires_item) === normalizeItem(item)) return true;
    return REGULATION_ITEM_SET.has(normalizeItem(item));
}

export function pickFirstLegalItem(preferredItems: string[], pData?: Pokemon | null): string {
    for (const item of preferredItems) {
        if (isRegulationLegalItem(item, pData)) return item;
    }

    const fallback = REGULATED_FALLBACK_ITEMS.find((item) => isRegulationLegalItem(item, pData));
    if (fallback) return fallback;
    return pData?.requires_item || REGULATED_FALLBACK_ITEMS[0] || "Leftovers";
}

/** Usage-ranked item candidates for a Pokémon, sorted by observed popularity. */
export function getUsageItemCandidates(pData: Pokemon | undefined): string[] {
    if (!pData?.usageData?.items) return [];

    const rawItems = pData.usageData.items as unknown;
    const parsed: { name: string; weight: number }[] = [];

    if (Array.isArray(rawItems)) {
        for (let i = 0; i < rawItems.length; i++) {
            const entry = rawItems[i] as { name?: string; usage?: string } | string;
            const name = typeof entry === "string" ? entry : entry?.name;
            if (!name || isInvalidItem(name)) continue;

            const usageStr = typeof entry === "object" && entry ? entry.usage : undefined;
            const usageNum = usageStr ? Number(String(usageStr).replace(/%/g, "").trim()) : 0;
            const fallbackWeight = Math.max(0, 100 - i);
            parsed.push({ name, weight: Number.isFinite(usageNum) && usageNum > 0 ? usageNum : fallbackWeight });
        }
    } else if (rawItems && typeof rawItems === "object") {
        for (const [name, weight] of Object.entries(rawItems as Record<string, string | number>)) {
            if (isInvalidItem(name)) continue;
            const parsedWeight = typeof weight === "number" ? weight : Number(String(weight).replace(/%/g, "").trim());
            parsed.push({ name, weight: Number.isFinite(parsedWeight) ? parsedWeight : 0 });
        }
    }

    parsed.sort((a, b) => b.weight - a.weight);
    return parsed.map((i) => i.name);
}

/** Role/stat-driven item candidates, used to fill gaps usage data doesn't cover. */
export function getRoleAwareItemCandidates(pData: Pokemon | undefined, liveData: LiveGameData | null): string[] {
    if (!pData) return [];

    const candidates: string[] = [];
    const speedStat = liveData?.stats.find((s) => s.name === "speed")?.base_stat ?? 100;
    const atk = liveData?.stats.find((s) => s.name === "attack")?.base_stat ?? 0;
    const spa = liveData?.stats.find((s) => s.name === "special-attack")?.base_stat ?? 0;

    if (pData.roles?.["fake_out"] || pData.roles?.["redirector"]) {
        candidates.push("Sitrus Berry", "Safety Goggles");
    }
    if (pData.roles?.["tailwind_setter"] || pData.roles?.["trick_room_setter"]) {
        candidates.push("Mental Herb", "Focus Sash");
    }
    if (pData.roles?.["intimidate"]) {
        candidates.push("Assault Vest", "Sitrus Berry");
    }
    if (pData.roles?.["fast_sweeper"] || speedStat >= 110) {
        candidates.push("Focus Sash", "Life Orb", "Choice Scarf");
    }
    if (pData.roles?.["trick_room_abuser"] || speedStat <= 50) {
        candidates.push("Life Orb", "Assault Vest");
    }

    if (atk > spa && atk >= 110) {
        candidates.push("Life Orb", "Choice Band", "Clear Amulet");
    } else if (spa > atk && spa >= 110) {
        candidates.push("Life Orb", "Choice Specs", "Expert Belt");
    } else {
        candidates.push("Sitrus Berry", "Leftovers");
    }

    return candidates.filter((i) => isRegulationLegalItem(i, pData));
}

/** How well a specific item fits a specific Pokémon, for ranking/tie-breaking. */
export function scoreItemFit(item: string, memberName: string, liveData: LiveGameData | null): number {
    const pData = pokemonMap[memberName.toLowerCase()];
    if (!pData || isInvalidItem(item)) return -100;
    if (!isRegulationLegalItem(item, pData)) return -300;

    const normalized = normalizeItem(item);
    const required = pData.requires_item ? normalizeItem(pData.requires_item) : "";

    if (required && normalized === required) return 200;
    if (required && normalized !== required) return -500;

    const usageCandidates = getUsageItemCandidates(pData);
    const usageIndex = usageCandidates.findIndex((i) => normalizeItem(i) === normalized);
    let score = usageIndex >= 0 ? Math.max(0, 60 - usageIndex * 8) : 0;

    const roleAware = getRoleAwareItemCandidates(pData, liveData);
    const roleIndex = roleAware.findIndex((i) => normalizeItem(i) === normalized);
    if (roleIndex >= 0) score += Math.max(0, 30 - roleIndex * 5);

    if (normalized === "focussash" && (pData.roles?.["fast_sweeper"] || pData.roles?.["tailwind_setter"])) score += 8;
    if (normalized === "mentalherb" && (pData.roles?.["tailwind_setter"] || pData.roles?.["trick_room_setter"])) score += 10;
    if (normalized === "sitrusberry" && (pData.roles?.["redirector"] || pData.roles?.["fake_out"] || pData.roles?.["intimidate"])) score += 8;

    return score;
}

/** Full ordered, de-duplicated candidate list for a team member's item slot. */
export function getItemCandidatesForMember(memberName: string, liveData: LiveGameData | null): string[] {
    const pData = pokemonMap[memberName.toLowerCase()];
    if (!pData) return [];

    const primaryBuildKey = Object.keys(pData.builds || {})[0];
    const buildItem = primaryBuildKey ? pData.builds[primaryBuildKey]?.item : "";

    const dedup = new Set<string>();
    const ordered: string[] = [];
    const pushCandidate = (item?: string, force = false) => {
        if (!item || isInvalidItem(item)) return;
        if (!force && !isRegulationLegalItem(item, pData)) return;
        const key = normalizeItem(item);
        if (dedup.has(key)) return;
        dedup.add(key);
        ordered.push(item);
    };

    if (pData.requires_item) pushCandidate(pData.requires_item, true);
    pushCandidate(buildItem);
    getUsageItemCandidates(pData).forEach((item) => pushCandidate(item));
    getRoleAwareItemCandidates(pData, liveData).forEach((item) => pushCandidate(item));
    REGULATED_FALLBACK_ITEMS.forEach((item) => pushCandidate(item));

    return ordered;
}

export type TeamItemAssignment = {
    itemByName: Record<string, string>;
    duplicateCount: number;
    realismScore: number;
    megaCount: number;
};

function isMegaCaptain(name: string, item: string, pData: Pokemon | undefined): boolean {
    const normalizedItem = item.toLowerCase().replace(/[\s_-]/g, "");
    const reqItem = pData?.requires_item?.toLowerCase().replace(/[\s_-]/g, "") || "";
    const lowerName = name.toLowerCase();
    return (
        normalizedItem.includes("mega") ||
        normalizedItem.includes("primal") ||
        reqItem.includes("mega") ||
        reqItem.includes("primal") ||
        lowerName.includes("mega") ||
        lowerName.includes("primal")
    );
}

/**
 * Assigns a final, ideally-unique held item to every member of a candidate
 * team, preferring hard requirements first, then best-fit scoring for the
 * remaining slots.
 */
export function assignItemsForTeam(
    teamNames: string[],
    liveBoxData: Record<string, LiveGameData | null>
): TeamItemAssignment {
    const itemByName: Record<string, string> = {};
    const usedItems = new Set<string>();

    const orderedMembers = [...teamNames].sort((a, b) => {
        const pa = pokemonMap[a.toLowerCase()];
        const pb = pokemonMap[b.toLowerCase()];
        const aReq = pa?.requires_item ? 0 : 1;
        const bReq = pb?.requires_item ? 0 : 1;
        if (aReq !== bReq) return aReq - bReq;
        return (
            getItemCandidatesForMember(a, liveBoxData[a.toLowerCase()]).length -
            getItemCandidatesForMember(b, liveBoxData[b.toLowerCase()]).length
        );
    });

    let realismScore = 0;

    for (const memberName of orderedMembers) {
        const candidates = getItemCandidatesForMember(memberName, liveBoxData[memberName.toLowerCase()]);
        const pData = pokemonMap[memberName.toLowerCase()];

        let picked = "";

        if (pData?.requires_item) {
            picked = pData.requires_item;
        } else {
            let bestScore = -Infinity;
            for (const candidate of candidates) {
                const norm = normalizeItem(candidate);
                if (usedItems.has(norm)) continue;

                const fitScore = scoreItemFit(candidate, memberName, liveBoxData[memberName.toLowerCase()]);
                if (fitScore > bestScore) {
                    bestScore = fitScore;
                    picked = candidate;
                }
            }

            if (!picked) {
                const firstUniqueFallback = REGULATED_FALLBACK_ITEMS.find((i) => !usedItems.has(normalizeItem(i)));
                picked = firstUniqueFallback || candidates[0] || REGULATED_FALLBACK_ITEMS[0] || "Leftovers";
            }
        }

        itemByName[memberName.toLowerCase()] = picked;
        usedItems.add(normalizeItem(picked));
        realismScore += scoreItemFit(picked, memberName, liveBoxData[memberName.toLowerCase()]);
    }

    const assignedNormalized = Object.values(itemByName).map(normalizeItem);
    const duplicateCount = assignedNormalized.length - new Set(assignedNormalized).size;

    let megaCount = 0;
    for (const memberName of teamNames) {
        const pData = pokemonMap[memberName.toLowerCase()];
        const item = itemByName[memberName.toLowerCase()] || "";
        if (isMegaCaptain(memberName, item, pData)) megaCount++;
    }

    return { itemByName, duplicateCount, realismScore, megaCount };
}