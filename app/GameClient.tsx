"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import {
  ACTIVITIES,
  ITEMS,
  LOCATIONS,
  MAPS,
  ROAD_RADIUS,
  SAVE_KEY,
  SHOPS,
  WALK_SPEED,
  WORK_MS,
  emptyGameData,
  getMapProjection,
  getShortestNodePath,
  mapPathLength,
  normalizeGameData,
} from "@/lib/game-data";
import type { ActivityId, GameData, Item, ItemId, LocationId, MapId, Point, SceneId, ShopId } from "@/lib/game-data";

type Face = "up" | "down" | "left" | "right";
type Arrival = { type: "shop"; id: ShopId } | { type: "work"; id: LocationId } | null;
type Route = { mapId: MapId; points: Point[]; index: number; position: Point; arrival: Arrival };
type TargetMap = Partial<Record<MapId, Point | null>>;

const ITEM_BY_ID = Object.fromEntries(ITEMS.map((item) => [item.id, item])) as Record<Item["id"], Item>;
const SHOP_BY_ID = Object.fromEntries(SHOPS.map((shop) => [shop.id, shop]));
const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((activity) => [activity.id, activity]));
const formatNumber = (value: number) => new Intl.NumberFormat("ko-KR").format(value);
const formatWon = (value: number) => `${formatNumber(value)}원`;

function pointDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isOnRoad(mapId: MapId, point: Point, radius = ROAD_RADIUS) {
  const map = MAPS[mapId];
  return map.edges.some(([from, to]) => {
    const a = map.nodes[from];
    const b = map.nodes[to];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length));
    return pointDistance(point, { x: a.x + t * dx, y: a.y + t * dy }) <= radius;
  });
}

function buildRoute(mapId: MapId, current: Point, requested: Point, arrival: Arrival): Route | null {
  const map = MAPS[mapId];
  const startEdge = getMapProjection(mapId, current);
  const endEdge = getMapProjection(mapId, requested);
  if (!startEdge || !endEdge) return null;
  const target = endEdge.projection;
  const options: { cost: number; points: Point[] }[] = [];
  const sameEdge = (startEdge.from === endEdge.from && startEdge.to === endEdge.to) || (startEdge.from === endEdge.to && startEdge.to === endEdge.from);

  if (sameEdge) {
    options.push({
      cost: pointDistance(current, startEdge.projection) + pointDistance(startEdge.projection, target),
      points: [current, startEdge.projection, target],
    });
  }

  for (const startNode of [startEdge.from, startEdge.to]) {
    for (const endNode of [endEdge.from, endEdge.to]) {
      const path = getShortestNodePath(mapId, startNode, endNode);
      if (!path.length) continue;
      const nodeDistance = mapPathLength(mapId, path);
      const cost = pointDistance(current, startEdge.projection)
        + pointDistance(startEdge.projection, map.nodes[startNode])
        + nodeDistance
        + pointDistance(map.nodes[endNode], target);
      options.push({
        cost,
        points: [current, startEdge.projection, map.nodes[startNode], ...path.slice(1).map((id) => map.nodes[id]), target],
      });
    }
  }

  options.sort((a, b) => a.cost - b.cost);
  const best = options[0];
  if (!best) return null;
  const points = best.points.filter((point, index, all) => index === 0 || pointDistance(point, all[index - 1]) > 1);
  return { mapId, points, index: 1, position: { ...current }, arrival };
}

function House({ x, y, name, roof, fill = "#fff7e4" }: { x: number; y: number; name: string; roof: string; fill?: string }) {
  return <g className="hub-house" aria-hidden="true" filter="url(#houseShadow)">
    <rect x={x} y={y + 40} width="170" height="118" rx="17" fill={fill} stroke="#b39a70" strokeWidth="5" />
    <path d={`M${x - 18} ${y + 61}l103-74 103 74z`} fill={roof} stroke="#8d7757" strokeWidth="5" />
    <rect x={x + 28} y={y + 83} width="35" height="46" rx="14" fill="#afd9d0" />
    <rect x={x + 75} y={y + 83} width="35" height="46" rx="14" fill="#afd9d0" />
    <rect x={x + 122} y={y + 95} width="32" height="63" rx="15" fill="#c48a65" />
    <text x={x + 85} y={y + 56} textAnchor="middle" className="building-sign">{name}</text>
  </g>;
}

