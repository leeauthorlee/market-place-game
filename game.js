(() => {
  'use strict';

  const SAVE_KEY = 'green-village-market-v1';
  const WORK_MS = 5000;
  const MAP_W = 1200;
  const MAP_H = 800;
  const ROAD_RADIUS = 49;
  const WALK_SPEED = 180;

  const items = [
    { id: 'wool', name: '양털', icon: '🧶', category: 'wool', buy: 15, sell: 10 },
    { id: 'barley', name: '보리', icon: '🌾', category: 'produce', buy: 8, sell: 5 },
    { id: 'apple', name: '사과', icon: '🍎', category: 'produce', buy: 8, sell: 5 },
    { id: 'wood', name: '나무', icon: '🪵', category: 'firewood', buy: 12, sell: 8 },
    { id: 'carp', name: '붕어', icon: '🐟', category: 'fish', buy: 20, sell: 14 },
  ];
  const shops = [
    { id: 'produce', name: '채소·과일 가게', icon: '🥕', description: '밭에서 거둔 작물과 달콤한 과일', itemIds: ['barley', 'apple'] },
    { id: 'fish', name: '물고기 가게', icon: '🐟', description: '연못에서 잡은 싱싱한 물고기', itemIds: ['carp'] },
    { id: 'firewood', name: '장작 가게', icon: '🪵', description: '마을 숲에서 모은 나무와 장작', itemIds: ['wood'] },
    { id: 'wool', name: '털 가게', icon: '🧶', description: '양 우리에서 얻은 포근한 양털', itemIds: ['wool'] },
  ];
  const locations = {
    sheep_pen: { name: '양 우리', icon: '🐑', detail: '양들이 모여 있는 우리에서 양털을 깎아요.', node: 'sheep', entrance: { x: 200, y: 650 }, type: 'sheep', actions: ['shearing'] },
    field: { name: '보리 밭', icon: '🌾', detail: '초록빛 밭을 가꾸고 보리를 수확해요.', node: 'field', entrance: { x: 1000, y: 650 }, type: 'field', actions: ['farming'] },
    grove: { name: '나무 구역', icon: '🌳', detail: '나무에서 과일을 따거나 나무를 모아요.', node: 'grove', entrance: { x: 1000, y: 150 }, type: 'grove', actions: ['fruit_gathering', 'wood_gathering'] },
    pond: { name: '작은 연못', icon: '🎣', detail: '잔잔한 연못에서 붕어를 낚아봐요.', node: 'pond', entrance: { x: 600, y: 690 }, type: 'pond', actions: ['fishing'] },
  };
  const activities = [
    { id: 'shearing', name: '양털 깎기', location: 'sheep_pen', icon: '🐑', item: 'wool', quantity: 2 },
    { id: 'farming', name: '밭 가꾸기', location: 'field', icon: '🌱', item: 'barley', quantity: 3 },
    { id: 'fruit_gathering', name: '과일 채집', location: 'grove', icon: '🍎', item: 'apple', quantity: 2 },
    { id: 'wood_gathering', name: '나무 채집', location: 'grove', icon: '🌳', item: 'wood', quantity: 1 },
    { id: 'fishing', name: '낚시', location: 'pond', icon: '🎣', item: 'carp', quantity: 1 },
  ];

  // 각 SVG에 그려지는 도로는 아래 노드/선분 데이터에서 생성한다.
  const maps = {
    hub: {
      start: { x: 600, y: 400 },
      nodes: {
        center: { x: 600, y: 400 }, north: { x: 600, y: 70 }, south: { x: 600, y: 730 }, west: { x: 90, y: 400 }, east: { x: 1110, y: 400 },
        nw1: { x: 430, y: 310 }, nw2: { x: 340, y: 220 }, ne1: { x: 770, y: 310 }, ne2: { x: 860, y: 220 },
        sw1: { x: 430, y: 500 }, sw2: { x: 340, y: 600 }, se1: { x: 770, y: 500 }, se2: { x: 860, y: 600 },
      },
      edges: [['center', 'north'], ['center', 'south'], ['center', 'west'], ['center', 'east'], ['center', 'nw1'], ['nw1', 'nw2'], ['center', 'ne1'], ['ne1', 'ne2'], ['center', 'sw1'], ['sw1', 'sw2'], ['center', 'se1'], ['se1', 'se2']],
    },
    market_map: {
      start: { x: 600, y: 400 },
      nodes: {
        center: { x: 600, y: 400 }, north: { x: 600, y: 75 }, south: { x: 600, y: 725 }, left: { x: 400, y: 400 }, west: { x: 90, y: 400 }, right: { x: 800, y: 400 }, east: { x: 1110, y: 400 },
        produce: { x: 400, y: 260 }, fish: { x: 400, y: 560 }, firewood: { x: 800, y: 260 }, wool: { x: 800, y: 560 },
      },
      edges: [['center', 'north'], ['center', 'south'], ['center', 'left'], ['left', 'west'], ['center', 'right'], ['right', 'east'], ['left', 'produce'], ['left', 'fish'], ['right', 'firewood'], ['right', 'wool']],
    },
    work_map: {
      start: { x: 600, y: 400 },
      nodes: {
        center: { x: 600, y: 400 }, north: { x: 600, y: 70 }, south: { x: 600, y: 730 }, west: { x: 90, y: 400 }, east: { x: 1110, y: 400 },
        sw1: { x: 460, y: 500 }, sw2: { x: 350, y: 620 }, sheep: { x: 200, y: 650 }, pond: { x: 600, y: 690 },
        se1: { x: 750, y: 450 }, se2: { x: 850, y: 550 }, field: { x: 1000, y: 650 }, ne1: { x: 750, y: 350 }, ne2: { x: 850, y: 260 }, grove: { x: 1000, y: 150 },
      },
      edges: [['center', 'north'], ['center', 'south'], ['center', 'west'], ['center', 'east'], ['center', 'sw1'], ['sw1', 'sw2'], ['sw2', 'sheep'], ['center', 'pond'], ['center', 'se1'], ['se1', 'se2'], ['se2', 'field'], ['center', 'ne1'], ['ne1', 'ne2'], ['ne2', 'grove']],
    },
  };

  const itemById = Object.fromEntries(items.map((item) => [item.id, item]));
  const shopById = Object.fromEntries(shops.map((shop) => [shop.id, shop]));
  const activityById = Object.fromEntries(activities.map((activity) => [activity.id, activity]));
  const emptyState = () => ({ cash: 0, inventory: {}, activeJob: null, transactions: [], positions: Object.fromEntries(Object.entries(maps).map(([id, map]) => [id, { ...map.start }])) });

  function pointDistance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function pointSegmentDistance(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
    return pointDistance(point, { x: a.x + t * dx, y: a.y + t * dy });
  }
  function projectOnSegment(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
    return { x: a.x + t * dx, y: a.y + t * dy };
  }
  function isWalkable(mapId, x, y, radius = ROAD_RADIUS) {
    const map = maps[mapId];
    if (!map || x < 0 || x > MAP_W || y < 0 || y > MAP_H) return false;
    return map.edges.some(([from, to]) => pointSegmentDistance({ x, y }, map.nodes[from], map.nodes[to]) <= radius);
  }
  function sanitizePosition(mapId, position) {
    const start = maps[mapId].start;
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return { ...start };
    const p = { x: Math.min(MAP_W, Math.max(0, position.x)), y: Math.min(MAP_H, Math.max(0, position.y)) };
    return isWalkable(mapId, p.x, p.y) ? p : { ...start };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || typeof saved !== 'object') return emptyState();
      const inventory = {};
      for (const item of items) {
        const quantity = Number(saved.inventory?.[item.id] || 0);
        if (Number.isSafeInteger(quantity) && quantity > 0) inventory[item.id] = quantity;
      }
      const positions = { ...(saved.position ? { hub: saved.position } : {}), ...(saved.positions || {}) };
      return {
        cash: Number.isSafeInteger(saved.cash) && saved.cash >= 0 ? saved.cash : 0,
        inventory,
        activeJob: saved.activeJob && activityById[saved.activeJob.activityId] && Number.isFinite(saved.activeJob.startedAt) ? saved.activeJob : null,
        transactions: Array.isArray(saved.transactions) ? saved.transactions.filter((tx) => itemById[tx.itemId] && ['gather', 'buy', 'sell'].includes(tx.type)).slice(0, 100) : [],
        positions: Object.fromEntries(Object.keys(maps).map((id) => [id, sanitizePosition(id, positions[id])])),
      };
    } catch { return emptyState(); }
  }

  let state = loadState();
  let currentScene = 'hub';
  let currentShopId = null;
  let currentWorkAreaId = null;
  let route = null;
  let lastFrame = 0;
  let saveTimer = 0;
  let toastTimer = 0;
  let drawerOpen = false;
  let historyExpanded = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const formatNumber = (number) => new Intl.NumberFormat('ko-KR').format(number);
  const formatWon = (number) => `${formatNumber(number)}원`;
  const getQuantity = (itemId) => Number(state.inventory[itemId] || 0);
  const totalItems = () => items.reduce((sum, item) => sum + getQuantity(item.id), 0);

  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
    catch { showToast('브라우저 저장 공간을 사용할 수 없어요.'); }
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 500); }
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
  }
  function addTransaction(type, itemId, quantity, totalPrice = 0) {
    state.transactions.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, type, itemId, quantity, totalPrice, createdAt: new Date().toISOString() });
    state.transactions = state.transactions.slice(0, 100);
  }

  const pandaSvg = (id) => `<g id="${id}" class="panda-character" transform="translate(600 400)" data-facing="down" aria-label="판다 캐릭터"><ellipse class="panda-shadow" cx="0" cy="-1" rx="25" ry="8"/><g class="panda-body"><path d="M-18-27q-4-8 2-15h32q6 7 2 15l-2 17h-32z" fill="#fdfdf7" stroke="#33443b" stroke-width="3"/><path d="M-14-29h28v16q-14 8-28 0z" fill="#80b884" stroke="#33443b" stroke-width="2.5"/><path d="M-8-29v10m16-10v10" stroke="#f7d98c" stroke-width="4" stroke-linecap="round"/><ellipse cx="-12" cy="-8" rx="9" ry="5" fill="#2c3933"/><ellipse cx="12" cy="-8" rx="9" ry="5" fill="#2c3933"/><circle cx="-17" cy="-60" r="12" fill="#26352f"/><circle cx="17" cy="-60" r="12" fill="#26352f"/><ellipse cx="0" cy="-48" rx="27" ry="25" fill="#fffdf7" stroke="#33443b" stroke-width="3"/><ellipse cx="-10" cy="-49" rx="7" ry="10" fill="#26352f"/><ellipse cx="10" cy="-49" rx="7" ry="10" fill="#26352f"/><circle cx="-9" cy="-49" r="2" fill="#fff"/><circle cx="9" cy="-49" r="2" fill="#fff"/><ellipse cx="0" cy="-40" rx="4" ry="3" fill="#26352f"/><path d="M0-37q-4 6-8 2m8-2q4 6 8 2" fill="none" stroke="#26352f" stroke-width="2" stroke-linecap="round"/><ellipse cx="-19" cy="-39" rx="5" ry="2.5" fill="#eea69a"/><ellipse cx="19" cy="-39" rx="5" ry="2.5" fill="#eea69a"/></g><g class="panda-back" aria-hidden="true"><circle cx="0" cy="-48" r="26" fill="#fffdf7" stroke="#33443b" stroke-width="3"/><circle cx="-18" cy="-65" r="12" fill="#26352f"/><circle cx="18" cy="-65" r="12" fill="#26352f"/><ellipse cx="0" cy="-11" rx="19" ry="22" fill="#fffdf7" stroke="#33443b" stroke-width="3"/><path d="M-14-27h28v16q-14 8-28 0z" fill="#80b884" stroke="#33443b" stroke-width="2.5"/></g></g>`;

  function renderMapLayers() {
    for (const [mapId, map] of Object.entries(maps)) {
      const path = map.edges.map(([a, b]) => `M${map.nodes[a].x} ${map.nodes[a].y}L${map.nodes[b].x} ${map.nodes[b].y}`).join('');
      $$(`[data-roads="${mapId}"]`).forEach((group) => { group.innerHTML = `<path d="${path}"/>`; });
      const prefix = mapId === 'hub' ? 'hub' : mapId === 'market_map' ? 'market' : 'work';
      $(`#${prefix}CharacterLayer`).innerHTML = pandaSvg(`${prefix}Panda`);
      $(`#${prefix}TargetLayer`).innerHTML = '';
      updateCharacter(mapId);
    }
  }

  function updateCharacter(mapId, facing, walking) {
    const prefix = mapId === 'hub' ? 'hub' : mapId === 'market_map' ? 'market' : 'work';
    const character = $(`#${prefix}CharacterLayer .panda-character`);
    if (!character) return;
    const position = state.positions[mapId];
    character.setAttribute('transform', `translate(${position.x.toFixed(2)} ${position.y.toFixed(2)})`);
    if (facing) character.dataset.facing = facing;
    if (walking !== undefined) character.classList.toggle('is-walking', walking);
  }

  function setTarget(mapId, point) {
    const prefix = mapId === 'hub' ? 'hub' : mapId === 'market_map' ? 'market' : 'work';
    const layer = $(`#${prefix}TargetLayer`);
    layer.innerHTML = point ? `<circle class="destination-pulse" cx="${point.x}" cy="${point.y}" r="17"/>` : '';
  }

  function renderScene() {
    const idByScene = { hub: 'hub', market_map: 'market-map', shop: 'shop', work_map: 'work-map', work_area: 'work-area' };
    for (const [scene, id] of Object.entries(idByScene)) {
      const element = $(`#scene-${id}`);
      const active = scene === currentScene;
      element.hidden = !active;
      element.classList.toggle('active', active);
    }
  }

  function renderHeader() {
    $('#cashBalance').textContent = formatWon(state.cash);
    $('#basketCount').textContent = formatNumber(totalItems());
    $('#drawerCash').textContent = formatWon(state.cash);
    $('#drawerItemCount').textContent = `총 ${formatNumber(totalItems())}개`;
    const labels = { hub: '초록마을', market_map: '시장 골목', shop: shopById[currentShopId]?.name || '가게', work_map: '일하는 마을', work_area: locations[currentWorkAreaId]?.name || '작업 장소' };
    $('#sceneCrumb').textContent = labels[currentScene];
  }

  function renderShop() {
    if (!shopById[currentShopId]) return;
    const shop = shopById[currentShopId];
    $('#shopTitle').textContent = shop.name;
    $('#shopDescription').textContent = shop.description;
    $('#shopIcon').textContent = shop.icon;
    $('#shopBannerText').textContent = shop.name;
    $('#shopProducts').innerHTML = shop.itemIds.map((id) => renderProduct(itemById[id])).join('');
  }
  function renderProduct(item) {
    const quantity = getQuantity(item.id);
    return `<article class="product-card"><span class="item-art" aria-hidden="true">${item.icon}</span><div class="item-info"><h3>${item.name}</h3><p>가방에 ${formatNumber(quantity)}개</p><div class="price-lines"><span>구매 <strong>${formatWon(item.buy)}</strong></span><span>판매 <strong>${formatWon(item.sell)}</strong></span></div></div><div class="product-actions"><div class="trade-control"><label for="buy-${item.id}">구매 수량</label><div class="trade-row"><input id="buy-${item.id}" type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="${item.name} 구매 수량"><button type="button" data-trade="buy" data-item="${item.id}" data-category="${item.category}">구매</button></div></div><div class="trade-control sell"><label for="sell-${item.id}">판매 수량</label><div class="trade-row"><input id="sell-${item.id}" type="number" min="1" max="${quantity}" step="1" value="1" inputmode="numeric" aria-label="${item.name} 판매 수량"><button type="button" data-trade="sell" data-item="${item.id}" data-category="${item.category}" ${quantity < 1 ? 'disabled' : ''}>판매</button></div></div></div></article>`;
  }

  function renderWorkArea() {
    if (!locations[currentWorkAreaId]) return;
    const location = locations[currentWorkAreaId];
    $('#workAreaTitle').textContent = location.name;
    $('#workAreaDescription').textContent = location.detail;
    $('#workIllustration').className = `work-illustration work-illustration-${location.type}`;
    const sceneObjects = { sheep: '🐑　🐑　🌿　🐑', field: '🌾　🌱　🌾　🌱', grove: '🌳　🍎　🌳　🪵', pond: '🌿　🐟　💧　🌱' }[location.type];
    $('#workIllustration').innerHTML = `<span class="detail-sun">☀️</span><span class="detail-scenery">${sceneObjects}</span><span class="detail-panda" aria-hidden="true">🐼</span><span class="detail-caption">${location.name}</span>`;
    $('#workActionList').innerHTML = location.actions.map((id) => {
      const activity = activityById[id];
      const item = itemById[activity.item];
      const busy = Boolean(state.activeJob);
      return `<article class="work-action-card"><span class="work-action-icon">${activity.icon}</span><div class="work-action-copy"><strong>${activity.name}</strong><small>${item.icon} ${item.name} ${activity.quantity}개 · 5초</small></div><button class="action-button" type="button" data-start-job="${id}" ${busy ? 'disabled' : ''}>${state.activeJob?.activityId === id ? '진행 중' : '일하기'}</button></article>`;
    }).join('');
  }

  function renderJobStatus() {
    const bar = $('#globalJob');
    if (!state.activeJob) { bar.hidden = true; bar.innerHTML = ''; return; }
    const activity = activityById[state.activeJob.activityId];
    bar.hidden = false;
    bar.innerHTML = `<span class="global-job-icon">${activity.icon}</span><div class="global-job-content"><strong>${activity.name} 진행 중</strong><div class="progress-track"><div class="progress-fill" id="globalJobFill"></div></div></div><span class="global-job-time" id="globalJobTime"></span>`;
    updateJobProgress();
  }
  function updateJobProgress() {
    if (!state.activeJob) return;
    const left = Math.max(0, WORK_MS - (Date.now() - state.activeJob.startedAt));
    const fill = $('#globalJobFill');
    const time = $('#globalJobTime');
    if (fill) fill.style.width = `${Math.min(100, (WORK_MS - left) / WORK_MS * 100)}%`;
    if (time) time.textContent = `${(left / 1000).toFixed(1)}초`;
  }

  function renderDrawer() {
    const owned = items.filter((item) => getQuantity(item.id) > 0);
    $('#drawerInventory').innerHTML = owned.length ? owned.map((item) => `<div class="drawer-item"><span class="drawer-item-icon">${item.icon}</span><div><strong>${item.name} · ${formatNumber(getQuantity(item.id))}개</strong><small>판매가 ${formatWon(item.sell)}</small></div><button type="button" data-open-shop="${item.category}">가게로 이동</button></div>`).join('') : '<div class="drawer-empty">아직 모은 물건이 없어요.<br>일터에서 자원을 모아보세요!</div>';
    const history = state.transactions.slice(0, historyExpanded ? 100 : 5);
    $('#drawerHistory').innerHTML = history.length ? history.map((tx) => {
      const item = itemById[tx.itemId];
      const label = tx.type === 'gather' ? '모으기' : tx.type === 'buy' ? '구매' : '판매';
      const value = tx.type === 'gather' ? `${item.icon} +${tx.quantity}개` : `${tx.type === 'sell' ? '+' : '−'}${formatWon(tx.totalPrice)}`;
      return `<div class="drawer-history-row"><span>${label} · ${item.name}</span><strong>${value}</strong></div>`;
    }).join('') : '<div class="drawer-empty">아직 활동 기록이 없어요.</div>';
    $('#historyButton').textContent = historyExpanded ? '접기' : '모두 보기';
  }

  function renderAll() {
    renderHeader();
    renderScene();
    if (currentScene === 'shop') renderShop();
    if (currentScene === 'work_area') renderWorkArea();
    renderDrawer();
    renderJobStatus();
  }

  function closeDrawer() {
    drawerOpen = false;
    $('#inventoryDrawer').classList.remove('is-open');
    $('#inventoryDrawer').setAttribute('aria-hidden', 'true');
    $('#drawerScrim').hidden = true;
    $('#basketButton').setAttribute('aria-expanded', 'false');
  }
  function openDrawer() {
    drawerOpen = true;
    $('#inventoryDrawer').classList.add('is-open');
    $('#inventoryDrawer').setAttribute('aria-hidden', 'false');
    $('#drawerScrim').hidden = false;
    $('#basketButton').setAttribute('aria-expanded', 'true');
    renderDrawer();
    $('#closeBasket').focus();
  }
  function setScene(scene) {
    if (!['hub', 'market_map', 'shop', 'work_map', 'work_area'].includes(scene)) return;
    route = null;
    currentScene = scene;
    if (scene !== 'shop') currentShopId = null;
    if (scene !== 'work_area') currentWorkAreaId = null;
    closeDrawer();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function shortestPath(mapId, startId, endId) {
    const map = maps[mapId];
    if (startId === endId) return [startId];
    const distances = Object.fromEntries(Object.keys(map.nodes).map((id) => [id, Infinity]));
    const previous = {};
    const unseen = new Set(Object.keys(map.nodes));
    distances[startId] = 0;
    while (unseen.size) {
      let current = null;
      for (const id of unseen) if (current === null || distances[id] < distances[current]) current = id;
      if (current === null || distances[current] === Infinity) break;
      unseen.delete(current);
      if (current === endId) break;
      for (const [from, to] of map.edges) {
        const next = from === current ? to : to === current ? from : null;
        if (!next || !unseen.has(next)) continue;
        const candidate = distances[current] + pointDistance(map.nodes[current], map.nodes[next]);
        if (candidate < distances[next]) { distances[next] = candidate; previous[next] = current; }
      }
    }
    if (!Number.isFinite(distances[endId])) return [];
    const result = [endId];
    while (result[0] !== startId) result.unshift(previous[result[0]]);
    return result;
  }
  function pathLength(mapId, ids) {
    let total = 0;
    for (let i = 1; i < ids.length; i++) total += pointDistance(maps[mapId].nodes[ids[i - 1]], maps[mapId].nodes[ids[i]]);
    return total;
  }
  function nearestProjection(mapId, point) {
    let best = null;
    for (const [from, to] of maps[mapId].edges) {
      const a = maps[mapId].nodes[from];
      const b = maps[mapId].nodes[to];
      const projection = projectOnSegment(point, a, b);
      const distance = pointDistance(point, projection);
      if (!best || distance < best.distance) best = { from, to, a, b, projection, distance };
    }
    return best;
  }
  function routeTo(mapId, clickedPoint, onArrival = null) {
    if (!maps[mapId]) return;
    const start = { ...state.positions[mapId] };
    const startEdge = nearestProjection(mapId, start);
    const endEdge = nearestProjection(mapId, clickedPoint);
    if (!startEdge || !endEdge) return;
    const destination = endEdge.projection;
    const choices = [];
    const sameEdge = (startEdge.from === endEdge.from && startEdge.to === endEdge.to) || (startEdge.from === endEdge.to && startEdge.to === endEdge.from);
    if (sameEdge) choices.push({ cost: pointDistance(start, startEdge.projection) + pointDistance(startEdge.projection, destination), points: [start, startEdge.projection, destination] });
    for (const startNode of [startEdge.from, startEdge.to]) for (const endNode of [endEdge.from, endEdge.to]) {
      const ids = shortestPath(mapId, startNode, endNode);
      if (!ids.length) continue;
      const cost = pointDistance(start, startEdge.projection) + pointDistance(startEdge.projection, maps[mapId].nodes[startNode]) + pathLength(mapId, ids) + pointDistance(maps[mapId].nodes[endNode], destination);
      choices.push({ cost, points: [start, startEdge.projection, maps[mapId].nodes[startNode], ...ids.slice(1).map((id) => maps[mapId].nodes[id]), destination] });
    }
    choices.sort((a, b) => a.cost - b.cost);
    const chosen = choices[0];
    if (!chosen) { showToast('그곳으로 가는 길을 찾을 수 없어요.'); return; }
    const points = chosen.points.filter((point, index, list) => index === 0 || pointDistance(point, list[index - 1]) > 1);
    route = { mapId, points, index: 1, onArrival };
    setTarget(mapId, destination);
    if (points.length < 2) finishRoute();
  }

  function finishRoute() {
    if (!route) return;
    const completed = route;
    const finalPoint = completed.points.at(-1);
    state.positions[completed.mapId] = { x: finalPoint.x, y: finalPoint.y };
    route = null;
    setTarget(completed.mapId, null);
    updateCharacter(completed.mapId, null, false);
    saveState();
    completed.onArrival?.();
  }
  function setTarget(mapId, point) {
    const prefix = mapId === 'hub' ? 'hub' : mapId === 'market_map' ? 'market' : 'work';
    const layer = $(`#${prefix}TargetLayer`);
    if (layer) layer.innerHTML = point ? `<circle class="destination-pulse" cx="${point.x}" cy="${point.y}" r="17"/>` : '';
  }
  function advanceRoute(dt) {
    if (!route) return;
    const budgetBase = WALK_SPEED * Math.min(dt, .05);
    let budget = budgetBase;
    const position = state.positions[route.mapId];
    while (budget > 0 && route && route.index < route.points.length) {
      const target = route.points[route.index];
      const dx = target.x - position.x;
      const dy = target.y - position.y;
      const distance = Math.hypot(dx, dy);
      if (distance < .8) { position.x = target.x; position.y = target.y; route.index++; continue; }
      const travel = Math.min(budget, distance);
      const candidate = { x: position.x + dx / distance * travel, y: position.y + dy / distance * travel };
      if (!isWalkable(route.mapId, candidate.x, candidate.y, ROAD_RADIUS + 3)) {
        const invalidMap = route.mapId;
        route = null;
        setTarget(invalidMap, null);
        showToast('그 길로는 갈 수 없어요. 다른 곳을 클릭해 주세요.');
        return;
      }
      position.x = candidate.x;
      position.y = candidate.y;
      budget -= travel;
      const direction = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      updateCharacter(route.mapId, direction, true);
      scheduleSave();
      if (travel >= distance) route.index++;
    }
    if (route && route.index >= route.points.length) finishRoute();
  }

  function mapPoint(svg, event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: Math.max(0, Math.min(MAP_W, p.x)), y: Math.max(0, Math.min(MAP_H, p.y)) };
  }
  function handleMapClick(svg, event) {
    const mapId = svg.dataset.mapId;
    const target = event.target;
    const sign = target.closest('[data-transition]');
    if (sign) { setScene(sign.dataset.transition); return; }
    const building = target.closest('[data-building]');
    if (building && currentScene === 'market_map') {
      const categoryId = building.dataset.building;
      const entrance = maps.market_map.nodes[categoryId];
      routeTo('market_map', entrance, () => { currentShopId = categoryId; setScene('shop'); });
      return;
    }
    const zone = target.closest('[data-zone]');
    if (zone && currentScene === 'work_map') {
      const locationId = zone.dataset.zone;
      routeTo('work_map', locations[locationId].entrance, () => { currentWorkAreaId = locationId; setScene('work_area'); });
      return;
    }
    const p = mapPoint(svg, event);
    if (p) routeTo(mapId, p);
  }

  function renderDrawer() {
    const owned = items.filter((item) => getQuantity(item.id) > 0);
    $('#drawerInventory').innerHTML = owned.length ? owned.map((item) => `<div class="drawer-item"><span class="drawer-item-icon">${item.icon}</span><div><strong>${item.name} · ${formatNumber(getQuantity(item.id))}개</strong><small>판매가 ${formatWon(item.sell)}</small></div><button type="button" data-open-shop="${item.category}">가게로 이동</button></div>`).join('') : '<div class="drawer-empty">아직 모은 물건이 없어요.<br>일터에서 자원을 모아보세요!</div>';
    const history = state.transactions.slice(0, historyExpanded ? 100 : 5);
    $('#drawerHistory').innerHTML = history.length ? history.map((tx) => {
      const item = itemById[tx.itemId];
      const title = tx.type === 'gather' ? '모으기' : tx.type === 'buy' ? '구매' : '판매';
      const value = tx.type === 'gather' ? `${item.icon} +${tx.quantity}개` : `${tx.type === 'sell' ? '+' : '−'}${formatWon(tx.totalPrice)}`;
      return `<div class="drawer-history-row"><span>${title} · ${item.name}</span><strong>${value}</strong></div>`;
    }).join('') : '<div class="drawer-empty">아직 활동 기록이 없어요.</div>';
    $('#historyButton').textContent = historyExpanded ? '접기' : '모두 보기';
  }
  function renderGlobalJob() {
    const bar = $('#globalJob');
    if (!state.activeJob) { bar.hidden = true; bar.innerHTML = ''; return; }
    const activity = activityById[state.activeJob.activityId];
    bar.hidden = false;
    bar.innerHTML = `<span class="global-job-icon">${activity.icon}</span><div class="global-job-content"><strong>${activity.name} 진행 중</strong><div class="progress-track"><div class="progress-fill" id="globalJobFill"></div></div></div><span class="global-job-time" id="globalJobTime"></span>`;
    updateJobProgress();
  }
  function updateJobProgress() {
    if (!state.activeJob) return;
    const remaining = Math.max(0, WORK_MS - (Date.now() - state.activeJob.startedAt));
    if ($('#globalJobFill')) $('#globalJobFill').style.width = `${((WORK_MS - remaining) / WORK_MS) * 100}%`;
    if ($('#globalJobTime')) $('#globalJobTime').textContent = `${(remaining / 1000).toFixed(1)}초`;
  }

  function renderAll() {
    renderHeader();
    renderScene();
    if (currentScene === 'shop') renderShop();
    if (currentScene === 'work_area') renderWorkArea();
    renderDrawer();
    renderGlobalJob();
  }
  function setScene(scene) {
    if (!['hub', 'market_map', 'shop', 'work_map', 'work_area'].includes(scene)) return;
    route = null;
    currentScene = scene;
    if (scene !== 'shop') currentShopId = null;
    if (scene !== 'work_area') currentWorkAreaId = null;
    closeDrawer();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openDrawer() {
    drawerOpen = true;
    $('#inventoryDrawer').classList.add('is-open');
    $('#inventoryDrawer').setAttribute('aria-hidden', 'false');
    $('#drawerScrim').hidden = false;
    $('#basketButton').setAttribute('aria-expanded', 'true');
    renderDrawer();
    $('#closeBasket').focus();
  }
  function closeDrawer() {
    drawerOpen = false;
    $('#inventoryDrawer').classList.remove('is-open');
    $('#inventoryDrawer').setAttribute('aria-hidden', 'true');
    $('#drawerScrim').hidden = true;
    $('#basketButton').setAttribute('aria-expanded', 'false');
  }

  function trade(type, itemId, categoryId) {
    const item = itemById[itemId];
    const quantity = Number($(`#${type}-${itemId}`)?.value);
    if (!item || item.category !== categoryId) { showToast('이 가게에서 취급하지 않는 상품이에요.'); return; }
    if (!Number.isSafeInteger(quantity) || quantity < 1) { showToast('수량은 1 이상의 정수로 입력해 주세요.'); return; }
    const total = (type === 'buy' ? item.buy : item.sell) * quantity;
    if (!Number.isSafeInteger(total)) { showToast('거래 금액이 너무 커요.'); return; }
    if (type === 'buy') {
      if (state.cash < total) { showToast(`돈이 부족해요. ${formatWon(total)}이 필요해요.`); return; }
      state.cash -= total;
      state.inventory[itemId] = getQuantity(itemId) + quantity;
      addTransaction('buy', itemId, quantity, total);
      saveState(); renderAll(); showToast(`${item.icon} ${item.name} ${quantity}개를 샀어요!`); return;
    }
    if (getQuantity(itemId) < quantity) { showToast(`가방에 ${item.name}이(가) ${getQuantity(itemId)}개 있어요.`); return; }
    state.inventory[itemId] = getQuantity(itemId) - quantity;
    if (!state.inventory[itemId]) delete state.inventory[itemId];
    state.cash += total;
    addTransaction('sell', itemId, quantity, total);
    saveState(); renderAll(); showToast(`${item.icon} ${item.name} ${quantity}개를 팔아 ${formatWon(total)}을 받았어요!`);
  }
  function startJob(id) {
    const activity = activityById[id];
    if (!activity) return;
    if (state.activeJob) { showToast('지금 하는 일이 끝나면 다시 시작할 수 있어요.'); return; }
    state.activeJob = { activityId: id, startedAt: Date.now() };
    saveState(); renderAll(); showToast(`${activity.name} 시작! 5초만 기다려 주세요.`);
  }
  function completeJob() {
    if (!state.activeJob || Date.now() - state.activeJob.startedAt < WORK_MS) return;
    const activity = activityById[state.activeJob.activityId];
    if (!activity) { state.activeJob = null; saveState(); renderAll(); return; }
    const item = itemById[activity.item];
    state.inventory[item.id] = getQuantity(item.id) + activity.quantity;
    addTransaction('gather', item.id, activity.quantity);
    state.activeJob = null;
    saveState(); renderAll(); showToast(`${item.icon} ${item.name} ${activity.quantity}개를 모았어요!`);
  }

  function tick(timestamp) {
    const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, .05) : 0;
    lastFrame = timestamp;
    if (route && route.mapId === currentScene) advanceRoute(dt);
    updateJobProgress();
    if (state.activeJob && Date.now() - state.activeJob.startedAt >= WORK_MS) completeJob();
    requestAnimationFrame(tick);
  }

  document.addEventListener('click', (event) => {
    const svg = event.target.closest('svg[data-map-id]');
    if (svg && maps[svg.dataset.mapId] && svg.dataset.mapId === currentScene) { handleMapClick(svg, event); return; }
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.scene) { setScene(button.dataset.scene); return; }
    if (button.id === 'basketButton') { drawerOpen ? closeDrawer() : openDrawer(); return; }
    if (button.id === 'closeBasket' || event.target.id === 'drawerScrim') { closeDrawer(); return; }
    if (button.dataset.startJob) { startJob(button.dataset.startJob); return; }
    if (button.dataset.trade) { trade(button.dataset.trade, button.dataset.item, button.dataset.category); return; }
    if (button.dataset.openShop) { currentShopId = button.dataset.openShop; setScene('shop'); return; }
    if (button.dataset.action === 'history') { historyExpanded = !historyExpanded; renderDrawer(); }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('[role="button"]')) {
      event.preventDefault();
      event.target.closest('[role="button"]').click();
      return;
    }
    if (event.key === 'Escape') {
      if (drawerOpen) closeDrawer();
      else if (currentScene === 'shop') setScene('market_map');
      else if (currentScene === 'work_area') setScene('work_map');
      else if (currentScene !== 'hub') setScene('hub');
    }
  });
  $('#drawerScrim').addEventListener('click', closeDrawer);
  document.addEventListener('input', (event) => {
    const match = /^sell-(.+)$/.exec(event.target.id || '');
    if (match && itemById[match[1]]) event.target.max = String(getQuantity(match[1]));
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });

  renderMapLayers();
  renderAll();
  if (state.activeJob && Date.now() - state.activeJob.startedAt >= WORK_MS) completeJob();
  requestAnimationFrame(tick);
})();
