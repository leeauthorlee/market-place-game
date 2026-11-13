export type MapId = "hub" | "market_map" | "work_map";
export type SceneId = MapId | "shop" | "work_area";
export type Point = { x: number; y: number };
export type ItemId = "wool" | "barley" | "apple" | "wood" | "carp";
export type ShopId = "produce" | "fish" | "firewood" | "wool";
export type LocationId = "sheep_pen" | "field" | "grove" | "pond";
export type ActivityId = "shearing" | "farming" | "fruit_gathering" | "wood_gathering" | "fishing";

export type Item = { id: ItemId; name: string; icon: string; category: ShopId; buy: number; sell: number };
export type Shop = { id: ShopId; name: string; icon: string; description: string; itemIds: ItemId[] };
export type Activity = { id: ActivityId; name: string; location: LocationId; icon: string; item: ItemId; quantity: number };
export type Location = { id: LocationId; name: string; icon: string; detail: string; node: string; entrance: Point; type: "sheep" | "field" | "grove" | "pond"; actions: ActivityId[] };
export type Transaction = { id: string; type: "gather" | "buy" | "sell"; itemId: ItemId; quantity: number; totalPrice: number; createdAt: string };
export type GameData = { cash: number; inventory: Partial<Record<ItemId, number>>; activeJob: { activityId: ActivityId; startedAt: number } | null; transactions: Transaction[]; positions: Record<MapId, Point> };
export type MapDefinition = { start: Point; nodes: Record<string, Point>; edges: [string, string][] };

export const MAP_W = 1200;
export const MAP_H = 800;
export const ROAD_RADIUS = 49;
export const WALK_SPEED = 180;
export const WORK_MS = 5000;
export const SAVE_KEY = "green-village-market-v1";

export const ITEMS: Item[] = [
  { id: "wool", name: "양털", icon: "🧶", category: "wool", buy: 15, sell: 10 },
  { id: "barley", name: "보리", icon: "🌾", category: "produce", buy: 8, sell: 5 },
  { id: "apple", name: "사과", icon: "🍎", category: "produce", buy: 8, sell: 5 },
  { id: "wood", name: "나무", icon: "🪵", category: "firewood", buy: 12, sell: 8 },
  { id: "carp", name: "붕어", icon: "🐟", category: "fish", buy: 20, sell: 14 },
];

export const SHOPS: Shop[] = [
  { id: "produce", name: "채소·과일 가게", icon: "🥕", description: "밭에서 거둔 작물과 달콤한 과일", itemIds: ["barley", "apple"] },
  { id: "fish", name: "물고기 가게", icon: "🐟", description: "연못에서 잡은 싱싱한 물고기", itemIds: ["carp"] },
  { id: "firewood", name: "장작 가게", icon: "🪵", description: "마을 숲에서 모은 나무와 장작", itemIds: ["wood"] },
  { id: "wool", name: "털 가게", icon: "🧶", description: "양 우리에서 얻은 포근한 양털", itemIds: ["wool"] },
];

export const LOCATIONS: Record<LocationId, Location> = {
  sheep_pen: { id: "sheep_pen", name: "양 우리", icon: "🐑", detail: "양들이 모여 있는 우리에서 양털을 깎아요.", node: "sheep", entrance: { x: 200, y: 650 }, type: "sheep", actions: ["shearing"] },
  field: { id: "field", name: "보리 밭", icon: "🌾", detail: "초록빛 밭을 가꾸고 보리를 수확해요.", node: "field", entrance: { x: 1000, y: 650 }, type: "field", actions: ["farming"] },
  grove: { id: "grove", name: "나무 구역", icon: "🌳", detail: "나무에서 과일을 따거나 나무를 모아요.", node: "grove", entrance: { x: 1000, y: 150 }, type: "grove", actions: ["fruit_gathering", "wood_gathering"] },
  pond: { id: "pond", name: "작은 연못", icon: "🎣", detail: "잔잔한 연못에서 붕어를 낚아봐요.", node: "pond", entrance: { x: 600, y: 690 }, type: "pond", actions: ["fishing"] },
};