function HubMap({ position, face, moving, target, onClick }: MapProps) {
  return <svg className="town-map" viewBox="0 0 1200 800" role="application" aria-label="여러 건물 사이로 길이 이어진 초록마을" onClick={onClick}>
    <defs><pattern id="hubGrass" width="42" height="42" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="1.5" fill="#b6d3a7" opacity=".55"/><circle cx="30" cy="28" r="1.4" fill="#b4d4a4" opacity=".5"/></pattern><filter id="houseShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#536d48" floodOpacity=".16"/></filter></defs>
    <rect width="1200" height="800" fill="#e5f0d9"/><rect width="1200" height="800" fill="url(#hubGrass)" />
    <path d="M0 0h1200v120q-180 70-360 0t-360 0T120 120Q40 135 0 115z" fill="#d7e9cb" />
    <g aria-hidden="true"><circle cx="90" cy="100" r="34" fill="#a5c98f"/><circle cx="124" cy="111" r="25" fill="#b6d5a1"/><rect x="98" y="118" width="13" height="39" rx="5" fill="#9b7b55"/><circle cx="1085" cy="116" r="34" fill="#9fc78c"/><circle cx="1120" cy="103" r="27" fill="#b2d39c"/><rect x="1091" y="125" width="13" height="36" rx="5" fill="#9b7b55"/></g>
    <RoadPaths mapId="hub" />
    <House x={128} y={160} name="은행" roof="#d79c54" fill="#fbefb7" />
    <g className="hub-castle" aria-hidden="true" filter="url(#houseShadow)"><rect x="877" y="144" width="200" height="198" rx="12" fill="#fff8e6" stroke="#a59c79" strokeWidth="6"/><rect x="895" y="106" width="45" height="80" rx="9" fill="#f8f1d9" stroke="#a59c79" strokeWidth="5"/><path d="M887 112l31-44 31 44z" fill="#dc776b"/><rect x="1013" y="100" width="45" height="90" rx="9" fill="#f8f1d9" stroke="#a59c79" strokeWidth="5"/><path d="M1005 106l31-45 31 45z" fill="#dc776b"/><rect x="949" y="245" width="55" height="97" rx="26" fill="#9bcac5" stroke="#8d8267" strokeWidth="5"/><text x="977" y="222" textAnchor="middle" className="building-sign">마을 성</text></g>
    <House x={120} y={520} name="빵집" roof="#cf7f64" fill="#fff6df" />
    <House x={895} y={520} name="놀이터" roof="#eaa96f" fill="#fff7e5" />
    <House x={445} y={78} name="마을 회관" roof="#86b880" />
    <House x={445} y={595} name="작은 집" roof="#d9a769" />
    <g className="hub-fountain" aria-hidden="true"><ellipse cx="663" cy="398" rx="72" ry="43" fill="#b5dcd2" stroke="#80b3a7" strokeWidth="5"/><ellipse cx="663" cy="398" rx="50" ry="27" fill="#d5eee0"/><circle cx="675" cy="390" r="4" fill="#637963"/></g>
    <g className="hub-sign" data-transition="market_map" role="button" tabIndex={0} aria-label="시장 팻말을 눌러 시장 마을로 이동"><path d="M179 395v75M257 395v75" stroke="#8c704e" strokeWidth="12" strokeLinecap="round"/><rect x="151" y="337" width="135" height="75" rx="18" fill="#fff1ca" stroke="#97734b" strokeWidth="6"/><text x="218" y="385" textAnchor="middle" className="sign-text">시장</text><path d="M173 359l-18 15 18 15" fill="none" stroke="#cf8660" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></g>
    <g className="hub-sign" data-transition="work_map" role="button" tabIndex={0} aria-label="일하기 팻말을 눌러 작업 지도로 이동"><path d="M942 395v75M1030 395v75" stroke="#8c704e" strokeWidth="12" strokeLinecap="round"/><rect x="915" y="337" width="146" height="75" rx="18" fill="#fff1ca" stroke="#97734b" strokeWidth="6"/><text x="988" y="385" textAnchor="middle" className="sign-text">일하기</text><path d="M1037 359l18 15-18 15" fill="none" stroke="#cf8660" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></g>
    <CharacterLayer mapId="hub" position={position} face={face} moving={moving} target={target} />
  </svg>;
}

function MarketMap({ position, face, moving, target, onClick }: MapProps) {
  return <svg className="town-map" viewBox="0 0 1200 800" role="application" aria-label="길 양쪽에 가게 건물이 있는 시장 마을" onClick={onClick}>
    <defs><pattern id="marketGrass" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="1.4" fill="#b7d6a8" opacity=".48"/><circle cx="27" cy="30" r="1.5" fill="#b3d3a2" opacity=".45"/></pattern><filter id="marketShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#536d48" floodOpacity=".16"/></filter></defs>
    <rect width="1200" height="800" fill="#e8f2df"/><rect width="1200" height="800" fill="url(#marketGrass)"/><path d="M0 0h1200v102q-210 80-415 5t-410 0T0 106z" fill="#d8eacb" />
    <RoadPaths mapId="market_map" />
    <StoreBuilding id="produce" x={196} y={82} sign="채소·과일" roof="#e89462" fill="#fff3c9" items="🥕　🍎" />
    <StoreBuilding id="fish" x={196} y={456} sign="물고기" roof="#70aeb2" fill="#e4f5ed" items="🐟　🐠" />
    <StoreBuilding id="firewood" x={824} y={82} sign="장작" roof="#9d7656" fill="#f7ead6" items="🪵　🪓" />
    <StoreBuilding id="wool" x={824} y={456} sign="털 가게" roof="#b588c1" fill="#f2eafa" items="🐑　🧶" />
    <g className="market-street-decor" aria-hidden="true"><circle cx="600" cy="400" r="52" fill="#d2e5c5" stroke="#b3cba3" strokeWidth="4"/><circle cx="600" cy="400" r="31" fill="#fff1d5"/><text x="600" y="408" textAnchor="middle" fontSize="24">🌼</text></g>
    <CharacterLayer mapId="market_map" position={position} face={face} moving={moving} target={target} />
  </svg>;
}

