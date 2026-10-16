/* 原版沒有、我們自己建的窗簾：蜂巢簾、穿越簾
 * 單位公分，原點在底部中心，正面朝 +Z（和 models.js 一樣）
 */
import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
function box(g, w, h, d, x, y, z, m) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b;
}
const opt = (id, name) => ({ id, name });

// 蜂巢簾：一格一格橫向的蜂巢摺，上下軌；可以全放下、拉起一半、上下雙開（中間一段遮、上面透光）
function buildHoneycomb(it) {
  const g = new THREE.Group(), { w, d, h } = it, open = it.open || 'closed';
  const F = mat(it.color, { roughness: 0.95 }), F2 = mat(new THREE.Color(it.color).multiplyScalar(0.9)), R = mat(it.color2, { roughness: 0.5 });
  box(g, w, 4, d, 0, h - 2, 0, R);                                                   // 上軌
  const [y0, y1] = open === 'half' ? [h * 0.5, h - 4] : open === 'topdown' ? [h * 0.05, h * 0.6] : [0, h - 4];
  const cell = 2.4, n = Math.max(1, Math.floor((y1 - y0 - 2) / cell));
  for (let i = 0; i < n; i++) {                                                     // 每一格：前後兩片斜面，看起來像蜂巢摺
    const y = y0 + 2 + i * cell + cell / 2;
    const a = box(g, w - 1, cell * 0.62, 0.5, 0, y + cell * 0.18, d * 0.15, i % 2 ? F : F2); a.rotation.x = -0.35;
    const b = box(g, w - 1, cell * 0.62, 0.5, 0, y - cell * 0.18, d * 0.15, i % 2 ? F2 : F); b.rotation.x = 0.35;
  }
  box(g, w, 2, d * 0.8, 0, y0 + 1, 0, R);                                            // 下軌
  if (open === 'topdown') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, h - 4 - y1, 6), R); c.position.set(-w / 2 + 6, (h - 4 + y1) / 2, 0); g.add(c); }   // 上方的拉繩
  return g;
}

// 穿越簾：一片片直立的柔紗葉片掛在軌道上，人可以直接穿過去（適合陽台門、落地窗）
function buildPassage(it) {
  const g = new THREE.Group(), { w, d, h } = it, open = it.open || 'closed';
  const S = mat(it.color, { transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 }), R = mat(it.color2, { roughness: 0.4, metalness: 0.5 });
  box(g, w, 3, 6, 0, h - 1.5, 0, R);                                                 // 軌道
  const vane = 10, step = 8, n = Math.max(2, Math.round(w / step));
  const xs = [];
  for (let i = 0; i < n; i++) {
    let x = -w / 2 + vane / 2 + i * (w - vane) / (n - 1);
    if (open === 'side') x = -w / 2 + vane / 2 + i * (w * 0.22) / (n - 1);          // 收到左邊
    if (open === 'mid' && Math.abs(x) < w * 0.18) continue;                           // 中間撥開一條走道
    xs.push(x);
  }
  for (const x of xs) {                                                             // 每片葉片微微 S 形：兩片稍微轉角的薄片
    const len = h - 4;
    for (const [dx, rot] of [[-vane / 4, 0.25], [vane / 4, -0.25]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(vane / 2 + 0.6, len), S);
      p.position.set(x + dx, len / 2 + 1, 0); p.rotation.y = open === 'side' ? rot * 2.4 : rot; p.renderOrder = 2; g.add(p);
    }
    box(g, 1.2, 1.2, 2, x, h - 3.5, 0, R);                                            // 吊頭
  }
  return g;
}

export const EXTRA_PRODUCTS = {
  honeycomb: {
    sub: '窗簾', generic: true, name: '蜂巢簾', w: 150, d: 6, h: 150, elev: 80, color: '#ece6da', color2: '#f1ebe1', c1: '簾布顏色', c2: '上下軌顏色',
    build: buildHoneycomb, opts: [{ key: 'open', label: '開合', list: [opt('closed', '全放下'), opt('half', '拉起一半'), opt('topdown', '上下雙開')] }], noHit: true,
  },
  passage: {
    sub: '窗簾', generic: true, name: '穿越簾', w: 240, d: 12, h: 250, elev: 2, color: '#f3efe6', color2: '#c9cdd1', c1: '紗簾顏色', c2: '軌道顏色',
    build: buildPassage, opts: [{ key: 'open', label: '開合', list: [opt('closed', '全關'), opt('mid', '中間撥開'), opt('side', '收到一側')] }], noHit: true,
  },
};

