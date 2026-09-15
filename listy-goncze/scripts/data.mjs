import { MODULE_ID, SETTING_DATA, goldForDC } from "./const.mjs";

/**
 * Struktura danych (jeden world setting, obiekt JSON):
 * {
 *   regions: {
 *     [regionId]: {
 *       id, name,
 *       wanted: {
 *         [wantedId]: {
 *           id, name, img, traits, crimes, issuer, regionId,
 *           status: "active" | "captured",
 *           lastActorId: string|null,
 *           rewardItems: [{ uuid, name, img, qty }],
 *           nodes: {
 *             [nodeId]: {
 *               id, name, dc, weight,
 *               // rodzice mogą wskazywać na węzeł w TYM SAMYM poszukiwanym
 *               // (cross: null) albo w INNYM poszukiwanym (cross: {wantedId})
 *               parents: [{ nodeId, wantedId }],
 *               parentLogic: "AND" | "OR",
 *               completed: boolean
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTING_DATA, {
    scope: "world",
    config: false,
    type: Object,
    default: { regions: {} }
  });
}

export function getData() {
  return game.settings.get(MODULE_ID, SETTING_DATA);
}

/** Zapis może wykonać tylko GM (world setting) — wołające miejsca dbają o to przez socket.mjs */
export async function setData(data) {
  return game.settings.set(MODULE_ID, SETTING_DATA, data);
}

function newId() {
  return foundry.utils.randomID();
}

// ---------- Regiony ----------

export async function createRegion(name) {
  const data = getData();
  const id = newId();
  data.regions[id] = { id, name, wanted: {} };
  await setData(data);
  return id;
}

export function listRegions() {
  return Object.values(getData().regions).sort((a, b) => a.name.localeCompare(b.name));
}

export function getRegion(regionId) {
  return getData().regions[regionId] ?? null;
}

// ---------- Poszukiwani ----------

export async function createWanted(regionId, payload) {
  const data = getData();
  const region = data.regions[regionId];
  if (!region) throw new Error("Nieznany region");
  const id = newId();
  region.wanted[id] = {
    id,
    name: payload.name ?? "Nowy poszukiwany",
    img: payload.img ?? "icons/svg/mystery-man.svg",
    traits: payload.traits ?? "",
    crimes: payload.crimes ?? "",
    issuer: payload.issuer ?? "",
    regionId,
    status: "active",
    lastActorId: null,
    rewardItems: [],
    nodes: {}
  };
  await setData(data);
  return id;
}

/** Znajduje poszukiwanego niezależnie od regionu (potrzebne przy cross-target triggerach) */
export function findWanted(wantedId) {
  const data = getData();
  for (const region of Object.values(data.regions)) {
    if (region.wanted[wantedId]) return region.wanted[wantedId];
  }
  return null;
}

export function listWantedInRegion(regionId, status) {
  const region = getRegion(regionId);
  if (!region) return [];
  return Object.values(region.wanted)
    .filter((w) => !status || w.status === status)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateWanted(wantedId, patch) {
  const data = getData();
  const wanted = findWantedInData(data, wantedId);
  Object.assign(wanted, patch);
  await setData(data);
}

export async function setWantedStatus(wantedId, status) {
  return updateWanted(wantedId, { status });
}

export async function addRewardItem(wantedId, item) {
  const data = getData();
  const wanted = findWantedInData(data, wantedId);
  wanted.rewardItems.push(item);
  await setData(data);
}

export async function removeRewardItem(wantedId, index) {
  const data = getData();
  const wanted = findWantedInData(data, wantedId);
  wanted.rewardItems.splice(index, 1);
  await setData(data);
}

function findWantedInData(data, wantedId) {
  for (const region of Object.values(data.regions)) {
    if (region.wanted[wantedId]) return region.wanted[wantedId];
  }
  throw new Error("Nieznany poszukiwany");
}

// ---------- Tropy (węzły) ----------

export async function addNode(wantedId, payload) {
  const data = getData();
  const wanted = findWantedInData(data, wantedId);
  const id = newId();
  wanted.nodes[id] = {
    id,
    name: payload.name ?? "Nowy trop",
    dc: Number(payload.dc ?? 12),
    weight: Number(payload.weight ?? 10),
    parents: payload.parents ?? [],
    parentLogic: payload.parentLogic ?? "AND",
    completed: false
  };
  await setData(data);
  return id;
}

export async function updateNode(wantedId, nodeId, patch) {
  const data = getData();
  const wanted = findWantedInData(data, wantedId);
  Object.assign(wanted.nodes[nodeId], patch);
  await setData(data);
}

export async function deleteNode(wantedId, nodeId) {
  const data = getData();
  const wanted = findWantedInData(data, wantedId);
  delete wanted.nodes[nodeId];
  // usuń referencje do tego węzła jako rodzica (w tym u innych poszukiwanych)
  for (const region of Object.values(data.regions)) {
    for (const w of Object.values(region.wanted)) {
      for (const n of Object.values(w.nodes)) {
        n.parents = n.parents.filter((p) => !(p.nodeId === nodeId && (p.wantedId ?? w.id) === wantedId));
      }
    }
  }
  await setData(data);
}

/** Czy węzeł jest odblokowany (wszyscy/dowolny rodzic ukończony, wg parentLogic) */
export function isNodeUnlocked(wanted, node) {
  if (!node.parents?.length) return true;
  const results = node.parents.map((p) => {
    const parentWanted = p.wantedId ? findWanted(p.wantedId) : wanted;
    const parentNode = parentWanted?.nodes?.[p.nodeId];
    return !!parentNode?.completed;
  });
  return node.parentLogic === "OR" ? results.some(Boolean) : results.every(Boolean);
}

/** Sortowanie węzłów wg głębokości (korzenie najpierw) do automatycznego układu listy */
export function nodesByDepth(wanted) {
  const nodes = Object.values(wanted.nodes);
  const depthCache = new Map();
  const depthOf = (node, seen = new Set()) => {
    if (depthCache.has(node.id)) return depthCache.get(node.id);
    if (!node.parents?.length) return 0;
    if (seen.has(node.id)) return 0; // ochrona przed cyklem
    seen.add(node.id);
    const d = 1 + Math.max(...node.parents.map((p) => {
      const pw = p.wantedId ? findWanted(p.wantedId) : wanted;
      const pn = pw?.nodes?.[p.nodeId];
      return pn ? depthOf(pn, seen) : 0;
    }));
    depthCache.set(node.id, d);
    return d;
  };
  return nodes
    .map((n) => ({ node: n, depth: depthOf(n) }))
    .sort((a, b) => a.depth - b.depth || a.node.name.localeCompare(b.node.name));
}

export function computeProgress(wanted) {
  const nodes = Object.values(wanted.nodes);
  const total = nodes.reduce((s, n) => s + Number(n.weight || 0), 0);
  const done = nodes.filter((n) => n.completed).reduce((s, n) => s + Number(n.weight || 0), 0);
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
}

export function computeGold(wanted) {
  return Object.values(wanted.nodes)
    .filter((n) => n.completed)
    .reduce((s, n) => s + goldForDC(n.dc), 0);
}

export async function completeNode(wantedId, nodeId, actorId) {
  const data = getData();
  const wanted = findWantedInData(data, wantedId);
  const node = wanted.nodes[nodeId];
  if (!node || node.completed) return;
  if (!isNodeUnlocked(wanted, node)) return;
  node.completed = true;
  wanted.lastActorId = actorId ?? wanted.lastActorId;
  await setData(data);
}