function StoreBuilding({ id, x, y, sign, roof, fill, items }: { id: ShopId; x: number; y: number; sign: string; roof: string; fill: string; items: string }) {
  return <g className="market-building" data-building={id} role="button" tabIndex={0} aria-label={`${sign} 가게에 가기`} filter="url(#marketShadow)">
    <ellipse className="building-ground" cx={x + 92} cy={y + 132} rx="112" ry="19" />
    <rect x={x + 12} y={y + 21} width="160" height="105" rx="18" fill={fill} stroke="#ac9364" strokeWidth="5" />
    <path d={`M${x} ${y + 45}l92-69 92 69z`} fill={roof} stroke="#9b7353" strokeWidth="5" />
    <rect x={x + 31} y={y + 64} width="33" height="49" rx="13" fill="#b9ded0" />
    <rect x={x + 77} y={y + 64} width="33" height="49" rx="13" fill="#b9ded0" />
    <rect x={x + 126} y={y + 61} width="34" height="65" rx="16" fill="#c68361" />
    <text x={x + 92} y={y + 39} textAnchor="middle" className="building-sign">{sign}</text>
    <text x={x + 92} y={y + 153} textAnchor="middle" className="map-label-small">{items}</text>
  </g>;
}

function WorkMap({ position, face, moving, target, onClick }: MapProps) {
  return <svg className="town-map" viewBox="0 0 1200 800" role="application" aria-label="양 우리, 밭, 나무와 연못이 있는 작업 지도" onClick={onClick}>
    <defs><pattern id="workGrass" width="42" height="42" patternUnits="userSpaceOnUse"><circle cx="7" cy="9" r="1.5" fill="#b5d3a3" opacity=".55"/><circle cx="30" cy="27" r="1.3" fill="#b4d3a3" opacity=".5"/></pattern><pattern id="cropRows" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)"><rect width="24" height="24" fill="#d5e9b8"/><path d="M0 5H24M0 17H24" stroke="#99bd78" strokeWidth="3"/></pattern></defs>
    <rect width="1200" height="800" fill="#e8f2df"/><rect width="1200" height="800" fill="url(#workGrass)"/><path d="M0 0h1200v105q-200 70-400 0T400 105T0 105z" fill="#d8e9ca" />
    <RoadPaths mapId="work_map" />
    <g className="work-zone" data-zone="sheep_pen" role="button" tabIndex={0} aria-label="양 우리 구역 선택"><ellipse className="zone-ground" cx="239" cy="553" rx="136" ry="84"/><rect x="124" y="480" width="231" height="143" rx="26" fill="#fff8e7" stroke="#cbb58f" strokeWidth="6"/><path d="M140 509h198M140 533h198M140 557h198" stroke="#cfb996" strokeWidth="5" strokeDasharray="12 9"/><text x="239" y="507" textAnchor="middle" className="zone-title">양 우리</text><text x="239" y="610" textAnchor="middle" className="zone-caption">🐑 양털 깎기</text><text x="239" y="567" textAnchor="middle" fontSize="42" aria-hidden="true">🐑</text></g>
    <g className="work-zone" data-zone="field" role="button" tabIndex={0} aria-label="밭 구역 선택"><ellipse className="zone-ground" cx="961" cy="552" rx="138" ry="84"/><rect x="846" y="478" width="231" height="147" rx="25" fill="url(#cropRows)" stroke="#91b374" strokeWidth="6"/><text x="961" y="506" textAnchor="middle" className="zone-title">보리 밭</text><text x="961" y="609" textAnchor="middle" className="zone-caption">🌾 밭 가꾸기</text></g>
    <g className="work-zone" data-zone="grove" role="button" tabIndex={0} aria-label="나무 구역 선택"><ellipse className="zone-ground" cx="960" cy="230" rx="137" ry="82"/><rect x="836" y="158" width="249" height="145" rx="28" fill="#e7f0dc" stroke="#b8cfa5" strokeWidth="6"/><text x="961" y="190" textAnchor="middle" className="zone-title">과일 나무 숲</text><text x="961" y="286" textAnchor="middle" className="zone-caption">🍎 과일 · 🪵 나무</text><text x="961" y="247" textAnchor="middle" fontSize="43" aria-hidden="true">🌳　🍎</text></g>
    <g className="work-zone" data-zone="pond" role="button" tabIndex={0} aria-label="연못 구역 선택"><ellipse className="zone-ground" cx="600" cy="587" rx="126" ry="94"/><ellipse cx="600" cy="580" rx="112" ry="70" fill="#a8d9d5" stroke="#6eaaa3" strokeWidth="6"/><ellipse cx="600" cy="580" rx="86" ry="50" fill="#c0e8df"/><path d="M535 578q15-12 30 0t30 0m47 18q14-11 28 0t28 0" fill="none" stroke="#76b7ae" strokeWidth="5" strokeLinecap="round"/><text x="600" y="526" textAnchor="middle" className="zone-title">작은 연못</text><text x="600" y="647" textAnchor="middle" className="zone-caption">🎣 낚시</text></g>
    <CharacterLayer mapId="work_map" position={position} face={face} moving={moving} target={target} />
  </svg>;
}

function RoadPaths({ mapId }: { mapId: MapId }) {
  const map = MAPS[mapId];
  const d = map.edges.map(([from, to]) => `M${map.nodes[from].x} ${map.nodes[from].y}L${map.nodes[to].x} ${map.nodes[to].y}`).join("");
  return <>
    <g className="road-layer road-shadow" aria-hidden="true"><path d={d} /></g>
    <g className="road-layer road-surface" aria-hidden="true"><path d={d} /></g>
    <g className="road-layer road-center" aria-hidden="true"><path d={d} /></g>
    <g className="road-crossing" aria-hidden="true"><circle cx="600" cy="400" r="51"/><circle cx="600" cy="400" r="32"/></g>
  </>;
}