export const ACTIVITIES: Activity[] = [
  { id: "shearing", name: "양털 깎기", location: "sheep_pen", icon: "🐑", item: "wool", quantity: 2 },
  { id: "farming", name: "밭 가꾸기", location: "field", icon: "🌱", item: "barley", quantity: 3 },
  { id: "fruit_gathering", name: "과일 채집", location: "grove", icon: "🍎", item: "apple", quantity: 2 },
  { id: "wood_gathering", name: "나무 채집", location: "grove", icon: "🌳", item: "wood", quantity: 1 },
  { id: "fishing", name: "낚시", location: "pond", icon: "🎣", item: "carp", quantity: 1 },
];

export const MAPS: Record<MapId, MapDefinition> = {
  hub: {
    start: { x: 600, y: 400 },
    nodes: {
      center: { x: 600, y: 400 }, north: { x: 600, y: 70 }, south: { x: 600, y: 730 }, west: { x: 90, y: 400 }, east: { x: 1110, y: 400 },
      nw1: { x: 430, y: 310 }, nw2: { x: 340, y: 220 }, ne1: { x: 770, y: 310 }, ne2: { x: 860, y: 220 },
      sw1: { x: 430, y: 500 }, sw2: { x: 340, y: 600 }, se1: { x: 770, y: 500 }, se2: { x: 860, y: 600 },
    },
    edges: [["center", "north"], ["center", "south"], ["center", "west"], ["center", "east"], ["center", "nw1"], ["nw1", "nw2"], ["center", "ne1"], ["ne1", "ne2"], ["center", "sw1"], ["sw1", "sw2"], ["center", "se1"], ["se1", "se2"]],
  },
  market_map: {
    start: { x: 600, y: 400 },
    nodes: {
      center: { x: 600, y: 400 }, north: { x: 600, y: 75 }, south: { x: 600, y: 725 }, left: { x: 400, y: 400 }, west: { x: 90, y: 400 }, right: { x: 800, y: 400 }, east: { x: 1110, y: 400 },
      produce: { x: 400, y: 260 }, fish: { x: 400, y: 560 }, firewood: { x: 800, y: 260 }, wool: { x: 800, y: 560 },
    },
    edges: [["center", "north"], ["center", "south"], ["center", "left"], ["left", "west"], ["center", "right"], ["right", "east"], ["left", "produce"], ["left", "fish"], ["right", "firewood"], ["right", "wool"]],
  },
  work_map: {
    start: { x: 600, y: 400 },
    nodes: {
      center: { x: 600, y: 400 }, north: { x: 600, y: 70 }, south: { x: 600, y: 730 }, west: { x: 90, y: 400 }, east: { x: 1110, y: 400 },
      sw1: { x: 460, y: 500 }, sw2: { x: 350, y: 620 }, sheep: { x: 200, y: 650 }, pond: { x: 600, y: 690 },
      se1: { x: 750, y: 450 }, se2: { x: 850, y: 550 }, field: { x: 1000, y: 650 }, ne1: { x: 750, y: 350 }, ne2: { x: 850, y: 260 }, grove: { x: 1000, y: 150 },
    },
    edges: [["center", "north"], ["center", "south"], ["center", "west"], ["center", "east"], ["center", "sw1"], ["sw1", "sw2"], ["sw2", "sheep"], ["center", "pond"], ["center", "se1"], ["se1", "se2"], ["se2", "field"], ["center", "ne1"], ["ne1", "ne2"], ["ne2", "grove"]],
  },
};

export function emptyGameData(): GameData {
  return {
    cash: 0,
    inventory: {},
    activeJob: null,
    transactions: [],
    positions: {
      hub: { ...MAPS.hub.start },
      market_map: { ...MAPS.market_map.start },
      work_map: { ...MAPS.work_map.start },
    },
  };
}