/* ---------- 茶几：市面常見款式 ----------
 * 尺寸參考台灣常見規格：大茶几約長 120～130、深 60～70、高 40～45；圓茶几直徑 80～90；套几一大一小、高低錯開
 */
const stone = c => mat(c, { roughness: 0.3 }), wood = c => mat(c, { roughness: 0.6 }), metal = c => mat(c, { roughness: 0.35, metalness: 0.8 });
function cyl(g, rt, rb, h, x, y, z, m, seg = 40) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); c.position.set(x, y, z); c.castShadow = true; c.receiveShadow = true; g.add(c); return c;
}
// 大小套几：大的在後面、小的矮一點從前面滑進大的底下
function buildNest(it) {
  const g = new THREE.Group(), { w, d, h } = it, round = it.shape !== 'square';
  const T = stone(it.color), L = it.legs === 'wood' ? wood(it.color2) : metal(it.color2);
  const B = Math.min(w * 0.66, d), S = Math.min(w * 0.5, d * 0.72);
  const table = (size, th, x, z) => {
    const top = 2.5;
    if (round) cyl(g, size / 2, size / 2, top, x, th - top / 2, z, T, 48); else box(g, size, top, size, x, th - top / 2, z, T);
    const n = round ? 3 : 4, r = size / 2 - 5;
    for (let i = 0; i < n; i++) {
      const a = round ? i / n * Math.PI * 2 + Math.PI / 6 : Math.PI / 4 + i * Math.PI / 2, lx = x + Math.cos(a) * r * (round ? 1 : 1.18), lz = z + Math.sin(a) * r * (round ? 1 : 1.18);
      const leg = cyl(g, 1.1, 1.1, th - top, lx, (th - top) / 2, lz, L, 12); leg.rotation.set(Math.sin(a) * 0.06, 0, -Math.cos(a) * 0.06);
    }
  };
  table(B, h, -w / 2 + B / 2, -d / 2 + B / 2);
  table(S, h * 0.78, w / 2 - S / 2, d / 2 - S / 2);
  return g;
}
// 抽屜收納茶几：上面桌板、前面兩個抽屜、下面一層開放層板
function buildDrawerCoffee(it) {
  const g = new THREE.Group(), { w, d, h } = it, T = stone(it.color), Bd = wood(it.color2), K = metal('#2a2a2a'), legH = 6;
  box(g, w, 3, d, 0, h - 1.5, 0, T);                                                 // 桌面
  const bh = h - 3 - legH;
  box(g, 2, bh, d - 2, -w / 2 + 1, legH + bh / 2, 0, Bd); box(g, 2, bh, d - 2, w / 2 - 1, legH + bh / 2, 0, Bd);   // 兩側
  box(g, w - 4, 2, d - 4, 0, legH + 1, 0, Bd);                                         // 底板
  box(g, w - 4, bh, 1.5, 0, legH + bh / 2, -d / 2 + 2, Bd);                             // 背板
  const dh = Math.min(16, bh * 0.45), dy = h - 3 - dh / 2 - 1;
  box(g, w - 4, 2, d - 4, 0, dy - dh / 2 - 1, 0, Bd);                                   // 抽屜下的隔板（下面是開放層）
  for (const sx of [-1, 1]) {
    box(g, (w - 8) / 2, dh, 2, sx * (w - 4) / 4, dy, d / 2 - 1, Bd);                   // 抽屜面板
    box(g, 12, 1.2, 1.5, sx * (w - 4) / 4, dy, d / 2 + 0.6, K);                         // 把手
  }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 1.5, 1.2, legH, x * (w / 2 - 5), legH / 2, z * (d / 2 - 5), K, 12);
  return g;
}
// 雲朵茶几：像一朵雲的不規則圓弧造型，奶油風常見；可以一大一小
function cloudShape(w, d, seed) {
  const pts = [], n = 96;
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, r = 1 + 0.07 * Math.sin(3 * t + seed) + 0.045 * Math.sin(5 * t + seed * 2);
    pts.push(new THREE.Vector2(Math.cos(t) * r, Math.sin(t) * r));
  }
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y), sx = (w - 6) / (Math.max(...xs) - Math.min(...xs)), sy = (d - 6) / (Math.max(...ys) - Math.min(...ys));
  return new THREE.Shape(pts.map(p => new THREE.Vector2(p.x * sx, p.y * sy)));
}
function cloudBlock(g, w, d, h, x, z, m, seed) {
  const bev = 3, geo = new THREE.ExtrudeGeometry(cloudShape(w, d, seed), { depth: h - 2 * bev, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 4, curveSegments: 48 });
  const mesh = new THREE.Mesh(geo, m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, bev, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
}
function buildCloud(it) {
  const g = new THREE.Group(), { w, d, h } = it, M = mat(it.color, { roughness: 0.7 });
  if (it.set === 'two') { cloudBlock(g, w * 0.66, d * 0.86, h, -w * 0.17, -d * 0.07, M, 0.6); cloudBlock(g, w * 0.4, d * 0.5, h * 0.8, w * 0.3, d * 0.25, M, 2.1); }
  else cloudBlock(g, w, d, h, 0, 0, M, 0.6);
  return g;
}
const COFFEE = { sub: '茶几', generic: true };
Object.assign(EXTRA_PRODUCTS, {
  nestRound: { ...COFFEE, name: '大小圓套几', w: 125, d: 85, h: 45, color: '#efece7', color2: '#c5a35a', c1: '桌面顏色', c2: '腳的顏色', build: buildNest,
    opts: [{ key: 'shape', label: '形狀', list: [opt('round', '圓形'), opt('square', '方形')] }, { key: 'legs', label: '腳', list: [opt('metal', '金屬細腳'), opt('wood', '木腳')] }], def: { shape: 'round', legs: 'metal' } },
  nestSquare: { ...COFFEE, name: '大小方套几', w: 120, d: 80, h: 42, color: '#2f2c2a', color2: '#2a2a2a', c1: '桌面顏色', c2: '腳的顏色', build: buildNest,
    opts: [{ key: 'shape', label: '形狀', list: [opt('square', '方形'), opt('round', '圓形')] }, { key: 'legs', label: '腳', list: [opt('metal', '金屬細腳'), opt('wood', '木腳')] }], def: { shape: 'square', legs: 'metal' } },
  drawerCoffee: { ...COFFEE, name: '抽屜收納茶几', w: 120, d: 60, h: 42, color: '#e9e7e3', color2: '#b98a5e', c1: '桌面顏色', c2: '櫃體顏色', build: buildDrawerCoffee },
  cloudCoffee: { ...COFFEE, name: '雲朵茶几', w: 110, d: 75, h: 35, color: '#efe6d8', c1: '顏色', build: buildCloud,
    opts: [{ key: 'set', label: '組合', list: [opt('one', '單個'), opt('two', '一大一小')] }], def: { set: 'one' } },
});

// 用原版通用茶几（可換形狀、腳座、腳材質）做出市面常見的預設款
export function registerExtras(PRODUCTS) {
  Object.assign(PRODUCTS, EXTRA_PRODUCTS);
  const base = PRODUCTS.coffee; if (!base) return;
  const preset = (name, w, d, h, color, color2, def) => ({ ...COFFEE, name, w, d, h, color, color2, c1: '桌面', c2: '桌腳', build: base.build, opts: base.opts, def });
  Object.assign(PRODUCTS, {
    coffeeSlate: preset('長方形岩板茶几', 120, 60, 42, '#e9e7e3', '#2b2b2b', { shape: 'rect', base: 'legs', legmat: 'metal' }),
    coffeeWood: preset('實木長茶几', 130, 70, 45, '#b98a5e', '#8a6440', { shape: 'rect', base: 'sled', legmat: 'wood' }),
    coffeeSquare: preset('方形茶几', 90, 90, 38, '#dcd6cc', '#cdb79a', { shape: 'rect', base: 'panel', legmat: 'wood' }),
    coffeeMarble: preset('圓形大理石茶几', 90, 90, 40, '#f0ede8', '#c5a35a', { shape: 'round', base: 'pedestal', legmat: 'metal' }),
    coffeeDrum: preset('圓鼓茶几', 80, 80, 38, '#efe6d8', '#efe6d8', { shape: 'round', base: 'drum', legmat: 'wood' }),
    coffeeOval: preset('橢圓茶几', 130, 70, 40, '#d9c3a3', '#b98a5e', { shape: 'oval', base: 'legs', legmat: 'wood' }),
  });
}