function CharacterLayer({ mapId, position, face, moving, target }: { mapId: MapId; position: Point; face: Face; moving: boolean; target: Point | null }) {
  return <>
    {target && <circle className="destination-pulse" cx={target.x} cy={target.y} r={17} aria-hidden="true"/>}
    <Panda position={position} face={face} moving={moving}/>
  </>;
}

function Panda({ position, face, moving }: { position: Point; face: Face; moving: boolean }) {
  return <g className={`panda-character${moving ? " is-walking" : ""}`} transform={`translate(${position.x} ${position.y})`} data-facing={face} aria-label="판다 캐릭터">
    <ellipse className="panda-shadow" cx="0" cy="-1" rx="25" ry="8" />
    <g className="panda-body"><path d="M-18-27q-4-8 2-15h32q6 7 2 15l-2 17h-32z" fill="#fdfdf7" stroke="#33443b" strokeWidth="3"/><path d="M-14-29h28v16q-14 8-28 0z" fill="#80b884" stroke="#33443b" strokeWidth="2.5"/><path d="M-8-29v10m16-10v10" stroke="#f7d98c" strokeWidth="4" strokeLinecap="round"/><ellipse cx="-12" cy="-8" rx="9" ry="5" fill="#2c3933"/><ellipse cx="12" cy="-8" rx="9" ry="5" fill="#2c3933"/><circle cx="-17" cy="-60" r="12" fill="#26352f"/><circle cx="17" cy="-60" r="12" fill="#26352f"/><ellipse cx="0" cy="-48" rx="27" ry="25" fill="#fffdf7" stroke="#33443b" strokeWidth="3"/><ellipse cx="-10" cy="-49" rx="7" ry="10" fill="#26352f"/><ellipse cx="10" cy="-49" rx="7" ry="10" fill="#26352f"/><circle cx="-9" cy="-49" r="2" fill="#fff"/><circle cx="9" cy="-49" r="2" fill="#fff"/><ellipse cx="0" cy="-40" rx="4" ry="3" fill="#26352f"/><path d="M0-37q-4 6-8 2m8-2q4 6 8 2" fill="none" stroke="#26352f" strokeWidth="2" strokeLinecap="round"/><ellipse cx="-19" cy="-39" rx="5" ry="2.5" fill="#eea69a"/><ellipse cx="19" cy="-39" rx="5" ry="2.5" fill="#eea69a"/></g>
    <g className="panda-back" aria-hidden="true"><circle cx="0" cy="-48" r="26" fill="#fffdf7" stroke="#33443b" strokeWidth="3"/><circle cx="-18" cy="-65" r="12" fill="#26352f"/><circle cx="18" cy="-65" r="12" fill="#26352f"/><ellipse cx="0" cy="-11" rx="19" ry="22" fill="#fffdf7" stroke="#33443b" strokeWidth="3"/><path d="M-14-27h28v16q-14 8-28 0z" fill="#80b884" stroke="#33443b" strokeWidth="2.5"/></g>
  </g>;
}

function MapCanvas({ mapId, position, face, moving, target, onMapClick }: { mapId: MapId; position: Point; face: Face; moving: boolean; target: Point | null; onMapClick: (mapId: MapId, event: MouseEvent<SVGSVGElement>) => void }) {
  const click = (event: MouseEvent<SVGSVGElement>) => onMapClick(mapId, event);
  if (mapId === "hub") return <HubMap position={position} face={face} moving={moving} target={target} onClick={click}/>;
  if (mapId === "market_map") return <MarketMap position={position} face={face} moving={moving} target={target} onClick={click}/>;
  return <WorkMap position={position} face={face} moving={moving} target={target} onClick={click}/>;
}

type MapProps = { position: Point; face: Face; moving: boolean; target: Point | null; onClick: (event: MouseEvent<SVGSVGElement>) => void };

function GameMapFrame({ mapId, position, face, moving, target, onMapClick, hint }: { mapId: MapId; position: Point; face: Face; moving: boolean; target: Point | null; onMapClick: (mapId: MapId, event: MouseEvent<SVGSVGElement>) => void; hint: string }) {
  return <div className="map-frame"><MapCanvas mapId={mapId} position={position} face={face} moving={moving} target={target} onMapClick={onMapClick}/><div className="map-hint">{hint}</div></div>;
}