export function normalizeGameData(raw: unknown): GameData {
  const fallback = emptyGameData();
  if (!raw || typeof raw !== "object") return fallback;
  const data = raw as Partial<GameData> & { position?: Point };
  const inventory: GameData["inventory"] = {};
  for (const item of ITEMS) {
    const quantity = Number(data.inventory?.[item.id] || 0);
    if (Number.isSafeInteger(quantity) && quantity > 0) inventory[item.id] = quantity;
  }
  const oldPositions: Partial<Record<MapId, Point>> = data.positions ?? (data.position ? { hub: data.position } : {});
  const positions = { ...fallback.positions };
  for (const mapId of Object.keys(MAPS) as MapId[]) {
    const candidate = oldPositions[mapId];
    if (!candidate || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) continue;
    const map = MAPS[mapId];
    const x = Math.max(0, Math.min(1200, candidate.x));
    const y = Math.max(0, Math.min(800, candidate.y));
    const walkable = map.edges.some(([from, to]) => {
      const a = map.nodes[from];
      const b = map.nodes[to];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = dx * dx + dy * dy;
      const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length));
      return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)) <= 49;
    });
    if (walkable) positions[mapId] = { x, y };
  }
  const activityId = data.activeJob?.activityId;
  const activeJob = activityId && ACTIVITIES.some((activity) => activity.id === activityId) && Number.isFinite(data.activeJob?.startedAt)
    ? { activityId, startedAt: data.activeJob!.startedAt }
    : null;
  const transactions = Array.isArray(data.transactions)
    ? data.transactions.filter((transaction) => ITEMS.some((item) => item.id === transaction.itemId) && ["gather", "buy", "sell"].includes(transaction.type)).slice(0, 100)
    : [];
  return {
    cash: Number.isSafeInteger(data.cash) && (data.cash as number) >= 0 ? data.cash as number : 0,
    inventory,
    activeJob,
    transactions,
    positions,
  };
}

export function getMapProjection(mapId: MapId, point: Point) {
  const map = MAPS[mapId];
  let best: { from: string; to: string; projection: Point; distance: number } | null = null;
  for (const [from, to] of map.edges) {
    const a = map.nodes[from];
    const b = map.nodes[to];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
    const projection = { x: a.x + t * dx, y: a.y + t * dy };
    const distance = Math.hypot(point.x - projection.x, point.y - projection.y);
    if (!best || distance < best.distance) best = { from, to, projection, distance };
  }
  return best;
}

export function getShortestNodePath(mapId: MapId, startId: string, endId: string): string[] {
  const map = MAPS[mapId];
  if (startId === endId) return [startId];
  const distances = Object.fromEntries(Object.keys(map.nodes).map((id) => [id, Infinity])) as Record<string, number>;
  const previous: Record<string, string> = {};
  const unseen = new Set(Object.keys(map.nodes));
  distances[startId] = 0;
  while (unseen.size) {
    let current: string | null = null;
    for (const id of unseen) if (current === null || distances[id] < distances[current]) current = id;
    if (!current || distances[current] === Infinity) break;
    unseen.delete(current);
    if (current === endId) break;
    for (const [from, to] of map.edges) {
      const next = from === current ? to : to === current ? from : null;
      if (!next || !unseen.has(next)) continue;
      const a = map.nodes[current];
      const b = map.nodes[next];
      const candidate = distances[current] + Math.hypot(a.x - b.x, a.y - b.y);
      if (candidate < distances[next]) { distances[next] = candidate; previous[next] = current; }
    }
  }
  if (!Number.isFinite(distances[endId])) return [];
  const path = [endId];
  while (path[0] !== startId) path.unshift(previous[path[0]]);
  return path;
}

export function mapPathLength(mapId: MapId, path: string[]) {
  const nodes = MAPS[mapId].nodes;
  let length = 0;
  for (let i = 1; i < path.length; i++) length += Math.hypot(nodes[path[i]].x - nodes[path[i - 1]].x, nodes[path[i]].y - nodes[path[i - 1]].y);
  return length;
}