export default function GameClient() {
  const [game, setGameState] = useState<GameData>(() => emptyGameData());
  const gameRef = useRef(game);
  const [hydrated, setHydrated] = useState(false);
  const [scene, setScene] = useState<SceneId>("hub");
  const [shopId, setShopId] = useState<ShopId | null>(null);
  const [workAreaId, setWorkAreaId] = useState<LocationId | null>(null);
  const [basketOpen, setBasketOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [toast, setToast] = useState("");
  const [now, setNow] = useState(0);
  const [movingMap, setMovingMap] = useState<MapId | null>(null);
  const [faces, setFaces] = useState<Record<MapId, Face>>({ hub: "down", market_map: "down", work_map: "down" });
  const [targets, setTargets] = useState<Partial<Record<MapId, Point | null>>>({});
  const routeRef = useRef<Route | null>(null);
  const completingJobRef = useRef<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const completionHandlerRef = useRef<() => void>(() => undefined);
  const commitGame = useCallback((updater: (previous: GameData) => GameData) => {
    const next = updater(gameRef.current);
    gameRef.current = next;
    setGameState(next);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const loaded = normalizeGameData(JSON.parse(raw));
        gameRef.current = loaded;
        setGameState(loaded);
      }
    } catch {
      // 손상되었거나 차단된 브라우저 저장 데이터는 새 게임으로 시작한다.
    }
    setHydrated(true);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); }
      catch { /* 저장 공간 사용이 차단되어도 현재 세션 플레이는 가능 */ }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [game, hydrated]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2300);
  }, []);

  const showScene = useCallback((next: SceneId) => {
    routeRef.current = null;
    setMovingMap(null);
    setTargets({});
    setBasketOpen(false);
    setScene(next);
    if (next !== "shop") setShopId(null);
    if (next !== "work_area") setWorkAreaId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const completeJob = useCallback(() => {
    const job = gameRef.current.activeJob;
    if (!job || Date.now() - job.startedAt < WORK_MS) return;
    const eventKey = `${job.activityId}:${job.startedAt}`;
    if (completingJobRef.current === eventKey) return;
    completingJobRef.current = eventKey;
    const activity = ACTIVITIES.find((entry) => entry.id === job.activityId);
    if (!activity) return;
    const item = ITEMS.find((entry) => entry.id === activity.item)!;
    commitGame((previous) => ({
      ...previous,
      activeJob: null,
      inventory: { ...previous.inventory, [item.id]: (previous.inventory[item.id] ?? 0) + activity.quantity },
      transactions: [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, type: "gather" as const, itemId: item.id, quantity: activity.quantity, totalPrice: 0, createdAt: new Date().toISOString() }, ...previous.transactions].slice(0, 100),
    }));
    notify(`${item.icon} ${item.name} ${activity.quantity}개를 모았어요!`);
    window.setTimeout(() => { completingJobRef.current = null; }, 0);
  }, [commitGame, notify]);
  completionHandlerRef.current = completeJob;

  useEffect(() => {
    let animation = 0;
    let previousFrame = 0;
    let lastPublish = 0;
    const frame = (timestamp: number) => {
      const delta = previousFrame ? Math.min((timestamp - previousFrame) / 1000, 0.05) : 0;
      previousFrame = timestamp;
      const route = routeRef.current;
      if (route && scene === route.mapId) {
        let budget = WALK_SPEED * delta;
        let moved = false;
        while (budget > 0 && route.index < route.points.length) {
          const target = route.points[route.index];
          const dx = target.x - route.position.x;
          const dy = target.y - route.position.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 0.8) { route.position = { ...target }; route.index += 1; continue; }
          const step = Math.min(budget, distance);
          const next = { x: route.position.x + dx / distance * step, y: route.position.y + dy / distance * step };
          if (!isOnRoad(route.mapId, next, ROAD_RADIUS + 3)) {
            routeRef.current = null;
            setMovingMap(null);
            setTargets((old) => ({ ...old, [route.mapId]: null }));
            notify("그 길로는 갈 수 없어요. 다른 곳을 클릭해 주세요.");
            break;
          }
          route.position = next;
          budget -= step;
          moved = true;
          const face: Face = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
          setFaces((old) => old[route.mapId] === face ? old : { ...old, [route.mapId]: face });
          if (step >= distance) route.index += 1;
        }
        if (route.index >= route.points.length && routeRef.current === route) {
          routeRef.current = null;
          setMovingMap(null);
          setTargets((old) => ({ ...old, [route.mapId]: null }));
          commitGame((previous) => ({ ...previous, positions: { ...previous.positions, [route.mapId]: { ...route.position } } }));
          if (route.arrival?.type === "shop") { setShopId(route.arrival.id); showScene("shop"); }
          if (route.arrival?.type === "work") { setWorkAreaId(route.arrival.id); showScene("work_area"); }
        } else if (moved && timestamp - lastPublish > 45) {
          lastPublish = timestamp;
          commitGame((previous) => ({ ...previous, positions: { ...previous.positions, [route.mapId]: { ...route.position } } }));
        }
      }

      const job = gameRef.current.activeJob;
      if (job && Date.now() - job.startedAt >= WORK_MS) completionHandlerRef.current();
      if (timestamp % 100 < 20) setNow(Date.now());
      animation = window.requestAnimationFrame(frame);
    };
    animation = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(animation);
  }, [scene, notify, showScene, commitGame]);

  const routeTo = (mapId: MapId, requested: Point, arrival: Arrival = null) => {
    const current = routeRef.current?.mapId === mapId ? routeRef.current.position : gameRef.current.positions[mapId];
    const startProjection = getMapProjection(mapId, current);
    const endProjection = getMapProjection(mapId, requested);
    if (!startProjection || !endProjection) return;
    const destination = endProjection.projection;
    const candidates: { cost: number; points: Point[] }[] = [];
    const sameEdge = (startProjection.from === endProjection.from && startProjection.to === endProjection.to) || (startProjection.from === endProjection.to && startProjection.to === endProjection.from);
    if (sameEdge) candidates.push({ cost: pointDistance(current, startProjection.projection) + pointDistance(startProjection.projection, destination), points: [current, startProjection.projection, destination] });

    for (const startNode of [startProjection.from, startProjection.to]) {
      for (const endNode of [endProjection.from, endProjection.to]) {
        const nodePath = getShortestNodePath(mapId, startNode, endNode);
        if (!nodePath.length) continue;
        const cost = pointDistance(current, startProjection.projection)
          + pointDistance(startProjection.projection, MAPS[mapId].nodes[startNode])
          + mapPathLength(mapId, nodePath)
          + pointDistance(MAPS[mapId].nodes[endNode], destination);
        candidates.push({ cost, points: [current, startProjection.projection, MAPS[mapId].nodes[startNode], ...nodePath.slice(1).map((id) => MAPS[mapId].nodes[id]), destination] });
      }
    }
    candidates.sort((a, b) => a.cost - b.cost);
    const best = candidates[0];
    if (!best) { notify("그곳으로 가는 길을 찾을 수 없어요."); return; }
    const points = best.points.filter((point, index, all) => index === 0 || pointDistance(point, all[index - 1]) > 1);
    setTargets((old) => ({ ...old, [mapId]: destination }));
    if (points.length < 2) {
      if (arrival?.type === "shop") { setShopId(arrival.id); showScene("shop"); }
      if (arrival?.type === "work") { setWorkAreaId(arrival.id); showScene("work_area"); }
      return;
    }
    routeRef.current = { mapId, points, index: 1, position: { ...current }, arrival };
    setMovingMap(mapId);
  };

  const handleMapClick = (mapId: MapId, event: MouseEvent<SVGSVGElement>) => {
    const element = event.target as Element;
    const transition = element.closest<SVGGElement>("[data-transition]");
    if (transition) { showScene(transition.dataset.transition as SceneId); return; }
    const building = element.closest<SVGGElement>("[data-building]");
    if (building && mapId === "market_map") {
      routeTo("market_map", MAPS.market_map.nodes[building.dataset.building as ShopId], { type: "shop", id: building.dataset.building as ShopId });
      return;
    }
    const zone = element.closest<SVGGElement>("[data-zone]");
    if (zone && mapId === "work_map") {
      const locationId = zone.dataset.zone as LocationId;
      routeTo("work_map", LOCATIONS[locationId].entrance, { type: "work", id: locationId });
      return;
    }
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    routeTo(mapId, { x: point.x, y: point.y });
  };

  const startActivity = (activityId: ActivityId) => {
    if (gameRef.current.activeJob) { notify("지금 하는 일이 끝나면 다시 시작할 수 있어요."); return; }
    commitGame((previous) => ({ ...previous, activeJob: { activityId, startedAt: Date.now() } }));
    completingJobRef.current = null;
    notify(`${ACTIVITIES.find((activity) => activity.id === activityId)?.name} 시작! 5초만 기다려 주세요.`);
  };

  const getProductQuantity = (itemId: Item["id"], type: "buy" | "sell") => {
    const input = document.getElementById(`${type}-${itemId}`) as HTMLInputElement | null;
    const quantity = Number(input?.value);
    if (!Number.isSafeInteger(quantity) || quantity < 1) { notify("수량은 1 이상의 정수로 입력해 주세요."); input?.focus(); return null; }
    return quantity;
  };

  const trade = (type: "buy" | "sell", itemId: Item["id"], categoryId: ShopId) => {
    const item = ITEMS.find((entry) => entry.id === itemId);
    if (!item || item.category !== categoryId) { notify("이 가게에서 취급하지 않는 상품이에요."); return; }
    const quantity = getProductQuantity(itemId, type);
    if (quantity === null) return;
    const total = (type === "buy" ? item.buy : item.sell) * quantity;
    if (!Number.isSafeInteger(total)) { notify("거래 금액이 너무 커요. 수량을 줄여 주세요."); return; }
    if (type === "buy") {
      if (game.cash < total) { notify(`돈이 부족해요. ${formatWon(total)}이 필요해요.`); return; }
      commitGame((previous) => ({
        ...previous,
        cash: previous.cash - total,
        inventory: { ...previous.inventory, [itemId]: (previous.inventory[itemId] ?? 0) + quantity },
        transactions: [{ id: `${Date.now()}`, type: "buy" as const, itemId, quantity, totalPrice: total, createdAt: new Date().toISOString() }, ...previous.transactions].slice(0, 100),
      }));
      notify(`${item.icon} ${item.name} ${quantity}개를 샀어요!`);
      return;
    }
    const owned = game.inventory[itemId] ?? 0;
    if (owned < quantity) { notify(`가방에 ${item.name}이(가) ${owned}개 있어요.`); return; }
    commitGame((previous) => {
      const newInventory = { ...previous.inventory, [itemId]: (previous.inventory[itemId] ?? 0) - quantity };
      if (!newInventory[itemId]) delete newInventory[itemId];
      return { ...previous, inventory: newInventory, cash: previous.cash + total, transactions: [{ id: `${Date.now()}`, type: "sell" as const, itemId, quantity, totalPrice: total, createdAt: new Date().toISOString() }, ...previous.transactions].slice(0, 100) };
    });
    notify(`${item.icon} ${item.name} ${quantity}개를 팔아 ${formatWon(total)}을 받았어요!`);
  };

  const activeJob = game.activeJob;
  const remaining = activeJob ? Math.max(0, WORK_MS - (now - activeJob.startedAt)) : 0;
  const totalItemCount = ITEMS.reduce((sum, item) => sum + (game.inventory[item.id] ?? 0), 0);

  if (!hydrated) return <div className="app-shell app-loading"><span className="loading-mark">🌱</span><p>초록마을을 준비하고 있어요…</p></div>;

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" type="button" onClick={() => showScene("hub")} aria-label="시작 마을로"><span className="brand-mark" aria-hidden="true">🌱</span><span className="brand-copy"><strong>초록마을</strong><small>시장놀이</small></span></button>
      <div className="scene-crumb">{scene === "hub" ? "초록마을" : scene === "market_map" ? "시장 골목" : scene === "work_map" ? "일하는 마을" : scene === "shop" ? shopId ? SHOP_BY_ID[shopId].name : "가게" : workAreaId ? LOCATIONS[workAreaId].name : "작업 장소"}</div>
      <div className="topbar-actions"><div className="wallet" aria-live="polite"><span aria-hidden="true">🪙</span><span><small>내 지갑</small><strong>{formatWon(game.cash)}</strong></span></div><button className="basket-button" id="basketButton" type="button" onClick={() => setBasketOpen(true)} aria-label="가방 열기" aria-expanded={basketOpen}><span aria-hidden="true">🧺</span><span className="basket-count">{formatNumber(totalItemCount)}</span></button></div>
    </header>

    {activeJob && <div className="global-job" aria-live="polite"><span className="global-job-icon">{ACTIVITY_BY_ID[activeJob.activityId].icon}</span><div className="global-job-content"><strong>{ACTIVITY_BY_ID[activeJob.activityId].name} 진행 중</strong><div className="progress-track"><div className="progress-fill" style={{ width: `${((WORK_MS - remaining) / WORK_MS) * 100}%` }}/></div></div><span className="global-job-time">{(remaining / 1000).toFixed(1)}초</span></div>}

    <main className="main-content">
      {scene === "hub" && <section className="scene scene-map active" aria-label="시작 마을"><SceneHeading eyebrow="어서 와요, 초록마을!" title="오늘은 어디로 가볼까요?" description="길을 클릭하면 판다가 그곳까지 걸어가요. 양옆 팻말로 다른 마을에 갈 수 있어요." mood="☀️"/><div className="map-frame"><MapCanvas mapId="hub" position={game.positions.hub} face={faces.hub} moving={movingMap === "hub"} target={targets.hub ?? null} onMapClick={handleMapClick}/><div className="map-hint">길을 클릭해 산책하거나 좌우 팻말을 눌러 이동하세요.</div></div></section>}

      {scene === "market_map" && <section className="scene scene-map active" aria-label="시장 마을"><SceneHeading eyebrow="초록마을 시장 골목" title="어느 가게에 가볼까요?" description="가게 건물을 클릭하면 판다가 입구까지 걸어가요." backLabel="← 마을로" onBack={() => showScene("hub")}/><div className="map-frame"><MapCanvas mapId="market_map" position={game.positions.market_map} face={faces.market_map} moving={movingMap === "market_map"} target={targets.market_map ?? null} onMapClick={handleMapClick}/><div className="map-hint">길 위를 클릭해 이동하고, 가게 건물을 클릭해 들어가세요.</div></div></section>}

      {scene === "work_map" && <section className="scene scene-map active" aria-label="작업 구역 지도"><SceneHeading eyebrow="초록마을 일터" title="어디에서 일해볼까요?" description="구역을 누르면 판다가 걸어가서 그곳을 크게 보여줘요." backLabel="← 마을로" onBack={() => showScene("hub")}/><div className="map-frame"><MapCanvas mapId="work_map" position={game.positions.work_map} face={faces.work_map} moving={movingMap === "work_map"} target={targets.work_map ?? null} onMapClick={handleMapClick}/><div className="map-hint">구역을 클릭하면 판다가 입구까지 걸어가요.</div></div></section>}

      {scene === "shop" && shopId && <section className="scene scene-content active" aria-label={`${SHOP_BY_ID[shopId].name} 상품`}><SceneHeading eyebrow="시장 마을 · 가게 안" title={SHOP_BY_ID[shopId].name} description={SHOP_BY_ID[shopId].description} backLabel="← 시장 거리로" onBack={() => showScene("market_map")}/><div className="shop-interior-banner"><span className="shop-large-icon" aria-hidden="true">{SHOP_BY_ID[shopId].icon}</span><div><strong>{SHOP_BY_ID[shopId].name}</strong><small>필요한 물건을 사고, 모은 물건을 팔아보세요.</small></div></div><div className="product-grid">{SHOP_BY_ID[shopId].itemIds.map((itemId) => <ProductCard key={itemId} item={ITEMS.find((item) => item.id === itemId)!} quantity={game.inventory[itemId] ?? 0} onTrade={trade}/>)}</div></section>}

      {scene === "work_area" && workAreaId && <section className="scene scene-content active" aria-label={`${LOCATIONS[workAreaId].name} 작업 화면`}><SceneHeading eyebrow="일터 · 자세히 보기" title={LOCATIONS[workAreaId].name} description={LOCATIONS[workAreaId].detail} backLabel="← 작업 지도" onBack={() => showScene("work_map")}/><div className="work-detail-layout"><div className={`work-illustration work-illustration-${LOCATIONS[workAreaId].type}`} aria-hidden="true"><span className="detail-sun">☀️</span><span className="detail-scenery">{{ sheep: "🐑　🐑　🌿　🐑", field: "🌾　🌱　🌾　🌱", grove: "🌳　🍎　🌳　🪵", pond: "🌿　🐟　💧　🌱" }[LOCATIONS[workAreaId].type]}</span><span className="detail-panda">🐼</span><span className="detail-caption">{LOCATIONS[workAreaId].name}</span></div><div className="work-actions-panel"><span className="eyebrow">이곳에서 할 수 있는 일</span><div className="work-action-list">{LOCATIONS[workAreaId].actions.map((activityId) => <WorkAction key={activityId} activity={ACTIVITY_BY_ID[activityId]} disabled={Boolean(activeJob)} active={activeJob?.activityId === activityId} onStart={startActivity}/>)}</div></div></div><button className="subtle-back" type="button" onClick={() => showScene("hub")}>마을로 돌아가기</button></section>}

      <footer className="footer"><span>🌿 초록마을 시장놀이</span><span>천천히 모으고, 즐겁게 나누어요.</span></footer>
    </main>

    {basketOpen && <><button className="drawer-scrim" type="button" aria-label="가방 닫기" onClick={() => setBasketOpen(false)}/><aside className="inventory-drawer is-open" aria-label="내 가방"><div className="drawer-heading"><div><span className="eyebrow">내 소지품</span><h2>가방 속 물건</h2></div><button className="icon-close" type="button" onClick={() => setBasketOpen(false)} aria-label="가방 닫기">×</button></div><div className="drawer-wallet"><span>🪙</span><div><small>보유한 돈</small><strong>{formatWon(game.cash)}</strong></div></div><div className="drawer-section-title"><strong>모은 물건</strong><span>총 {formatNumber(totalItemCount)}개</span></div><div className="drawer-inventory">{ITEMS.filter((item) => (game.inventory[item.id] ?? 0) > 0).map((item) => <div className="drawer-item" key={item.id}><span className="drawer-item-icon">{item.icon}</span><div><strong>{item.name} · {formatNumber(game.inventory[item.id] ?? 0)}개</strong><small>판매가 {formatWon(item.sell)}</small></div><button type="button" onClick={() => { setShopId(item.category); showScene("shop"); }}>가게로 이동</button></div>)}{totalItemCount === 0 && <div className="drawer-empty">아직 모은 물건이 없어요.<br/>일터에서 자원을 모아보세요!</div>}</div><div className="drawer-section-title recent-title"><strong>최근 활동</strong><button className="text-button" type="button" onClick={() => setHistoryExpanded((value) => !value)}>{historyExpanded ? "접기" : "모두 보기"}</button></div><div className="drawer-history">{game.transactions.slice(0, historyExpanded ? 100 : 5).map((transaction) => { const item = ITEM_BY_ID[transaction.itemId]; const label = transaction.type === "gather" ? "모으기" : transaction.type === "buy" ? "구매" : "판매"; const value = transaction.type === "gather" ? `${item.icon} +${transaction.quantity}개` : `${transaction.type === "sell" ? "+" : "−"}${formatWon(transaction.totalPrice)}`; return <div className="drawer-history-row" key={transaction.id}><span>{label} · {item.name}</span><strong>{value}</strong></div>; })}{game.transactions.length === 0 && <div className="drawer-empty">아직 활동 기록이 없어요.</div>}</div></aside></>}

    {toast && <div className="toast show" role="status" aria-live="polite">{toast}</div>}
  </div>;

}

function SceneHeading({ eyebrow, title, description, mood, backLabel, onBack }: { eyebrow: string; title: string; description: string; mood?: string; backLabel?: string; onBack?: () => void }) {
  return <div className={`scene-heading${backLabel ? " scene-heading-with-back" : ""}`}><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{backLabel && onBack ? <button className="back-button" type="button" onClick={onBack}>{backLabel}</button> : mood && <span className="scene-mood" aria-hidden="true">{mood}</span>}</div>;
}

function ProductCard({ item, quantity, onTrade }: { item: Item; quantity: number; onTrade: (type: "buy" | "sell", itemId: ItemId, category: ShopId) => void }) {
  const [buyQuantity, setBuyQuantity] = useState("1");
  const [sellQuantity, setSellQuantity] = useState("1");
  return <article className="product-card"><span className="item-art" aria-hidden="true">{item.icon}</span><div className="item-info"><h3>{item.name}</h3><p>가방에 {formatNumber(quantity)}개</p><div className="price-lines"><span>구매 <strong>{formatWon(item.buy)}</strong></span><span>판매 <strong>{formatWon(item.sell)}</strong></span></div></div><div className="product-actions"><div className="trade-control"><label htmlFor={`buy-${item.id}`}>구매 수량</label><div className="trade-row"><input id={`buy-${item.id}`} type="number" min="1" step="1" value={buyQuantity} onChange={(event) => setBuyQuantity(event.target.value)} inputMode="numeric"/><button type="button" onClick={() => onTrade("buy", item.id, item.category)}>구매</button></div></div><div className="trade-control sell"><label htmlFor={`sell-${item.id}`}>판매 수량</label><div className="trade-row"><input id={`sell-${item.id}`} type="number" min="1" max={quantity} step="1" value={sellQuantity} onChange={(event) => setSellQuantity(event.target.value)} inputMode="numeric"/><button type="button" disabled={quantity < 1} onClick={() => onTrade("sell", item.id, item.category)}>판매</button></div></div></div></article>;
}

function WorkAction({ activity, disabled, active, onStart }: { activity: (typeof ACTIVITIES)[number]; disabled: boolean; active: boolean; onStart: (id: ActivityId) => void }) {
  const item = ITEMS.find((entry) => entry.id === activity.item)!;
  return <article className="work-action-card"><span className="work-action-icon" aria-hidden="true">{activity.icon}</span><div className="work-action-copy"><strong>{activity.name}</strong><small>{item.icon} {item.name} {activity.quantity}개 · 5초</small></div><button className="action-button" type="button" disabled={disabled} onClick={() => onStart(activity.id)}>{active ? "진행 중" : "일하기"}</button></article>;
}
