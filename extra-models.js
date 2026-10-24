/* 原版沒有、我們自己建的窗簾：蜂巢簾、穿越簾
 * 單位公分，原點在底部中心，正面朝 +Z（和 models.js 一樣）
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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

// 小浴缸：圓角白色缸體、裡面淺一點的凹槽、一端有龍頭（主臥衛浴用，室內 50 坪以上會自動放）
function buildBathtub(it) {
  const g = new THREE.Group(), { w, d, h } = it;
  const shell = mat(it.color, { roughness: 0.25 }), inner = mat(new THREE.Color(it.color).multiplyScalar(0.93), { roughness: 0.2 }), chrome = mat(it.color2 || '#c0c4c8', { roughness: 0.2, metalness: 0.9 });
  rbox(g, w, h, d, 0, h / 2, 0, shell, 8);                                          // 缸體
  const iw = w - 14, id = d - 14;                                                   // 內槽：上緣往下凹的淺色面
  const sh = new THREE.Shape(), rr = Math.min(18, id / 2 - 1);
  sh.moveTo(-iw / 2 + rr, -id / 2); sh.lineTo(iw / 2 - rr, -id / 2); sh.quadraticCurveTo(iw / 2, -id / 2, iw / 2, -id / 2 + rr); sh.lineTo(iw / 2, id / 2 - rr); sh.quadraticCurveTo(iw / 2, id / 2, iw / 2 - rr, id / 2);
  sh.lineTo(-iw / 2 + rr, id / 2); sh.quadraticCurveTo(-iw / 2, id / 2, -iw / 2, id / 2 - rr); sh.lineTo(-iw / 2, -id / 2 + rr); sh.quadraticCurveTo(-iw / 2, -id / 2, -iw / 2 + rr, -id / 2);
  const top = new THREE.Mesh(new THREE.ShapeGeometry(sh, 8), mat('#d6e4ec', { roughness: 0.08 })); top.rotation.x = -Math.PI / 2; top.position.y = h + 0.3; g.add(top);   // 缸面：淺藍白，看起來是凹進去裝水的地方
  const rim = new THREE.Mesh(new THREE.ShapeGeometry(sh, 8), inner); rim.rotation.x = -Math.PI / 2; rim.scale.set(1.04, 1.06, 1); rim.position.y = h + 0.15; g.add(rim);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 16, 12), chrome); spout.rotation.z = Math.PI / 2; spout.position.set(-w / 2 + 14, h + 6, -d / 2 + 8); g.add(spout);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 10, 12), chrome); post.position.set(-w / 2 + 6, h + 2, -d / 2 + 8); g.add(post);
  return g;
}
export const EXTRA_PRODUCTS = {
  bathtub: { sub: '衛浴', generic: true, name: '小浴缸', w: 140, d: 75, h: 55, color: '#ffffff', color2: '#c0c4c8', c1: '缸體', c2: '龍頭', build: buildBathtub, wall: true },
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

/* ---------- 單椅：2026 常見的圓弧造型、紋理布料、旋轉椅、高背翼椅、躺椅 ----------
 * 坐高約 42、椅深約 55 以上；低背約 70～80 高，高背約 100 以上
 */
const fabric = c => mat(c, { roughness: 1 });
function rbox(g, w, h, d, x, y, z, m, r = 4) {           // 圓角方塊：坐墊、扶手這類軟包
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2 - 0.1, h / 2 - 0.1, d / 2 - 0.1)), m);
  b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b;
}
// 弧形椅背：一段圓環往上長出來，頂端圓角（圓桶椅、貝殼椅用）；角度以「正後方」為中心
function arcWall(g, rOut, thick, span, y0, height, m, z0 = 0) {
  const a0 = Math.PI / 2 - span / 2, a1 = Math.PI / 2 + span / 2, s = new THREE.Shape();
  s.absarc(0, 0, rOut, a0, a1, false); s.absarc(0, 0, rOut - thick, a1, a0, true);
  const bev = Math.min(thick / 2 - 0.2, 4);
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(1, height - 2 * bev), bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 4, curveSegments: 48 });
  const mesh = new THREE.Mesh(geo, m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, y0 + bev, z0); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
}
// 圓桶椅：泰迪絨圓弧椅（低背）、直條紋貝殼椅（高背）、旋轉圓椅（圓盤底座）
function buildTub(it) {
  const g = new THREE.Group(), { w, d, h } = it, F = fabric(it.color), B = it.base === 'swivel' ? metal(it.color2) : wood(it.color2);
  const r = Math.min(w, d) / 2, seatTop = 44, baseH = it.base === 'swivel' ? 10 : 6;
  if (it.base === 'swivel') { cyl(g, r * 0.5, r * 0.55, 2, 0, 1, 0, B); cyl(g, 4, 4, baseH - 2, 0, (baseH - 2) / 2 + 2, 0, B, 16); }
  else if (it.base === 'plinth') cyl(g, r * 0.82, r * 0.82, baseH, 0, baseH / 2, 0, F, 48);
  else for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; cyl(g, 1.8, 1.2, baseH + 6, Math.cos(a) * r * 0.62, (baseH + 6) / 2 - 6 + 6, Math.sin(a) * r * 0.62, B, 12); }
  const body = it.base === 'legs' ? baseH + 6 : baseH;
  cyl(g, r - 3, r - 3, seatTop - body - 10, 0, body + (seatTop - body - 10) / 2, 0, F, 48);   // 底座軟包
  const cush = cyl(g, r - 9, r - 8, 11, 0, seatTop - 5.5, 3, F, 48);                        // 坐墊
  cush.scale.set(1, 1, 0.95);
  const backH = h - body, thick = it.channel ? 13 : 15;
  arcWall(g, r, thick, Math.PI * 1.25, body, backH, F, 0);
  if (it.channel) {                                                             // 直條紋車縫：沿著椅背內側的凹線
    const D = mat(new THREE.Color(it.color).multiplyScalar(0.75));
    for (let i = -6; i <= 6; i++) {
      const a = Math.PI / 2 + i * (Math.PI * 1.1 / 13), rr = r - thick + 0.3;
      box(g, 0.6, backH - 22, 0.8, Math.cos(a) * rr, body + 12 + (backH - 22) / 2, -Math.sin(a) * rr, D).rotation.y = Math.PI / 2 - a;
    }
  }
  return g;
}
// 藤編單椅：實木框＋藤編椅背、坐墊
let RATTAN = null;
function rattanTex() {
  if (RATTAN) return RATTAN;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#c8a46e'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#8a6a3c'; x.lineWidth = 2;
  for (let i = -128; i < 256; i += 10) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke(); }
  for (let i = 0; i < 128; i += 20) for (let j = 0; j < 128; j += 20) { x.fillStyle = 'rgba(40,25,10,.55)'; x.beginPath(); x.arc(i + 10, j + 10, 2.4, 0, 7); x.fill(); }   // 藤編的小孔
  RATTAN = new THREE.CanvasTexture(c); RATTAN.wrapS = RATTAN.wrapT = THREE.RepeatWrapping; RATTAN.repeat.set(3, 3); RATTAN.colorSpace = THREE.SRGBColorSpace;
  return RATTAN;
}
function buildRattan(it) {
  const g = new THREE.Group(), { w, d, h } = it, Wd = wood(it.color2), F = fabric(it.color), R = new THREE.MeshStandardMaterial({ map: rattanTex(), roughness: 0.9, transparent: true, opacity: 0.95 });
  const seat = 40, legT = 3.5, aw = 6;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) { const l = box(g, legT, sz < 0 ? h - 2 : 60, legT, sx * (w / 2 - aw / 2), (sz < 0 ? h - 2 : 60) / 2, sz * (d / 2 - 6), Wd); if (sz < 0) l.rotation.x = -0.08; }
    rbox(g, aw, 4, d - 6, sx * (w / 2 - aw / 2), 60, 0, Wd, 1.5);                     // 扶手
    box(g, legT, legT, d - 10, sx * (w / 2 - aw / 2), 18, 0, Wd);                      // 側橫撐
  }
  box(g, w - aw * 2, 5, d - 10, 0, seat - 10, 0, Wd);                                   // 坐框
  rbox(g, w - aw * 2 - 2, 10, d - 16, 0, seat - 2, 3, F, 4);                            // 坐墊
  const back = box(g, w - aw * 2 - 4, h - seat - 6, 1.6, 0, seat + (h - seat - 6) / 2 + 2, -d / 2 + 9, R);   // 藤編椅背
  back.rotation.x = -0.1;
  box(g, w - aw * 2, 4, 3, 0, h - 3, -d / 2 + 6, Wd);                                   // 椅背上框
  return g;
}
// 高背躺椅：五爪旋轉腳、往後傾的坐椅與高椅背、頭枕；腳凳另外一件
function buildRecliner(it) {
  const g = new THREE.Group(), { w, d, h } = it, F = fabric(it.color), S = wood(it.color2), K = metal('#2a2a2a');
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, s = box(g, 3, 2.5, w * 0.42, Math.sin(a) * w * 0.2, 2, Math.cos(a) * w * 0.2, K); s.rotation.y = a; }
  cyl(g, 3, 3, 20, 0, 12, 0, K, 16);
  const seat = new THREE.Group(); seat.position.set(0, 24, 4); seat.rotation.x = 0.1; g.add(seat);
  rbox(seat, w - 16, 6, d * 0.62, 0, 4, 0, S, 2); rbox(seat, w - 20, 12, d * 0.58, 0, 13, 2, F, 5);   // 坐殼＋坐墊
  const back = new THREE.Group(); back.position.set(0, 30, -d / 2 + 14); back.rotation.x = -0.32; g.add(back);
  const bh = h - 36;
  rbox(back, w - 16, bh, 6, 0, bh / 2, -4, S, 2); rbox(back, w - 22, bh * 0.62, 11, 0, bh * 0.36, 3, F, 5); rbox(back, w - 26, bh * 0.3, 10, 0, bh * 0.82, 3, F, 5);   // 椅背殼＋兩塊靠墊
  for (const sx of [-1, 1]) rbox(g, 9, 8, d * 0.55, sx * (w / 2 - 6), 48, -2, F, 3);  // 扶手
  return g;
}
function buildOttoman(it) {
  const g = new THREE.Group(), { w, d, h } = it, F = fabric(it.color), S = wood(it.color2), K = metal('#2a2a2a');
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, s = box(g, 3, 2.5, w * 0.5, Math.sin(a) * w * 0.22, 2, Math.cos(a) * w * 0.22, K); s.rotation.y = a; }
  cyl(g, 2.5, 2.5, h - 18, 0, (h - 18) / 2 + 2, 0, K, 16);
  rbox(g, w - 4, 6, d - 4, 0, h - 14, 0, S, 2); rbox(g, w - 8, 12, d - 8, 0, h - 6, 0, F, 5);
  return g;
}
// 實木搖椅：弧形搖腳、直條椅背、坐墊
function buildRocker(it) {
  const g = new THREE.Group(), { w, d, h } = it, Wd = wood(it.color2), F = fabric(it.color), seat = 42;
  for (const sx of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 20; i++) { const t = (i / 20 - 0.5) * 1.2; pts.push(new THREE.Vector3(sx * (w / 2 - 4), 3 + 60 * (1 - Math.cos(t)), Math.sin(t) * d * 0.83)); }
    const rk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 1.8, 8), Wd); rk.castShadow = true; g.add(rk);   // 搖腳
    box(g, 3.5, seat - 4, 3.5, sx * (w / 2 - 4), (seat - 4) / 2 + 3, d * 0.18, Wd);            // 前腳
    const bl = box(g, 3.5, h - 6, 3.5, sx * (w / 2 - 4), (h - 6) / 2 + 3, -d * 0.2, Wd); bl.rotation.x = -0.18;   // 後腳往後斜，連到椅背
    rbox(g, 5, 3.5, d * 0.5, sx * (w / 2 - 4), 62, 0, Wd, 1.5);                                 // 扶手
  }
  box(g, w - 6, 4, d * 0.48, 0, seat - 4, 0, Wd);
  rbox(g, w - 10, 8, d * 0.44, 0, seat + 1, 1, F, 3);
  const back = new THREE.Group(); back.position.set(0, seat, -d * 0.24); back.rotation.x = -0.18; g.add(back);
  const bh = h - seat - 6, n = 7;
  for (let i = 0; i < n; i++) box(back, 3, bh, 1.8, -(w - 16) / 2 + i * (w - 16) / (n - 1), bh / 2, 0, Wd);   // 直條椅背
  box(back, w - 6, 5, 3, 0, bh, 0, Wd);
  return g;
}
/* ---------- 第二批茶几（2026 流行：洞石、圓潤造型、胡桃木） ---------- */
// 洞石貼圖：米色底、橫向的細紋和小孔洞（一張鋪 60 公分）
const TRAV = new Map();
function travMat(color) {
  if (TRAV.has(color)) return TRAV.get(color);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), base = new THREE.Color(color);
  x.fillStyle = '#' + base.getHexString(); x.fillRect(0, 0, 256, 256);
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) { const y = r() * 256, a = 0.05 + r() * 0.12; x.fillStyle = r() > 0.5 ? `rgba(120,95,60,${a})` : `rgba(255,250,240,${a})`; x.fillRect(0, y, 256, 0.6 + r() * 2.2); }   // 橫向紋路
  for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(110,85,55,${0.15 + r() * 0.25})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 0.6 + r() * 2.4, 0.4 + r() * 0.8, 0, 0, 7); x.fill(); }   // 小孔洞
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.72 }); TRAV.set(color, m); return m;
}
// 圓角長條（膠囊形）桌面
function pillShape(w, d) { const r = d / 2, sh = new THREE.Shape(); sh.moveTo(-w / 2 + r, -r); sh.lineTo(w / 2 - r, -r); sh.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2); sh.lineTo(-w / 2 + r, r); sh.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5); return sh; }
function slab(g, shape, t, y, m) { const e = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 3, curveSegments: 32 }), m); e.rotation.x = -Math.PI / 2; e.position.y = y; e.castShadow = e.receiveShadow = true; g.add(e); return e; }

// 洞石膠囊茶几：膠囊形桌面＋兩個圓柱墩
function buildTravPill(it) {
  const g = new THREE.Group(), { w, d, h } = it, M = travMat(it.color), t = 6;
  slab(g, pillShape(w, d), t - 1.6, h - t + 0.8, M);
  for (const sx of [-1, 1]) cyl(g, d * 0.26, d * 0.28, h - t, sx * w * 0.26, (h - t) / 2, 0, M);
  return g;
}
// 洞石圓柱茶几：厚圓桌面＋粗圓柱底座（看起來像一整塊石頭）
function buildTravRound(it) {
  const g = new THREE.Group(), { w, h } = it, M = travMat(it.color), r = w / 2;
  cyl(g, r, r, 7, 0, h - 3.5, 0, M, 64);
  cyl(g, r * 0.55, r * 0.6, h - 7, 0, (h - 7) / 2, 0, M, 48);
  return g;
}
// 洞石拱形茶几：長方桌面＋兩片中間挖拱門的側板
function buildTravArch(it) {
  const g = new THREE.Group(), { w, d, h } = it, M = travMat(it.color), t = 5, pw = 9;
  box(g, w, t, d, 0, h - t / 2, 0, M);
  const ah = h - t, aw = d * 0.55;
  const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(d / 2, ah); sh.lineTo(-d / 2, ah); sh.lineTo(-d / 2, 0);
  const hole = new THREE.Path(); hole.moveTo(-aw / 2, 0); hole.lineTo(-aw / 2, ah * 0.5); hole.absarc(0, ah * 0.5, aw / 2, Math.PI, 0, true); hole.lineTo(aw / 2, 0); hole.lineTo(-aw / 2, 0); sh.holes.push(hole);
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: pw, bevelEnabled: false, curveSegments: 24 }), M);
    e.rotation.y = Math.PI / 2; e.position.set(sx * (w / 2 - 14) - pw / 2, 0, 0); e.castShadow = e.receiveShadow = true; g.add(e);
  }
  return g;
}
// 鵝卵石造型茶几：圓潤不規則的扁平石頭形，奶油風／侘寂風常見
function buildPebble(it) {
  const g = new THREE.Group(), { w, d, h } = it, M = new THREE.MeshStandardMaterial({ color: it.color, roughness: 0.6 });
  const sh = new THREE.Shape(), n = 64, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + 0.07 * Math.sin(a * 2 + 0.6) + 0.04 * Math.sin(a * 3 + 1.7); pts.push(new THREE.Vector2(Math.cos(a) * w / 2 * k * 0.95, Math.sin(a) * d / 2 * k * 0.95)); }
  sh.setFromPoints(pts);
  const e = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: h - 10, bevelEnabled: true, bevelThickness: 5, bevelSize: 4, bevelSegments: 6, curveSegments: 48 }), M);
  e.rotation.x = -Math.PI / 2; e.position.y = 5; e.castShadow = e.receiveShadow = true; g.add(e);
  return g;
}
// 胡桃木雙層長几：圓角桌面＋下層置物板＋外八實木腳（中古風）
function buildWalnutShelf(it) {
  const g = new THREE.Group(), { w, d, h } = it, W = mat(it.color, { roughness: 0.55 }), W2 = mat(it.color2 || it.color, { roughness: 0.6 });
  rbox(g, w, 3.5, d, 0, h - 1.75, 0, W, 1.5);
  rbox(g, w - 16, 2, d - 12, 0, 14, 0, W2, 1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.4, h - 3, 16), W); leg.position.set(sx * (w / 2 - 9), (h - 3) / 2, sz * (d / 2 - 7));
    leg.rotation.z = -sx * 0.08; leg.rotation.x = sz * 0.08; leg.castShadow = true; g.add(leg);
  }
  return g;
}
// 玻璃茶几：清玻璃桌面＋黑鐵方框，下層一片木板
function buildGlassFrame(it) {
  const g = new THREE.Group(), { w, d, h } = it, F = mat(it.color2 || '#222', { roughness: 0.4, metalness: 0.6 }), t = 2;
  const glass = new THREE.MeshPhysicalMaterial({ color: '#e8f2f2', transmission: 0.9, transparent: true, opacity: 0.35, roughness: 0.05 });
  const top = box(g, w, 1.2, d, 0, h - 0.6, 0, glass); top.castShadow = false;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, t, h - 1.2, t, sx * (w / 2 - t / 2), (h - 1.2) / 2, sz * (d / 2 - t / 2), F);
  for (const y of [h - 2.2, 12]) { for (const sz of [-1, 1]) box(g, w, t, t, 0, y, sz * (d / 2 - t / 2), F); for (const sx of [-1, 1]) box(g, t, t, d, sx * (w / 2 - t / 2), y, 0, F); }
  box(g, w - 4, 1.6, d - 4, 0, 13.6, 0, mat(it.color, { roughness: 0.6 }));
  return g;
}
// 藤編圓几：藤編鼓身（一圈圈編織紋）＋實木圓桌面
function buildRattanDrum(it) {
  const g = new THREE.Group(), { w, h } = it, r = w / 2, R = mat(it.color2 || '#c49a6c', { roughness: 0.9 }), R2 = mat(new THREE.Color(it.color2 || '#c49a6c').multiplyScalar(0.82), { roughness: 0.9 });
  const bh = h - 4, n = Math.round(bh / 2.4);
  for (let i = 0; i < n; i++) { const y = i * bh / n + bh / n / 2, k = 0.86 + 0.08 * Math.sin(i / (n - 1) * Math.PI); const tor = new THREE.Mesh(new THREE.TorusGeometry(r * k, bh / n / 2, 6, 48), i % 2 ? R : R2); tor.rotation.x = Math.PI / 2; tor.position.y = y; tor.castShadow = true; g.add(tor); }
  cyl(g, r * 0.84, r * 0.84, bh, 0, bh / 2, 0, R2, 32);
  cyl(g, r, r, 4, 0, h - 2, 0, mat(it.color, { roughness: 0.55 }), 48);
  return g;
}
// 實木樹墩邊几：一段原木，側面樹皮、上面年輪
function buildStump(it) {
  const g = new THREE.Group(), { w, h } = it, r = w / 2;
  const bark = mat(it.color2 || '#5c4330', { roughness: 0.95 }); cyl(g, r * 0.97, r, h - 1, 0, (h - 1) / 2, 0, bark, 18);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = it.color; x.fillRect(0, 0, 256, 256);
  for (let k = 1; k < 18; k++) { x.strokeStyle = `rgba(110,75,40,${0.18 + (k % 3) * 0.08})`; x.lineWidth = 1 + (k % 2); x.beginPath(); x.ellipse(128 + Math.sin(k) * 2, 128, k * 7, k * 6.6, 0, 0, 7); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 48), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); top.rotation.x = -Math.PI / 2; top.position.y = h - 0.98; g.add(top);
  cyl(g, r * 0.96, r * 0.96, 1, 0, h - 1.5, 0, mat(it.color, { roughness: 0.7 }), 48);
  return g;
}
// 日式矮几：厚實木桌面、四支方腳、低矮（坐地板、和室用）
function buildLowJapan(it) {
  const g = new THREE.Group(), { w, d, h } = it, W = mat(it.color, { roughness: 0.6 }), t = 4;
  rbox(g, w, t, d, 0, h - t / 2, 0, W, 1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 6, h - t, 6, sx * (w / 2 - 10), (h - t) / 2, sz * (d / 2 - 9), mat(it.color2 || it.color, { roughness: 0.6 }));
  for (const sz of [-1, 1]) box(g, w - 26, 5, 2.5, 0, h - t - 2.5, sz * (d / 2 - 9), W);   // 牙板
  return g;
}
// C 型邊几：底座可以塞進沙發下面、桌面伸到座位上方（放筆電、咖啡）
function buildCSide(it) {
  const g = new THREE.Group(), { w, d, h } = it, F = mat(it.color2 || '#2a2a2a', { roughness: 0.4, metalness: 0.5 }), T = mat(it.color, { roughness: 0.5 });
  box(g, w, 2, d, 0, h - 1, 0, T);                                                  // 桌面
  box(g, w, 1.2, d, 0, 0.6, 0, F);                                                  // 底座
  box(g, w * 0.8, h - 2, 2.2, 0, (h - 2) / 2, -d / 2 + 1.1, F);                       // 背面立板
  return g;
}
// 洞石方塊茶几：正方桌面＋內縮方墩
function buildTravCube(it) {
  const g = new THREE.Group(), { w, d, h } = it, M = travMat(it.color), t = 6;
  box(g, w, t, d, 0, h - t / 2, 0, M); box(g, w * 0.62, h - t, d * 0.62, 0, (h - t) / 2, 0, M); return g;
}
// 錯位雙圓茶几：一大一小兩片圓桌面，高低錯開疊在一起（金屬細腳）
function buildTwinRound(it) {
  const g = new THREE.Group(), { w, d, h } = it, T = mat(it.color, { roughness: 0.35 }), F = mat(it.color2 || '#c5a35a', { roughness: 0.3, metalness: 0.8 });
  const R1 = d / 2, R2 = d * 0.36, x1 = -w / 2 + R1, x2 = w / 2 - R2;
  for (const [x, r, y] of [[x1, R1, h - 6], [x2, R2, h]]) { cyl(g, r, r, 2.5, x, y - 1.25, 0, T, 48); for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.5; cyl(g, 0.9, 0.9, y - 2.5, x + Math.cos(a) * r * 0.75, (y - 2.5) / 2, Math.sin(a) * r * 0.75, F, 10); } }
  return g;
}
// 弧形三角茶几：圓角三角形桌面＋中間圓柱腳（異形）
function buildTriRound(it) {
  const g = new THREE.Group(), { w, d, h } = it, T = mat(it.color, { roughness: 0.4 }), F = mat(it.color2 || it.color, { roughness: 0.5 });
  const pts = [], R = 14, cs = [[0, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
  for (let i = 0; i < 3; i++) { const [ax, az] = cs[i], [bx, bz] = cs[(i + 1) % 3], [cx2, cz2] = cs[(i + 2) % 3]; pts.push([ax, az]); }
  const sh = new THREE.Shape(); const c0 = cs.map(([x, z]) => new THREE.Vector2(x, z));
  for (let i = 0; i < 3; i++) {                                          // 每個角用圓弧收圓
    const p0 = c0[(i + 2) % 3], p1 = c0[i], p2 = c0[(i + 1) % 3];
    const a = p0.clone().sub(p1).normalize().multiplyScalar(R).add(p1), b = p2.clone().sub(p1).normalize().multiplyScalar(R).add(p1);
    if (i === 0) sh.moveTo(a.x, a.y); else sh.lineTo(a.x, a.y); sh.quadraticCurveTo(p1.x, p1.y, b.x, b.y);
  }
  sh.closePath(); slab(g, sh, 3, h - 3.8, T); g.children[g.children.length - 1].position.z = 0;
  cyl(g, 9, 13, h - 3, 0, (h - 3) / 2, -d / 6, F, 32);   // 放在三角形的重心下面
  return g;
}
// 套几（兩件組）：大的高、小的矮一點，錯開擺
function nestPair(build, big, small) {
  return it => { const g = new THREE.Group(), { w, d, h } = it;
    const a = build({ ...it, ...big(w, d, h) }), b = build({ ...it, ...small(w, d, h) });
    const A = big(w, d, h), B = small(w, d, h); a.position.set(-w / 2 + A.w / 2, 0, -d / 2 + A.d / 2); b.position.set(w / 2 - B.w / 2, 0, d / 2 - B.d / 2); g.add(a, b); return g; };
}
const COFFEE2 = { sub: '茶几', generic: true, c1: '桌面', c2: '腳／底座' };
Object.assign(EXTRA_PRODUCTS, {
  travPill: { ...COFFEE2, form: 'free', name: '洞石膠囊茶几', w: 130, d: 65, h: 36, color: '#e3d3b8', c1: '石材顏色', c2: null, build: buildTravPill },
  travRound: { ...COFFEE2, form: 'round', name: '洞石圓柱茶几', w: 85, d: 85, h: 38, color: '#e6d7bd', c1: '石材顏色', c2: null, build: buildTravRound },
  travArch: { ...COFFEE2, form: 'rect', name: '洞石拱形茶几', w: 120, d: 60, h: 40, color: '#ddcbb0', c1: '石材顏色', c2: null, build: buildTravArch },
  pebble: { ...COFFEE2, form: 'free', name: '鵝卵石造型茶几', w: 115, d: 78, h: 34, color: '#e9e2d6', c1: '顏色', c2: null, build: buildPebble },
  walnutShelf: { ...COFFEE2, form: 'rect', name: '胡桃木雙層茶几', w: 120, d: 60, h: 42, color: '#6b4630', color2: '#7a5236', c1: '桌面木色', c2: '下層木色', build: buildWalnutShelf },
  glassFrame: { ...COFFEE2, form: 'rect', name: '玻璃黑鐵框茶几', w: 110, d: 60, h: 40, color: '#b98a5e', color2: '#1f1f1f', c1: '下層木板', c2: '鐵框顏色', build: buildGlassFrame },
  rattanDrum: { ...COFFEE2, form: 'round', name: '藤編圓几', w: 70, d: 70, h: 40, color: '#c9a27a', color2: '#c49a6c', c1: '桌面木色', c2: '藤編顏色', build: buildRattanDrum },
  stumpSide: { ...COFFEE2, sub: '邊几', name: '實木樹墩邊几', w: 40, d: 40, h: 45, color: '#d8b98f', color2: '#5c4330', c1: '年輪木色', c2: '樹皮顏色', build: buildStump },
  lowJapan: { ...COFFEE2, form: 'rect', name: '日式矮几', w: 100, d: 70, h: 33, color: '#c9a27a', color2: '#b8925f', c1: '桌面木色', c2: '腳的木色', build: buildLowJapan },
  travCube: { ...COFFEE2, name: '洞石方塊茶几', w: 85, d: 85, h: 36, color: '#e3d3b8', c1: '石材顏色', c2: null, build: buildTravCube, form: 'square' },
  woodSquare: { ...COFFEE2, name: '方形雙層木几', w: 90, d: 90, h: 40, color: '#c49a6c', color2: '#b8925f', c1: '桌面木色', c2: '下層木色', build: buildWalnutShelf, form: 'square' },
  twinRound: { ...COFFEE2, name: '錯位雙圓茶几', w: 120, d: 75, h: 42, color: '#f0ede8', color2: '#c5a35a', c1: '桌面', c2: '腳的顏色', build: buildTwinRound, form: 'free' },
  triRound: { ...COFFEE2, name: '弧形三角茶几', w: 100, d: 85, h: 38, color: '#3b3632', color2: '#3b3632', c1: '桌面', c2: '底座', build: buildTriRound, form: 'free' },
  travNest: { ...COFFEE2, name: '洞石子母圓几', w: 125, d: 90, h: 38, color: '#e6d7bd', c1: '石材顏色', c2: null, form: 'nest',
    build: nestPair(buildTravRound, (w, d, h) => ({ w: d * 0.86, d: d * 0.86, h }), (w, d, h) => ({ w: d * 0.6, d: d * 0.6, h: h - 6 })) },
  pebbleNest: { ...COFFEE2, name: '鵝卵石子母几', w: 135, d: 90, h: 34, color: '#e9e2d6', c1: '顏色', c2: null, form: 'nest',
    build: nestPair(buildPebble, (w, d, h) => ({ w: w * 0.68, d: d * 0.78, h }), (w, d, h) => ({ w: w * 0.42, d: d * 0.5, h: h - 6 })) },
  cSide: { ...COFFEE2, sub: '邊几', name: 'C 型沙發邊几', w: 45, d: 35, h: 60, color: '#e9e7e3', color2: '#2a2a2a', c1: '桌面', c2: '鐵件顏色', build: buildCSide },
});
/* ---------- 第三批：參考莉凱雲端資料夾的茶几、邊几 ---------- */
// 大理石貼圖：底色＋斜斜的細紋
const MARB = new Map();
function marbMat(color, vein = '#8a8580', rough = 0.3) {
  const key = color + vein; if (MARB.has(key)) return MARB.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 256, 256);
  let seed = 3; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.strokeStyle = vein; x.globalAlpha = 0.38;
  for (let v = 0; v < 7; v++) { x.lineWidth = 0.4 + r() * 1.6; x.beginPath(); let px = r() * 256, py = 0; x.moveTo(px, py); while (py < 256) { px += (r() - 0.35) * 26; py += 8 + r() * 22; x.lineTo(px, py); } x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: rough }); MARB.set(key, m); return m;
}
const gold = (c = '#c5a35a') => mat(c, { roughness: 0.28, metalness: 0.85 });
const dark = (c = '#262422') => mat(c, { roughness: 0.55 });
function rrShape(w, d, r) { const sh = new THREE.Shape(); r = Math.min(r, w / 2, d / 2); sh.moveTo(-w / 2 + r, -d / 2); sh.lineTo(w / 2 - r, -d / 2); sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r); sh.lineTo(w / 2, d / 2 - r); sh.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); sh.lineTo(-w / 2 + r, d / 2); sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); sh.lineTo(-w / 2, -d / 2 + r); sh.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2); return sh; }
function prism(g, shape, y0, h, m, bevel = 0.6) {   // 平面形狀往上長成柱體（底在 y0）
  const e = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.1, h - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 24 }), m);
  e.rotation.x = -Math.PI / 2; e.position.y = y0 + bevel; e.castShadow = e.receiveShadow = true; g.add(e); return e;
}
function drawerFront(g, w, h, x, y, z, m, pull) { box(g, w, h, 1, x, y, z, m); box(g, w * 0.3, 1.2, 1.2, x, y, z + 0.9, pull); }

// ---- 圓形大几 ----
function buildMarbleCross(it) {          // 大理石圓桌面＋十字實木底座
  const g = new THREE.Group(), { w, h } = it, r = w / 2, S = marbMat(it.color, '#7d7368'), W = mat(it.color2, { roughness: 0.55 });
  cyl(g, r, r, 4, 0, h - 2, 0, S, 64);
  for (const a of [0, Math.PI / 2]) { const b = box(g, w * 0.62, h - 4, 8, 0, (h - 4) / 2, 0, W); b.rotation.y = a + Math.PI / 4; }
  return g;
}
function buildTripodRound(it) {          // 黑大理石圓几＋三支斜金腳
  const g = new THREE.Group(), { w, h } = it, r = w / 2, S = marbMat(it.color, '#d8d4cc', 0.22), G = gold(it.color2);
  cyl(g, r, r, 3, 0, h - 1.5, 0, S, 64);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, leg = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.8, h + 4, 12), G); leg.position.set(Math.cos(a) * r * 0.42, (h - 3) / 2, Math.sin(a) * r * 0.42); leg.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); leg.castShadow = true; g.add(leg); }
  return g;
}
function buildCageRound(it) {            // 金屬鳥籠圓几：一圈直條金屬＋石面
  const g = new THREE.Group(), { w, h } = it, r = w / 2, S = marbMat(it.color, '#9a948c'), G = gold(it.color2);
  cyl(g, r, r, 3, 0, h - 1.5, 0, S, 64);
  for (const y of [1, h - 4]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * 0.94, 0.8, 8, 64), G); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; cyl(g, 0.45, 0.45, h - 5, Math.cos(a) * r * 0.94, (h - 3) / 2, Math.sin(a) * r * 0.94, G, 6); }
  return g;
}
function buildDrawerRound(it) {          // 胡桃木抽屜圓几：圓鼓櫃身、前面一個弧形抽屜、外八小腳
  const g = new THREE.Group(), { w, h } = it, r = w / 2, W = mat(it.color, { roughness: 0.5 }), W2 = mat(new THREE.Color(it.color).multiplyScalar(0.8), { roughness: 0.55 });
  cyl(g, r, r, 4, 0, h - 2, 0, W, 64);
  cyl(g, r * 0.92, r * 0.92, h * 0.45, 0, h - 4 - h * 0.225, 0, W2, 64);
  const dr = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.93, r * 0.93, h * 0.3, 32, 1, true, -0.55, 1.1), W); dr.position.set(0, h - 4 - h * 0.225, 0); g.add(dr);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4, leg = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.3, h * 0.5, 12), W); leg.position.set(Math.cos(a) * r * 0.72, h * 0.25, Math.sin(a) * r * 0.72); leg.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); leg.castShadow = true; g.add(leg); }
  return g;
}
function buildPoufTray(it) {             // 皮革圓墩＋上面木托盤
  const g = new THREE.Group(), { w, h } = it, r = w / 2, L = mat(it.color, { roughness: 0.7 }), W = mat(it.color2, { roughness: 0.5 });
  const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12, y = t * (h - 3); prof.push(new THREE.Vector2(r * (0.82 + 0.18 * Math.sin(t * Math.PI)), y)); }
  const body = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...prof, new THREE.Vector2(0, h - 3)], 48), L); body.castShadow = true; g.add(body);
  cyl(g, r * 0.66, r * 0.66, 2.5, 0, h - 1.25, 0, W, 48);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.66, 1.1, 8, 48), W); rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  return g;
}
// ---- 長方几 ----
function buildSlabDrawerLong(it) {       // 岩板圓角抽屜長几：圓角櫃身＋岩板面＋細外八腳
  const g = new THREE.Group(), { w, d, h } = it, S = marbMat(it.color, '#8c8780', 0.25), B = mat(it.color2, { roughness: 0.5 }), legH = h * 0.35;
  prism(g, rrShape(w - 6, d - 6, d * 0.4), legH, h - legH - 2.5, B);
  prism(g, rrShape(w, d, d * 0.42), h - 2.5, 2.5, S, 0.4);
  box(g, w * 0.5, (h - legH) * 0.45, 1, 0, legH + (h - legH) * 0.45, d / 2 - 2.8, mat(new THREE.Color(it.color2).multiplyScalar(0.85), { roughness: 0.5 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.7, legH + 2, 10), dark()); l.position.set(sx * (w / 2 - 18), legH / 2, sz * (d / 2 - 12)); l.rotation.set(sz * 0.18, 0, -sx * 0.18); g.add(l); }
  return g;
}
function buildIronDrawerLong(it) {       // 鐵框木抽屜岩板茶几（工業風）
  const g = new THREE.Group(), { w, d, h } = it, S = marbMat(it.color, '#7c7872'), F = dark('#1f1f1f'), W = mat(it.color2, { roughness: 0.6 }), t = 2.5;
  box(g, w, 2.5, d, 0, h - 1.25, 0, S);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, t, h - 2.5, t, sx * (w / 2 - t / 2), (h - 2.5) / 2, sz * (d / 2 - t / 2), F);
  for (const y of [h - 3.5, 3]) { for (const sz of [-1, 1]) box(g, w, t, t, 0, y, sz * (d / 2 - t / 2), F); for (const sx of [-1, 1]) box(g, t, t, d, sx * (w / 2 - t / 2), y, 0, F); }
  box(g, w - 8, h * 0.38, d - 8, 0, 4 + h * 0.19, 0, W);
  for (const sx of [-1, 1]) drawerFront(g, (w - 12) / 2 - 2, h * 0.3, sx * (w - 12) / 4, 4 + h * 0.19, d / 2 - 3.6, W, F);
  return g;
}
function buildPlinthLong(it) {           // 岩板墩式長几：厚岩板、內縮深色底座、一圈金邊
  const g = new THREE.Group(), { w, d, h } = it, S = marbMat(it.color, '#8c8780', 0.25), B = dark(it.color2), G = gold();
  prism(g, rrShape(w, d, 10), h - 7, 7, S, 0.8);
  prism(g, rrShape(w - 14, d - 14, 8), 0, h - 7, B, 0.4);
  prism(g, rrShape(w - 13, d - 13, 8), h - 8.2, 1.2, G, 0);
  return g;
}
function buildLeatherLong(it) {          // 皮革收納長几：皮革包覆的托盤式箱體＋實木腳
  const g = new THREE.Group(), { w, d, h } = it, L = mat(it.color, { roughness: 0.65 }), W = mat(it.color2, { roughness: 0.55 }), legH = 9;
  prism(g, rrShape(w, d, 4), legH, h - legH, L, 1);
  prism(g, rrShape(w - 6, d - 6, 3), h - 0.6, 0.8, mat(new THREE.Color(it.color).multiplyScalar(0.9), { roughness: 0.6 }), 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 4, legH, 4, sx * (w / 2 - 8), legH / 2, sz * (d / 2 - 8), W);
  return g;
}
// ---- 四方茶几 ----
function buildFloatSquare(it) {          // 懸浮石材方几：厚石板、很深的內縮黑底座（看起來浮起來）
  const g = new THREE.Group(), { w, d, h } = it, S = marbMat(it.color, '#7e786f', 0.28);
  box(g, w, 10, d, 0, h - 5, 0, S); box(g, w * 0.7, h - 10, d * 0.7, 0, (h - 10) / 2, 0, dark(it.color2));
  return g;
}
function buildLeatherSquare(it) {        // 皮革方几＋金屬護角＋石面
  const g = new THREE.Group(), { w, d, h } = it, S = marbMat('#ece9e3', '#9a948c'), L = mat(it.color, { roughness: 0.65 }), G = gold(it.color2);
  prism(g, rrShape(w, d, 3), 0, h - 2, L, 0.8); box(g, w - 8, 2, d - 8, 0, h - 1, 0, S);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box(g, 7, h, 0.8, sx * (w / 2 - 3.5), h / 2, sz * (d / 2 + 0.1), G); box(g, 0.8, h, 7, sx * (w / 2 + 0.1), h / 2, sz * (d / 2 - 3.5), G); }
  return g;
}
function buildDrawerSquare(it) {         // 雙向抽屜方几：前後都能拉的抽屜、深色框
  const g = new THREE.Group(), { w, d, h } = it, T = marbMat(it.color, '#8a857e'), B = mat(it.color2, { roughness: 0.55 }), G = gold();
  box(g, w, 3, d, 0, h - 1.5, 0, T); box(g, w - 2, h - 9, d - 2, 0, 6 + (h - 9) / 2 - 3, 0, B);
  for (const sz of [-1, 1]) { const f = box(g, w * 0.7, (h - 9) * 0.7, 1, 0, 3 + (h - 9) / 2, sz * (d / 2 - 0.4), mat(new THREE.Color(it.color2).multiplyScalar(0.8), { roughness: 0.55 })); box(g, w * 0.25, 1, 1, 0, 3 + (h - 9) / 2, sz * (d / 2 + 0.3), G); }
  box(g, w - 6, 3, d - 6, 0, 1.5, 0, dark());
  return g;
}
function buildStepSquare(it) {           // 錯層雙層方几：大方石面低、小方深色面高，錯開疊
  const g = new THREE.Group(), { w, d, h } = it, S = marbMat(it.color, '#8a857e'), D = marbMat(it.color2, '#b9b3aa', 0.25);
  box(g, w, h - 10, d, 0, (h - 10) / 2, 0, dark('#2a2826')); box(g, w + 1, 3, d + 1, 0, h - 11.5, 0, S);
  box(g, w * 0.55, 10, d * 0.55, w * 0.18, h - 5, -d * 0.18, dark('#1f1d1c')); box(g, w * 0.55 + 1, 3, d * 0.55 + 1, w * 0.18, h - 1.5, -d * 0.18, D);
  return g;
}
function buildSoftSquare(it) {           // 圓角石面方几：大圓角岩板＋內縮圓角木座
  const g = new THREE.Group(), { w, d, h } = it, S = marbMat(it.color, '#8a857e', 0.25), W = mat(it.color2, { roughness: 0.5 });
  prism(g, rrShape(w, d, w * 0.18), h - 4, 4, S, 0.8); prism(g, rrShape(w * 0.78, d * 0.78, w * 0.14), 0, h - 4, W, 0.6);
  return g;
}
// ---- 套几 ----
function trayRound(g, r, h, x, z, W, F) {   // 有凸邊的圓托盤桌面＋細黑腳
  cyl(g, r, r, 1.5, x, h - 3, z, W, 48);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 4, 48, 1, true), W); rim.position.set(x, h - 2, z); rim.material.side = THREE.DoubleSide; g.add(rim);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.3; cyl(g, 0.8, 0.8, h - 3, x + Math.cos(a) * r * 0.8, (h - 3) / 2, z + Math.sin(a) * r * 0.8, F, 8); }
}
function buildTrayNest(it) {             // 托盤邊圓套几：大小兩個木托盤圓几（黑鐵腳）
  const g = new THREE.Group(), { w, d, h } = it, W = mat(it.color, { roughness: 0.5 }), F = dark('#1d1d1d'), R1 = d / 2, R2 = d * 0.34;
  trayRound(g, R1, h, -w / 2 + R1, 0, W, F); trayRound(g, R2, h - 6, w / 2 - R2, d / 2 - R2, W.clone(), F);
  return g;
}
function buildSlabNestLong(it) {         // 長形岩板子母几：兩片圓角長岩板高低錯開（深色底座）
  const g = new THREE.Group(), { w, d, h } = it, S = marbMat(it.color, '#8a857e', 0.25), B = dark(it.color2);
  const w1 = w * 0.68, d1 = d * 0.72, w2 = w * 0.5, d2 = d * 0.6;
  prism(g, rrShape(w1, d1, d1 * 0.45), h - 3, 3, S, 0.5); prism(g, rrShape(w1 * 0.7, d1 * 0.6, 6), 0, h - 3, B, 0.3);
  const s2 = prism(g, rrShape(w2, d2, d2 * 0.45), h - 12, 3, S, 0.5); s2.position.x = w / 2 - w2 / 2; s2.position.z = d / 2 - d2 / 2;
  const b2 = prism(g, rrShape(w2 * 0.6, d2 * 0.6, 5), 0, h - 12, B, 0.3); b2.position.x = s2.position.x; b2.position.z = s2.position.z;
  g.children.slice(0, 2).forEach(m => { m.position.x = -w / 2 + w1 / 2; m.position.z = -d / 2 + d1 / 2; });
  return g;
}
function buildHalfMoonNest(it) {         // 半圓拼合子母几：兩個半圓一高一低，合起來是一個圓
  const g = new THREE.Group(), { w, h } = it, r = w / 2, S = marbMat(it.color, '#8a857e'), B = mat(it.color2, { roughness: 0.55 });
  for (const [a0, hh, dx] of [[0, h, 2.5], [Math.PI, h - 9, -2.5]]) {   // 一高一低、中間留一點縫
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3, 48, 1, false, a0, Math.PI), S); top.position.set(dx, hh - 1.5, 0); top.castShadow = true; g.add(top);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, hh - 3, 48, 1, false, a0, Math.PI), B); base.position.set(dx, (hh - 3) / 2, 0); base.castShadow = true; g.add(base);
  }
  return g;
}
// ---- 邊几（小茶几）----
function buildFinSide(it) {              // 弧板雙片邊几：兩片弧形板撐起大理石圓面
  const g = new THREE.Group(), { w, h } = it, r = w / 2, S = marbMat(it.color, '#9a948c'), M = mat(it.color2, { roughness: 0.4, metalness: 0.4 });
  cyl(g, r, r, 2.5, 0, h - 1.25, 0, S, 48);
  for (const a0 of [0.15, Math.PI + 0.15]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, h - 2.5, 24, 1, true, a0, Math.PI * 0.75), M); f.material.side = THREE.DoubleSide; f.position.y = (h - 2.5) / 2; f.castShadow = true; g.add(f); }
  return g;
}
function buildDrumCabSide(it) {          // 圓筒收納邊几：圓筒櫃身、側面開一個口
  const g = new THREE.Group(), { w, h } = it, r = w / 2, B = mat(it.color, { roughness: 0.55 }), I = mat(it.color2, { roughness: 0.6 });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48, 1, true, 0.9, Math.PI * 2 - 1.8), B); shell.material.side = THREE.DoubleSide; shell.position.y = h / 2; shell.castShadow = true; g.add(shell);
  cyl(g, r * 0.97, r * 0.97, h - 1, 0, h / 2, 0, I, 48).scale.set(0.98, 1, 0.98);
  for (const y of [1, h - 1, h / 2]) cyl(g, r, r, 2, 0, y, 0, B, 48);
  return g;
}
function buildConeSide(it) {             // 金色圓錐邊几
  const g = new THREE.Group(), { w, h } = it, r = w / 2, G = gold(it.color2), T = mat(it.color, { roughness: 0.35 });
  cyl(g, r, r, 2.5, 0, h - 1.25, 0, T, 48); cyl(g, r * 0.12, r * 0.6, h - 2.5, 0, (h - 2.5) / 2, 0, G, 48);
  return g;
}
function buildBasketSide(it) {           // 金屬線籃邊几：上寬下窄的鐵線籃＋圓托盤面
  const g = new THREE.Group(), { w, h } = it, r = w / 2, F = dark('#1f1f1f'), T = mat(it.color, { roughness: 0.5 });
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, h, 6), F); b.position.set(Math.cos(a) * r * 0.82, h / 2, Math.sin(a) * r * 0.82); b.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); g.add(b); }
  for (const [y, k] of [[1, 0.7], [h - 3, 0.95]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * k, 0.6, 6, 48), F); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  cyl(g, r * 0.95, r * 0.95, 1.5, 0, h - 1, 0, T, 48);
  return g;
}
function buildRingSide(it) {             // 環形腳邊几：三支腳、底下一圈圓環
  const g = new THREE.Group(), { w, h } = it, r = w / 2, F = mat(it.color2, { roughness: 0.4, metalness: 0.5 }), T = marbMat(it.color, '#8a857e');
  cyl(g, r, r, 2.5, 0, h - 1.25, 0, T, 48);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; cyl(g, 0.9, 0.9, h - 2.5, Math.cos(a) * r * 0.75, (h - 2.5) / 2, Math.sin(a) * r * 0.75, F, 10); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.75, 0.9, 8, 48), F); ring.rotation.x = Math.PI / 2; ring.position.y = h * 0.18; g.add(ring);
  return g;
}
const TBL = { sub: '茶几', generic: true, c1: '桌面', c2: '底座' }, SIDE = { sub: '邊几', generic: true, c1: '桌面', c2: '腳／底座' };
Object.assign(EXTRA_PRODUCTS, {
  marbleCross: { ...TBL, form: 'round', name: '大理石十字木座圓几', w: 100, d: 100, h: 40, color: '#e9e2d6', color2: '#7a5236', c1: '石面顏色', c2: '木座顏色', build: buildMarbleCross },
  tripodRound: { ...TBL, form: 'round', name: '黑石三腳金圓几', w: 100, d: 100, h: 40, color: '#2b2a29', color2: '#c5a35a', c1: '石面顏色', c2: '腳的顏色', build: buildTripodRound },
  cageRound: { ...TBL, form: 'round', name: '金屬鳥籠圓几', w: 90, d: 90, h: 42, color: '#f0ede8', color2: '#c5a35a', c1: '石面顏色', c2: '金屬顏色', build: buildCageRound },
  drawerRound: { ...TBL, form: 'round', name: '胡桃木抽屜圓几', w: 100, d: 100, h: 40, color: '#6b4630', color2: '#6b4630', c1: '木頭顏色', c2: null, build: buildDrawerRound },
  poufTray: { ...TBL, form: 'round', name: '皮革圓墩托盤几', w: 80, d: 80, h: 40, color: '#ece6dc', color2: '#7a5236', c1: '皮革顏色', c2: '托盤木色', build: buildPoufTray },
  slabDrawerLong: { ...TBL, form: 'rect', name: '岩板圓角抽屜長几', w: 130, d: 65, h: 38, color: '#e9e6e1', color2: '#b9b2a8', c1: '岩板顏色', c2: '櫃身顏色', build: buildSlabDrawerLong },
  ironDrawerLong: { ...TBL, form: 'rect', name: '鐵框木抽屜岩板茶几', w: 130, d: 70, h: 42, color: '#8f8b86', color2: '#a6784f', c1: '岩板顏色', c2: '抽屜木色', build: buildIronDrawerLong },
  plinthLong: { ...TBL, form: 'rect', name: '岩板墩式長几（金邊）', w: 140, d: 75, h: 35, color: '#e2ded8', color2: '#2a2826', c1: '岩板顏色', c2: '底座顏色', build: buildPlinthLong },
  leatherLong: { ...TBL, form: 'rect', name: '皮革收納長几', w: 130, d: 65, h: 40, color: '#b49a80', color2: '#6b4630', c1: '皮革顏色', c2: '腳的木色', build: buildLeatherLong },
  floatSquare: { ...TBL, form: 'square', name: '懸浮石材方几', w: 120, d: 120, h: 32, color: '#ece9e3', color2: '#1f1d1c', c1: '石面顏色', c2: '底座顏色', build: buildFloatSquare },
  leatherSquare: { ...TBL, form: 'square', name: '皮革方几（金屬護角）', w: 110, d: 110, h: 38, color: '#3a3532', color2: '#c5a35a', c1: '皮革顏色', c2: '護角顏色', build: buildLeatherSquare },
  drawerSquare: { ...TBL, form: 'square', name: '雙向抽屜方几', w: 110, d: 110, h: 38, color: '#e6e2dc', color2: '#5a4636', c1: '石面顏色', c2: '櫃身顏色', build: buildDrawerSquare },
  stepSquare: { ...TBL, form: 'square', name: '錯層雙層方几', w: 120, d: 120, h: 38, color: '#e9e5df', color2: '#3a3836', c1: '下層石面', c2: '上層石面', build: buildStepSquare },
  softSquare: { ...TBL, form: 'square', name: '圓角石面方几', w: 110, d: 110, h: 38, color: '#e3ddd3', color2: '#6b4630', c1: '石面顏色', c2: '木座顏色', build: buildSoftSquare },
  trayNest: { ...TBL, form: 'nest', name: '托盤邊圓套几', w: 125, d: 85, h: 42, color: '#7a5236', c1: '托盤木色', c2: null, build: buildTrayNest },
  slabNestLong: { ...TBL, form: 'nest', name: '長形岩板子母几', w: 150, d: 90, h: 36, color: '#ece9e3', color2: '#2a2826', c1: '岩板顏色', c2: '底座顏色', build: buildSlabNestLong },
  halfMoonNest: { ...TBL, form: 'nest', name: '半圓拼合子母几', w: 100, d: 100, h: 40, color: '#e6e2dc', color2: '#7a5236', c1: '石面顏色', c2: '底座顏色', build: buildHalfMoonNest },
  finSide: { ...SIDE, name: '弧板雙片邊几', w: 50, d: 50, h: 55, color: '#ece9e3', color2: '#b49a80', c1: '石面顏色', c2: '弧板顏色', build: buildFinSide },
  drumCabSide: { ...SIDE, name: '圓筒收納邊几', w: 45, d: 45, h: 52, color: '#cfc6ba', color2: '#5a4636', c1: '外殼顏色', c2: '內層顏色', build: buildDrumCabSide },
  coneSide: { ...SIDE, name: '金色圓錐邊几', w: 45, d: 45, h: 52, color: '#2b2a29', color2: '#c5a35a', c1: '桌面顏色', c2: '底座顏色', build: buildConeSide },
  basketSide: { ...SIDE, name: '金屬線籃邊几', w: 45, d: 45, h: 48, color: '#7a5236', color2: '#1f1f1f', c1: '桌面木色', c2: null, build: buildBasketSide },
  ringSide: { ...SIDE, name: '環形腳邊几', w: 45, d: 45, h: 52, color: '#e6e2dc', color2: '#2a2a2a', c1: '石面顏色', c2: '腳的顏色', build: buildRingSide },
});
/* ---------- 餐桌：中柱腳、四支腳、其他造型 ---------- */
const woodM = (c, r = 0.55) => mat(c, { roughness: r });
function topSlab(g, it, M, t = 2.5) {        // 餐桌桌面：圓（w=d）、橢圓或長方（圓角一點）
  const { w, d, h } = it;
  if (it.shape === 'round') return cyl(g, w / 2, w / 2, t, 0, h - t / 2, 0, M, 64);
  if (it.shape === 'oval') { const c = cyl(g, d / 2, d / 2, t, 0, h - t / 2, 0, M, 64); c.scale.x = w / d; return c; }
  return prism(g, rrShape(w, d, 3), h - t, t, M, 0.4);
}
// 中柱腳
function buildTulip(it) {                 // 鬱金香腳：一支往下張開的白色中柱＋圓盤底
  const g = new THREE.Group(), { h } = it, B = mat(it.color2, { roughness: 0.35 });
  topSlab(g, it, marbMat(it.color, '#9a948c', 0.25));
  const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16, y = 2 + t * (h - 4.5); prof.push(new THREE.Vector2(6 + 22 * Math.pow(1 - t, 3) + 10 * Math.pow(t, 6), y)); }
  const lathe = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 2), ...prof, new THREE.Vector2(0, h - 2.5)], 48), B); lathe.castShadow = true; g.add(lathe);
  cyl(g, 30, 30, 2, 0, 1, 0, B, 48);
  return g;
}
function buildConePed(it) {               // 圓錐中柱：上細下粗的圓錐
  const g = new THREE.Group(), { h } = it, B = mat(it.color2, { roughness: 0.4, metalness: 0.3 });
  topSlab(g, it, marbMat(it.color, '#c9c3ba', 0.25)); cyl(g, 9, it.w * 0.24, h - 2.5, 0, (h - 2.5) / 2, 0, B, 48);
  return g;
}
function buildCrossPed(it) {              // 實木中柱＋十字外八腳
  const g = new THREE.Group(), { w, h } = it, W = woodM(it.color2);
  topSlab(g, it, woodM(it.color, 0.5), 3.5); cyl(g, 6, 8, h - 9.5, 0, 6 + (h - 9.5) / 2, 0, W, 24);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4, l = box(g, w * 0.34, 6, 8, Math.cos(a) * w * 0.17, 3, Math.sin(a) * w * 0.17, W); l.rotation.y = -a; }   // 地上四支往外伸的腳
  return g;
}
function buildRectPed(it) {               // 岩板長桌＋中間一支扁橢圓中柱＋橢圓底盤
  const g = new THREE.Group(), { w, d, h } = it, B = mat(it.color2, { roughness: 0.4, metalness: 0.4 });
  topSlab(g, it, marbMat(it.color, '#8a857e', 0.25));
  const col = cyl(g, 8, 10, h - 4.5, 0, 2 + (h - 4.5) / 2, 0, B, 40); col.scale.x = 3.2;
  const base = cyl(g, 22, 22, 2, 0, 1, 0, B, 48); base.scale.x = w / d * 0.9;
  box(g, w * 0.6, 4, 10, 0, h - 4.5, 0, B);                              // 桌面下的支撐樑
  return g;
}
function buildOvalPed(it) {               // 大理石橢圓桌＋雕塑感的雙曲中柱
  const g = new THREE.Group(), { w, d, h } = it, B = travMat(it.color2);
  topSlab(g, it, marbMat(it.color, '#7d7368', 0.22), 3);
  const prof = []; for (let i = 0; i <= 14; i++) { const t = i / 14, y = t * (h - 3); prof.push(new THREE.Vector2(16 + 14 * Math.pow(Math.abs(t - 0.5) * 2, 2), y)); }
  const c = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...prof, new THREE.Vector2(0, h - 3)], 48), B); c.scale.x = Math.min(2.4, w / d * 1.2); c.castShadow = true; g.add(c);
  return g;
}
function buildLazySusan(it) {             // 轉盤圓桌：大圓桌＋中間的玻璃轉盤＋粗中柱
  const g = new THREE.Group(), { w, h } = it, W = woodM(it.color, 0.45), B = woodM(it.color2);
  topSlab(g, it, W, 3.5);
  cyl(g, w * 0.3, w * 0.3, 1.2, 0, h + 1.2, 0, new THREE.MeshPhysicalMaterial({ color: '#e8f2f2', transparent: true, opacity: 0.5, roughness: 0.05 }), 64);
  cyl(g, 10, 10, 1, 0, h + 0.3, 0, mat('#888', { metalness: 0.7, roughness: 0.3 }), 24);
  cyl(g, 10, 12, h - 6, 0, 3 + (h - 6) / 2, 0, B, 32); cyl(g, 32, 34, 3, 0, 1.5, 0, B, 48);
  return g;
}
// 四支腳
function legs4(g, it, inset, legFn) { const { w, d } = it; for (const sx of [-1, 1]) for (const sz of [-1, 1]) legFn(sx * (w / 2 - inset), sz * (d / 2 - inset), sx, sz); }
function buildNordicLong(it) {            // 北歐實木長桌：方錐腳＋牙板
  const g = new THREE.Group(), { w, d, h } = it, W = woodM(it.color, 0.5), L = woodM(it.color2);
  topSlab(g, it, W, 3); const lh = h - 3;
  legs4(g, it, 8, (x, z) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.2, lh, 4), L); l.rotation.y = Math.PI / 4; l.position.set(x, lh / 2, z); l.castShadow = true; g.add(l); });
  for (const sz of [-1, 1]) box(g, w - 22, 7, 2, 0, lh - 3.5, sz * (d / 2 - 8), L); for (const sx of [-1, 1]) box(g, 2, 7, d - 22, sx * (w / 2 - 8), lh - 3.5, 0, L);
  return g;
}
function buildSplayLong(it) {             // 胡桃木圓角長桌＋外八斜腳（中古風）
  const g = new THREE.Group(), { h } = it, W = woodM(it.color, 0.45);
  prism(g, rrShape(it.w, it.d, it.d * 0.22), h - 3, 3, W, 0.8); const lh = h - 3;
  legs4(g, it, 16, (x, z, sx, sz) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 1.6, lh + 3, 16), W); l.position.set(x, lh / 2, z); l.rotation.set(sz * 0.14, 0, -sx * 0.14); l.castShadow = true; g.add(l); });
  return g;
}
function buildSlimMetal(it) {             // 岩板長桌＋細黑鐵方腳
  const g = new THREE.Group(), { w, d, h } = it, F = dark('#1d1d1d');
  topSlab(g, it, marbMat(it.color, '#8a857e', 0.25), 1.2); const lh = h - 1.2;
  legs4(g, it, 6, (x, z) => box(g, 3, lh, 3, x, lh / 2, z, F));
  for (const sz of [-1, 1]) box(g, w - 12, 3, 2, 0, lh - 1.5, sz * (d / 2 - 6), F); for (const sx of [-1, 1]) box(g, 2, 3, d - 12, sx * (w / 2 - 6), lh - 1.5, 0, F);
  return g;
}
function buildRoundLegs(it) {             // 實木四腳圓桌（北歐）
  const g = new THREE.Group(), { w, h } = it, W = woodM(it.color, 0.5), L = woodM(it.color2);
  topSlab(g, it, W, 3); const lh = h - 3, r = w / 2 * 0.62;
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4, l = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 1.8, lh + 2, 16), L); l.position.set(Math.cos(a) * r, lh / 2, Math.sin(a) * r); l.rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1); l.castShadow = true; g.add(l); }
  cyl(g, r * 0.95, r * 0.95, 6, 0, lh - 3, 0, L, 32);
  return g;
}
function buildExtendable(it) {            // 伸縮岩板餐桌：桌面中間有一條接縫、兩端可拉出（四支腳）
  const g = new THREE.Group(), { w, d, h } = it, S = marbMat(it.color, '#8a857e', 0.25), F = mat(it.color2, { roughness: 0.4, metalness: 0.4 });
  topSlab(g, it, S, 2); box(g, 0.6, 2.2, d - 0.5, 0, h - 1, 0, dark('#555'));      // 中間的接縫
  box(g, w - 30, 6, d - 20, 0, h - 5, 0, F);                                         // 拉軌外框
  legs4(g, it, 12, (x, z) => box(g, 5, h - 2, 5, x, (h - 2) / 2, z, F));
  return g;
}
// 其他造型
function buildXBase(it) {                 // 實木長桌＋兩端 X 型腳、中間一根橫樑
  const g = new THREE.Group(), { w, d, h } = it, W = woodM(it.color, 0.5), L = woodM(it.color2);
  topSlab(g, it, W, 4); const lh = h - 4, ln = Math.hypot(lh, d * 0.7);
  for (const sx of [-1, 1]) for (const k of [-1, 1]) { const b = box(g, 6, ln, 6, sx * (w / 2 - 20), lh / 2, 0, L); b.rotation.x = k * Math.atan2(d * 0.7, lh); }
  box(g, w - 40, 6, 6, 0, lh * 0.45, 0, L);
  return g;
}
const DT = { sub: '餐桌', generic: true, c1: '桌面', c2: '桌腳' };
Object.assign(EXTRA_PRODUCTS, {
  dtTulip: { ...DT, form: 'pedestal', name: '鬱金香腳岩板圓桌', w: 120, d: 120, h: 75, def: { shape: 'round' }, color: '#f0ede8', color2: '#f4f2ee', c1: '岩板顏色', c2: '腳的顏色', build: buildTulip },
  dtCone: { ...DT, form: 'pedestal', name: '圓錐中柱圓桌', w: 130, d: 130, h: 75, def: { shape: 'round' }, color: '#2b2a29', color2: '#1f1f1f', c1: '桌面顏色', c2: '中柱顏色', build: buildConePed },
  dtCross: { ...DT, form: 'pedestal', name: '十字腳實木圓桌', w: 120, d: 120, h: 75, def: { shape: 'round' }, color: '#c49a6c', color2: '#a87a4f', c1: '桌面木色', c2: '腳的木色', build: buildCrossPed },
  dtRectPed: { ...DT, form: 'pedestal', name: '中柱岩板長桌', w: 180, d: 90, h: 75, def: { shape: 'rect' }, color: '#e6e2dc', color2: '#2a2a2a', c1: '岩板顏色', c2: '中柱顏色', build: buildRectPed },
  dtOvalPed: { ...DT, form: 'pedestal', name: '中柱大理石橢圓桌', w: 200, d: 100, h: 75, def: { shape: 'oval' }, color: '#ece8e1', color2: '#e3d3b8', c1: '石面顏色', c2: '洞石中柱', build: buildOvalPed },
  dtSusan: { ...DT, form: 'pedestal', name: '轉盤圓桌', w: 135, d: 135, h: 76, def: { shape: 'round' }, color: '#8a6440', color2: '#6b4630', c1: '桌面木色', c2: '中柱木色', build: buildLazySusan },
  dtNordic: { ...DT, form: 'legs', name: '北歐實木長桌', w: 180, d: 90, h: 75, def: { shape: 'rect' }, color: '#d9b98f', color2: '#c9a87c', c1: '桌面木色', c2: '腳的木色', build: buildNordicLong },
  dtSplay: { ...DT, form: 'legs', name: '胡桃木外八腳長桌', w: 160, d: 85, h: 75, def: { shape: 'rect' }, color: '#6b4630', color2: '#6b4630', c1: '木頭顏色', c2: null, build: buildSplayLong },
  dtSlim: { ...DT, form: 'legs', name: '細鐵腳岩板長桌', w: 160, d: 80, h: 75, def: { shape: 'rect' }, color: '#f0ede8', color2: '#1d1d1d', c1: '岩板顏色', c2: null, build: buildSlimMetal },
  dtRoundLegs: { ...DT, form: 'legs', name: '實木四腳圓桌', w: 110, d: 110, h: 75, def: { shape: 'round' }, color: '#d9b98f', color2: '#c9a87c', c1: '桌面木色', c2: '腳的木色', build: buildRoundLegs },
  dtExtend: { ...DT, form: 'legs', name: '伸縮岩板餐桌', w: 160, d: 90, h: 75, def: { shape: 'rect' }, color: '#e9e6e1', color2: '#2a2a2a', c1: '岩板顏色', c2: '腳的顏色', build: buildExtendable },
  dtXBase: { ...DT, form: 'other', name: 'X 型腳實木長桌', w: 200, d: 95, h: 75, def: { shape: 'rect' }, color: '#c49a6c', color2: '#8a6440', c1: '桌面木色', c2: '腳的木色', build: buildXBase },
});
/* ---------- 床架：落地款、架高款 ---------- */
// 床墊＋被子＋兩個枕頭（床墊放在 y 的高度上）
function bedding(g, w, d, y, zc) {
  const white = mat('#f4f2ee', { roughness: 0.9 }), duvet = mat('#e9e4dc', { roughness: 0.95 }), throwM = mat('#b8a48c', { roughness: 0.95 });
  rbox(g, w, 24, d, 0, y + 12, zc, white, 6);
  rbox(g, w + 2, 6, d * 0.7, 0, y + 25, zc + d * 0.15, duvet, 3);                         // 被子
  rbox(g, w + 3, 2.5, d * 0.22, 0, y + 28.5, zc + d * 0.3, throwM, 1.2);                  // 床尾毯
  for (const sx of [-1, 1]) rbox(g, w * 0.42, 12, 38, sx * w * 0.24, y + 30, zc - d / 2 + 26, white, 6);   // 枕頭
}
const BED_HB = 6;                              // 床頭板厚度
function buildLiftBed(it) {                    // 貓抓皮掀床：整個床箱落地（後掀收納），軟包床頭有橫向車線
  const g = new THREE.Group(), { w, d, h } = it, L = mat(it.color, { roughness: 0.85 }), L2 = mat(new THREE.Color(it.color).multiplyScalar(0.92), { roughness: 0.85 });
  const zc = BED_HB / 2, bd = d - BED_HB, boxH = 32;
  rbox(g, w, boxH, bd, 0, boxH / 2, zc, L, 3); box(g, w - 6, 0.6, 1, 0, boxH - 6, zc + bd / 2 + 0.2, L2);   // 床箱＋掀蓋縫
  rbox(g, w + 4, h, BED_HB + 4, 0, h / 2, -d / 2 + (BED_HB + 4) / 2, L, 4);
  for (let i = 1; i < 4; i++) box(g, w + 2, 0.8, 0.8, 0, boxH + (h - boxH) * i / 4, -d / 2 + BED_HB + 4.2, L2);
  bedding(g, w - 6, bd - 6, boxH - 4, zc);
  return g;
}
function buildDrawerBed(it) {                  // 六抽收納床：落地床箱、兩側各三個抽屜、木紋床頭
  const g = new THREE.Group(), { w, d, h } = it, W = mat(it.color, { roughness: 0.55 }), F = mat(it.color2, { roughness: 0.5 });
  const zc = BED_HB / 2, bd = d - BED_HB, boxH = 38;
  box(g, w, boxH, bd, 0, boxH / 2, zc, W);
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const z = zc - bd / 2 + bd * (k + 0.5) / 3; box(g, 1, boxH - 10, bd / 3 - 4, sx * (w / 2 + 0.3), boxH / 2, z, F); box(g, 1.2, 1.2, 14, sx * (w / 2 + 1), boxH / 2 + 4, z, dark('#3a3a3a')); }
  box(g, w + 2, h, BED_HB, 0, h / 2, -d / 2 + BED_HB / 2, W);
  bedding(g, w - 4, bd - 4, boxH - 3, zc);
  return g;
}
function buildLowWoodBed(it) {                 // 日式實木落地床：低矮的實木床框直接落地、床框比床墊大一圈、矮床頭
  const g = new THREE.Group(), { w, d, h } = it, W = mat(it.color, { roughness: 0.55 });
  const zc = BED_HB / 2, bd = d - BED_HB, frameH = 14;
  box(g, w, frameH, bd, 0, frameH / 2, zc, W);
  box(g, w, h, BED_HB, 0, h / 2, -d / 2 + BED_HB / 2, W);
  bedding(g, w - 30, bd - 26, frameH - 2, zc + 4);
  return g;
}
function buildCurveBed(it) {                   // 圓弧床頭布面床：泰迪絨／布面，床頭上緣是一道圓弧，床框落地
  const g = new THREE.Group(), { w, d, h } = it, F = mat(it.color, { roughness: 0.95 });
  const zc = BED_HB / 2, bd = d - BED_HB, boxH = 30;
  rbox(g, w, boxH, bd, 0, boxH / 2, zc, F, 6);
  const sh = new THREE.Shape(), r = h - boxH; sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, boxH); sh.absarc(w / 2 - r * 0.6, boxH, r * 0.6, 0, Math.PI / 2); sh.lineTo(-w / 2 + r * 0.6, boxH + r * 0.6);
  sh.absarc(-w / 2 + r * 0.6, boxH, r * 0.6, Math.PI / 2, Math.PI); sh.lineTo(-w / 2, 0);
  const hb = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: BED_HB + 6, bevelEnabled: true, bevelThickness: 3, bevelSize: 3, bevelSegments: 4, curveSegments: 32 }), F);
  hb.position.z = -d / 2; hb.castShadow = true; g.add(hb); hb.scale.y = h / (boxH + r * 0.6 + 3);
  bedding(g, w - 8, bd - 8, boxH - 4, zc + 2);
  return g;
}
function buildChannelBed(it) {                 // 直條皮革高床頭：很高的直條車線床頭、床框落地
  const g = new THREE.Group(), { w, d, h } = it, L = mat(it.color, { roughness: 0.6 }), n = Math.round(w / 18);
  const zc = BED_HB / 2, bd = d - BED_HB, boxH = 32;
  rbox(g, w, boxH, bd, 0, boxH / 2, zc, L, 3);
  for (let i = 0; i < n; i++) rbox(g, w / n - 0.6, h - 2, BED_HB + 4, -w / 2 + w / n * (i + 0.5), h / 2, -d / 2 + (BED_HB + 4) / 2, L, 4);
  bedding(g, w - 6, bd - 6, boxH - 4, zc);
  return g;
}
function buildNordicBed(it) {                  // 北歐實木架高床：床框架在四支木腳上（離地 12 公分，掃地機器人過得去）、直條木床頭
  const g = new THREE.Group(), { w, d, h } = it, W = mat(it.color, { roughness: 0.55 }), leg = 12, frameH = 14;
  const zc = BED_HB / 2, bd = d - BED_HB;
  box(g, w, frameH, bd, 0, leg + frameH / 2, zc, W);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 6, leg, 6, sx * (w / 2 - 6), leg / 2, zc + sz * (bd / 2 - 6), W);
  for (const sx of [-1, 1]) box(g, 6, h, BED_HB, sx * (w / 2 - 3), h / 2, -d / 2 + BED_HB / 2, W);
  for (let i = 0; i < 9; i++) box(g, (w - 12) / 9 - 2, h - leg - frameH - 10, 2.5, -w / 2 + 6 + (w - 12) / 9 * (i + 0.5), leg + frameH + (h - leg - frameH - 10) / 2 + 2, -d / 2 + BED_HB / 2, W);
  box(g, w, 6, BED_HB, 0, h - 3, -d / 2 + BED_HB / 2, W);
  bedding(g, w - 8, bd - 8, leg + frameH - 3, zc);
  return g;
}
function buildIronBed(it) {                    // 黑鐵架高床：細鐵管床架、床頭是直條鐵欄杆
  const g = new THREE.Group(), { w, d, h } = it, F = dark(it.color), leg = 30;
  const zc = BED_HB / 2, bd = d - BED_HB;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 1.6, 1.6, sz < 0 ? h : leg + 10, sx * (w / 2 - 2), (sz < 0 ? h : leg + 10) / 2, zc + sz * (bd / 2 - 2), F, 12);
  for (const sz of [-1, 1]) box(g, w, 3, 3, 0, leg, zc + sz * (bd / 2 - 2), F); for (const sx of [-1, 1]) box(g, 3, 3, bd, sx * (w / 2 - 2), leg, zc, F);
  for (const y of [h - 3, leg + 25]) box(g, w, 3, 3, 0, y, -d / 2 + BED_HB / 2 + 1, F);
  for (let i = 1; i < 12; i++) cyl(g, 0.7, 0.7, h - 3 - leg - 25, -w / 2 + w * i / 12, (h - 3 + leg + 25) / 2, -d / 2 + BED_HB / 2 + 1, F, 8);
  bedding(g, w - 6, bd - 6, leg + 1, zc);
  return g;
}
/* ---------- 床頭櫃 ---------- */
function buildNightWood(it) {                  // 實木兩抽床頭櫃：細腳架高
  const g = new THREE.Group(), { w, d, h } = it, W = mat(it.color, { roughness: 0.55 }), leg = 14;
  box(g, w, h - leg, d, 0, leg + (h - leg) / 2, 0, W);
  for (let k = 0; k < 2; k++) { const y = leg + (h - leg) * (k + 0.5) / 2; box(g, w - 4, (h - leg) / 2 - 3, 1, 0, y, d / 2 + 0.3, mat(new THREE.Color(it.color).multiplyScalar(0.92), { roughness: 0.55 })); box(g, 10, 1.2, 1.4, 0, y, d / 2 + 1, gold(it.color2)); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1, leg + 1, 10), W); l.position.set(sx * (w / 2 - 4), leg / 2, sz * (d / 2 - 4)); l.rotation.set(sz * 0.1, 0, -sx * 0.1); g.add(l); }
  return g;
}
function buildNightCurve(it) {                 // 圓弧單抽床頭櫃：四邊大圓角、一個抽屜加一格開放
  const g = new THREE.Group(), { w, d, h } = it, B = mat(it.color, { roughness: 0.6 }), I = mat(it.color2, { roughness: 0.6 });
  prism(g, rrShape(w, d, Math.min(w, d) * 0.3), 0, h, B, 1);
  box(g, w - 12, h * 0.34, 1, 0, h * 0.68, d / 2 + 0.6, mat(new THREE.Color(it.color).multiplyScalar(0.9), { roughness: 0.6 }));   // 抽屜面
  box(g, 8, 1, 1.2, 0, h * 0.68, d / 2 + 1.4, gold());
  box(g, w - 12, h * 0.3, 1, 0, h * 0.28, d / 2 + 0.6, I);                     // 開放格（深一點的顏色）
  return g;
}
function buildNightFloat(it) {                 // 懸浮壁掛床頭櫃：掛在牆上（離地 35 公分），一個抽屜、底下有燈條
  const g = new THREE.Group(), { w, d, h } = it, B = mat(it.color, { roughness: 0.5 });
  box(g, w, h, d, 0, h / 2, 0, B); box(g, w - 4, h - 6, 1, 0, h / 2, d / 2 + 0.3, mat(new THREE.Color(it.color).multiplyScalar(0.92), { roughness: 0.5 }));
  box(g, w - 6, 0.5, 2, 0, 0.2, d / 2 - 3, new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd89a', emissiveIntensity: 1.2 }));
  return g;
}
const BED = { sub: '床台', generic: true, c1: '床架顏色', c2: null };
Object.assign(EXTRA_PRODUCTS, {
  bedLift: { ...BED, form: 'floor', name: '貓抓皮掀床', w: 165, d: 215, h: 105, color: '#b9b1a6', build: buildLiftBed },
  bedDrawer: { ...BED, form: 'floor', name: '六抽收納床', w: 165, d: 210, h: 95, color: '#c9a87c', color2: '#bfa07a', c2: '抽屜木色', build: buildDrawerBed },
  bedLowWood: { ...BED, form: 'floor', name: '日式實木落地床', w: 195, d: 225, h: 55, color: '#d9b98f', build: buildLowWoodBed },
  bedCurve: { ...BED, form: 'floor', name: '圓弧床頭布面床', w: 170, d: 220, h: 110, color: '#ece6dc', build: buildCurveBed },
  bedChannel: { ...BED, form: 'floor', name: '直條皮革高床頭床', w: 175, d: 220, h: 125, color: '#6e5a4a', build: buildChannelBed },
  bedNordic: { ...BED, form: 'raised', name: '北歐實木架高床', w: 165, d: 212, h: 95, color: '#d9b98f', build: buildNordicBed },
  bedIron: { ...BED, form: 'raised', name: '黑鐵架高床', w: 160, d: 205, h: 105, color: '#1f1f1f', build: buildIronBed },
  nightWood: { sub: '床頭櫃', generic: true, name: '實木兩抽床頭櫃', w: 50, d: 40, h: 55, color: '#a87a4f', color2: '#c5a35a', c1: '木頭顏色', c2: '把手顏色', build: buildNightWood },
  nightCurve: { sub: '床頭櫃', generic: true, name: '圓弧單抽床頭櫃', w: 48, d: 40, h: 50, color: '#ece6dc', color2: '#8a6440', c1: '櫃身顏色', c2: '開放格顏色', build: buildNightCurve },
  nightFloat: { sub: '床頭櫃', generic: true, name: '懸浮壁掛床頭櫃', w: 50, d: 32, h: 18, elev: 35, color: '#6b4630', c1: '櫃身顏色', c2: null, build: buildNightFloat },
});
/* ---------- 櫃體（臥室）：尺寸自訂，門片／抽屜數跟著大小自動算 ---------- */
const HANDLE_OPT = { key: 'handle', label: '把手', list: [opt('bar', '長條把手'), opt('knob', '圓把手'), opt('push', '無把手（按壓）')] };
function handleOn(g, it, x, y, z, vertical, len) {
  const H = gold(it.color2 || '#c5a35a');
  if (it.handle === 'push') return;
  if (it.handle === 'knob') { const k = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), H); k.position.set(x, y, z + 1.5); g.add(k); return; }
  box(g, vertical ? 1.2 : len, vertical ? len : 1.2, 1.6, x, y, z + 1, H);
}
function buildWardrobe(it) {                  // 衣櫃：對開門（每片約 45～50 公分）／推拉門（兩三片）／開放式（吊衣桿＋層板）
  const g = new THREE.Group(), { w, d, h } = it, B = mat(it.color, { roughness: 0.5 }), D2 = mat(new THREE.Color(it.color).multiplyScalar(0.95), { roughness: 0.45 }), T = 1.8, kick = 6;
  const door = it.door || 'hinge';
  box(g, w, h - kick, 1.5, 0, kick + (h - kick) / 2, -d / 2 + 0.75, B);                       // 背板
  for (const sx of [-1, 1]) box(g, T, h - kick, d, sx * (w / 2 - T / 2), kick + (h - kick) / 2, 0, B);   // 側板
  box(g, w, T, d, 0, h - T / 2, 0, B); box(g, w, T, d, 0, kick + T / 2, 0, B); box(g, w - 2, kick, d - 4, 0, kick / 2, -2, dark('#2a2826'));   // 頂、底、踢腳
  const innerW = w - 2 * T, bays = Math.max(1, Math.round(innerW / 90));                 // 每 90 公分一格，中間有隔板
  for (let i = 1; i < bays; i++) box(g, T, h - kick - 2 * T, d - 2, -innerW / 2 + innerW * i / bays, kick + (h - kick) / 2, -1, B);
  if (door === 'open') {                                                                 // 開放式：上層板、吊衣桿、掛著的衣服、下層抽屜
    const cloth = ['#d9d2c5', '#8a8f96', '#e8e4dc', '#5a6470', '#c9b8a4', '#f2efe9'];
    for (let i = 0; i < bays; i++) {
      const cx = -innerW / 2 + innerW * (i + 0.5) / bays, bw = innerW / bays - T;
      box(g, bw, T, d - 4, cx, h - 32, -1, B);
      const rod = cyl(g, 1, 1, bw - 2, cx, h - 40, 0, gold(), 10); rod.rotation.z = Math.PI / 2;
      const n = Math.max(3, Math.floor(bw / 9));
      for (let k = 0; k < n; k++) box(g, 3, 70 + (k % 3) * 18, d * 0.62, cx - bw / 2 + 5 + (bw - 10) * k / (n - 1 || 1), h - 42 - (70 + (k % 3) * 18) / 2, 0, mat(cloth[(i * 3 + k) % cloth.length], { roughness: 0.95 }));
      for (let k = 0; k < 2; k++) { box(g, bw - 1, 20, 1, cx, kick + T + 11 + k * 22, d / 2 - 1.5, D2); handleOn(g, it, cx, kick + T + 11 + k * 22, d / 2 - 1, false, 18); }
    }
    return g;
  }
  if (door === 'slide') {                                                                // 推拉門：兩到三片前後錯開的門片＋上軌
    const n = w > 240 ? 3 : 2, pw = w / n + 4;
    box(g, w, 4, 6, 0, h - 2, d / 2 - 3, dark('#555'));
    for (let i = 0; i < n; i++) { const x = -w / 2 + pw / 2 + (w - pw) * i / (n - 1), z = d / 2 - (i % 2 ? 6 : 2);
      box(g, pw, h - kick - 6, 2, x, kick + (h - kick - 6) / 2, z, i % 2 ? D2 : B); if (it.handle !== 'push') box(g, 1.4, 40, 1.6, x + (i % 2 ? -1 : 1) * (pw / 2 - 5), kick + (h - kick) * 0.5, z + 1.6, gold(it.color2 || '#c5a35a')); }
    return g;
  }
  const n = Math.max(2, Math.round(w / 48)), dw = w / n;                                 // 對開門：門片數照寬度算
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + dw * (i + 0.5);
    box(g, dw - 0.4, h - kick - 0.6, 2, x, kick + (h - kick) / 2, d / 2 + 1, i % 2 ? D2 : B);
    handleOn(g, it, x + (i % 2 ? -1 : 1) * (dw / 2 - 4), kick + (h - kick) * 0.48, d / 2 + 1, true, 30);
  }
  return g;
}
function buildDresser(it) {                   // 斗櫃：抽屜數照高度算（每格約 20 公分），細腳
  const g = new THREE.Group(), { w, d, h } = it, B = mat(it.color, { roughness: 0.5 }), F = mat(new THREE.Color(it.color).multiplyScalar(0.94), { roughness: 0.5 }), leg = 12;
  box(g, w, h - leg, d, 0, leg + (h - leg) / 2, 0, B);
  const rows = Math.max(2, Math.round((h - leg) / 20)), rh = (h - leg - 3) / rows, cols = w > 100 ? 2 : 1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = -w / 2 + w * (c + 0.5) / cols, y = leg + 1.5 + rh * (r + 0.5);
    box(g, w / cols - 1.6, rh - 1.2, 1, x, y, d / 2 + 0.4, F); handleOn(g, it, x, y, d / 2 + 0.4, false, Math.min(18, w / cols * 0.35)); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.1, leg + 1, 10), mat(it.color2 || '#7a5236', { roughness: 0.5 })); l.position.set(sx * (w / 2 - 4), leg / 2, sz * (d / 2 - 4)); l.rotation.set(sz * 0.08, 0, -sx * 0.08); g.add(l); }
  return g;
}
function buildLowCab(it) {                    // 收納矮櫃：落地、抽屜一欄一欄（欄數照寬度算），上面可以放東西
  const g = new THREE.Group(), { w, d, h } = it, B = mat(it.color, { roughness: 0.5 }), F = mat(new THREE.Color(it.color).multiplyScalar(0.94), { roughness: 0.5 }), kick = 5;
  box(g, w, h - kick, d, 0, kick + (h - kick) / 2, 0, B); box(g, w - 2, kick, d - 4, 0, kick / 2, -2, dark('#2a2826'));
  const cols = Math.max(1, Math.round(w / 50)), rows = Math.max(1, Math.round((h - kick) / 25)), cw = w / cols, rh = (h - kick - 2) / rows;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const x = -w / 2 + cw * (c + 0.5), y = kick + 1 + rh * (r + 0.5);
    box(g, cw - 1.2, rh - 1.2, 1, x, y, d / 2 + 0.4, F); handleOn(g, it, x, y + rh * 0.3, d / 2 + 0.4, false, Math.min(16, cw * 0.4)); }
  return g;
}
const CAB = { sub: '櫃體', generic: true, wall: true, c1: '櫃體顏色', c2: '把手顏色' };
Object.assign(EXTRA_PRODUCTS, {
  cabWardrobe: { ...CAB, name: '衣櫃（尺寸自訂）', w: 180, d: 60, h: 240, color: '#ece9e3', color2: '#c5a35a', build: buildWardrobe,
    opts: [{ key: 'door', label: '門的樣式', list: [opt('hinge', '對開門'), opt('slide', '推拉門'), opt('open', '開放式')] }, HANDLE_OPT], def: { door: 'hinge', handle: 'bar' } },
  cabSlide: { ...CAB, name: '推拉門衣櫃', w: 240, d: 62, h: 240, color: '#b9a088', color2: '#c5a35a', build: buildWardrobe,
    opts: [{ key: 'door', label: '門的樣式', list: [opt('slide', '推拉門'), opt('hinge', '對開門'), opt('open', '開放式')] }, HANDLE_OPT], def: { door: 'slide', handle: 'bar' } },
  cabOpen: { ...CAB, name: '開放式衣櫃', w: 150, d: 55, h: 220, color: '#d9b98f', color2: '#c5a35a', build: buildWardrobe,
    opts: [{ key: 'door', label: '門的樣式', list: [opt('open', '開放式'), opt('hinge', '對開門'), opt('slide', '推拉門')] }, HANDLE_OPT], def: { door: 'open', handle: 'bar' } },
  cabDresser: { ...CAB, name: '斗櫃', w: 80, d: 45, h: 115, color: '#a87a4f', color2: '#7a5236', c2: '腳的顏色', build: buildDresser, opts: [HANDLE_OPT], def: { handle: 'knob' } },
  cabLow: { ...CAB, name: '收納矮櫃', w: 150, d: 45, h: 80, color: '#ece9e3', color2: '#c5a35a', build: buildLowCab, opts: [HANDLE_OPT], def: { handle: 'bar' } },
});
/* ---------- 示意人（評估動線）：照身高等比例，預設 180 公分、80 公斤的體型（肩寬約 48、胸厚約 26） ---------- */
function buildPerson(it) {                 // 莉凱寶寶（Q 版）：大圓頭、短身體、光著手腳只穿黃色連身衣；總高度、身體寬度照實際（180 公分、約 48 寬），評估動線準
  const g = new THREE.Group(), s = (it.h || 180) / 180, walk = it.pose === 'walk';
  const SUIT = mat(it.color, { roughness: 0.7 }), NAVY = mat(it.color2 || '#00436a', { roughness: 0.7 }), SKIN = mat('#f6d6bd', { roughness: 0.65 });
  const DARK = mat('#2b211c', { roughness: 0.35 }), WHITE = mat('#ffffff', { roughness: 0.3 });
  const cap = (r, len, m) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r * s, len * s, 8, 18), m); c.castShadow = true; return c; };
  const ball = (r, m, sx = 1, sy = 1, sz = 1, seg = 28) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r * s, seg, (seg * 0.7) | 0), m); b.scale.set(sx, sy, sz); b.castShadow = true; return b; };
  // 短短的腳、光腳丫
  for (const [sx, a] of [[-1, walk ? 0.45 : 0], [1, walk ? -0.45 : 0]]) {
    const hip = new THREE.Group(); hip.position.set(sx * 11 * s, 42 * s, 0); hip.rotation.x = a; hip.userData.swing = -sx; g.add(hip);   // swing：真的走路時前後擺
    const leg = cap(9.5, 20, SKIN); leg.position.y = -19 * s; hip.add(leg);   // 光腳丫
    const shoe = ball(9.6, SKIN, 1, 0.68, 1.4); shoe.position.set(0, -35 * s, 4 * s); hip.add(shoe);
  }
  // 圓滾滾的身體（黃色連身衣），肚子上有深藍圓口袋和黃色 L
  const body = ball(24, SUIT, 1, 1.45, 0.78); body.position.y = 78 * s; g.add(body);
  const pocket = new THREE.Mesh(new THREE.CircleGeometry(9 * s, 28), NAVY); pocket.position.set(0, 74 * s, 18.4 * s); pocket.rotation.x = -0.12; g.add(pocket);
  box(g, 2.6 * s, 10 * s, 0.6 * s, -2 * s, 75 * s, 18.9 * s, SUIT); box(g, 7 * s, 2.6 * s, 0.6 * s, 0.2 * s, 71 * s, 18.9 * s, SUIT);   // L
  const collar = new THREE.Mesh(new THREE.TorusGeometry(9 * s, 2.2 * s, 10, 24), NAVY); collar.rotation.x = Math.PI / 2; collar.position.y = 112 * s; g.add(collar);
  // 大大的頭（頭頂剛好 180）
  const head = ball(31, SKIN, 1.04, 0.97, 0.95, 36); head.position.y = 150 * s; g.add(head);
  const tuft = new THREE.Mesh(new THREE.TorusGeometry(4.5 * s, 1.6 * s, 10, 20, Math.PI * 1.4), mat('#5a3d2e', { roughness: 0.8 })); tuft.position.set(1 * s, 180.5 * s, 0); tuft.rotation.set(0, Math.PI / 2, 0.6); g.add(tuft);   // 頭頂一撮捲毛
  for (const sx of [-1, 1]) {
    const eye = ball(4.6, DARK, 0.85, 1.15, 0.45, 18); eye.position.set(sx * 10.5 * s, 151 * s, 27.6 * s); g.add(eye);
    const shine = ball(1.5, WHITE, 1, 1, 0.5, 10); shine.position.set(sx * 10.5 * s + 1.4 * s, 153.2 * s, 29.4 * s); g.add(shine);
    const shine2 = ball(0.7, WHITE, 1, 1, 0.5, 8); shine2.position.set(sx * 10.5 * s - 1.2 * s, 149.4 * s, 29.4 * s); g.add(shine2);
    const blush = ball(4.6, new THREE.MeshStandardMaterial({ color: '#f59a98', roughness: 0.8, transparent: true, opacity: 0.7 }), 1.25, 0.7, 0.3, 14); blush.position.set(sx * 17.5 * s, 142.5 * s, 25.5 * s); g.add(blush);
    const ear = ball(5, SKIN, 0.55, 1, 0.9, 14); ear.position.set(sx * 31.5 * s, 149 * s, 0); g.add(ear);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(4 * s, 0.9 * s, 8, 20, Math.PI), DARK); smile.rotation.z = Math.PI; smile.position.set(0, 141.5 * s, 29.2 * s); g.add(smile);
  // 短短的手臂（走路時和腳相反擺動）
  for (const [sx, a] of [[-1, walk ? -0.5 : 0], [1, walk ? 0.5 : 0]]) {
    const sh = new THREE.Group(); sh.position.set(sx * 21 * s, 100 * s, 0); sh.rotation.set(a, 0, sx * 0.42); sh.userData.swing = sx; g.add(sh);
    const arm = cap(6.5, 18, SKIN); arm.position.y = -14 * s; sh.add(arm);   // 光著手臂
    const hand = ball(6.2, SKIN); hand.position.y = -28 * s; sh.add(hand);
  }
  // 地上的範圍：站著約 肩寬×身體厚，走路時前後要多一些
  const fp = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: '#00436a', transparent: true, opacity: 0.14, depthWrite: false }));
  fp.rotation.x = -Math.PI / 2; fp.position.y = 0.4; fp.scale.set((it.w || 48) / 2 + 4, (walk ? 66 : (it.d || 30)) / 2 + 4, 1); g.add(fp);
  return g;
}
Object.assign(EXTRA_PRODUCTS, {
  person: { sub: '示意人', generic: true, noHit: true, name: '莉凱寶寶・示意人（180cm）', w: 48, d: 30, h: 180, color: '#F9E573', color2: '#00436a', c1: '衣服顏色', c2: '鞋子、口袋顏色', build: buildPerson,
    opts: [{ key: 'pose', label: '姿勢', list: [opt('stand', '站立'), opt('walk', '走路')] }], def: { pose: 'stand' } },
  personWalk: { sub: '示意人', generic: true, noHit: true, name: '莉凱寶寶・走路（180cm）', w: 48, d: 66, h: 180, color: '#F9E573', color2: '#00436a', c1: '衣服顏色', c2: '鞋子、口袋顏色', build: buildPerson,
    opts: [{ key: 'pose', label: '姿勢', list: [opt('walk', '走路'), opt('stand', '站立')] }], def: { pose: 'walk' } },
});
const CHAIR = { sub: '單椅', generic: true };
Object.assign(EXTRA_PRODUCTS, {
  tubBoucle: { ...CHAIR, name: '泰迪絨圓弧椅（低背）', w: 78, d: 76, h: 72, color: '#efe9df', color2: '#b98a5e', c1: '布料顏色', c2: '椅腳顏色', build: buildTub,
    opts: [{ key: 'base', label: '底座', list: [opt('plinth', '落地包覆'), opt('legs', '木腳'), opt('swivel', '旋轉圓盤')] }], def: { base: 'plinth' } },
  swivelBarrel: { ...CHAIR, name: '旋轉圓椅（低背）', w: 80, d: 78, h: 76, color: '#c9b49a', color2: '#2a2a2a', c1: '布料顏色', c2: '底座顏色', build: buildTub,
    opts: [{ key: 'base', label: '底座', list: [opt('swivel', '旋轉圓盤'), opt('plinth', '落地包覆'), opt('legs', '木腳')] }], def: { base: 'swivel' } },
  rattanChair: { ...CHAIR, name: '藤編單椅（低背）', w: 68, d: 74, h: 80, color: '#f1ebe1', color2: '#a87a4f', c1: '坐墊顏色', c2: '木框顏色', build: buildRattan },
  channelShell: { ...CHAIR, name: '直條紋貝殼椅（高背）', w: 80, d: 80, h: 102, color: '#a9b79f', color2: '#c5a35a', c1: '布料顏色', c2: '椅腳顏色', build: it => buildTub({ ...it, channel: true }),
    opts: [{ key: 'base', label: '底座', list: [opt('legs', '金屬細腳'), opt('plinth', '落地包覆'), opt('swivel', '旋轉圓盤')] }], def: { base: 'legs' } },
  recliner: { ...CHAIR, name: '高背躺椅（高背）', w: 84, d: 86, h: 104, color: '#3d3a38', color2: '#7a5236', c1: '皮革顏色', c2: '外殼木色', build: buildRecliner },
  reclinerOtt: { ...CHAIR, name: '躺椅腳凳', w: 62, d: 50, h: 42, color: '#3d3a38', color2: '#7a5236', c1: '皮革顏色', c2: '外殼木色', build: buildOttoman },
  rocker: { ...CHAIR, name: '實木搖椅（高背）', w: 64, d: 92, h: 104, color: '#e9e2d6', color2: '#9a6a43', c1: '坐墊顏色', c2: '木頭顏色', build: buildRocker },
});

// 用原版通用茶几（可換形狀、腳座、腳材質）做出市面常見的預設款
export function registerExtras(PRODUCTS, SUBS) {
  if (SUBS && !SUBS.includes('櫃體')) SUBS.splice(SUBS.indexOf('床頭櫃') + 1, 0, '櫃體');   // 臥室的櫃體分類
  if (SUBS && !SUBS.includes('示意人')) SUBS.unshift('示意人');                             // 評估動線用的示意人（每個空間都有，放最前面）
  Object.assign(PRODUCTS, EXTRA_PRODUCTS);
  // 原版單椅標上低背／高背
  for (const [k, tag] of [['lounge', '低背'], ['shellchair', '低背'], ['woodchair', '低背'], ['wingchair', '高背'], ['armchair', '低背']]) if (PRODUCTS[k] && !PRODUCTS[k].name.includes('背）')) PRODUCTS[k].name += `（${tag}）`;
  const base = PRODUCTS.coffee; if (!base) return;
  const preset = (name, w, d, h, color, color2, def) => ({ ...COFFEE, name, w, d, h, color, color2, c1: '桌面', c2: '桌腳', build: base.build, opts: base.opts, def });
  Object.assign(PRODUCTS, {
    coffeeSlate: preset('長方形岩板茶几', 120, 60, 42, '#e9e7e3', '#2b2b2b', { shape: 'rect', base: 'legs', legmat: 'metal' }),
    coffeeWood: preset('實木長茶几', 130, 70, 45, '#b98a5e', '#8a6440', { shape: 'rect', base: 'sled', legmat: 'wood' }),
    coffeeSquare: preset('方形茶几', 90, 90, 38, '#dcd6cc', '#cdb79a', { shape: 'rect', base: 'panel', legmat: 'wood' }),
    coffeeSquareSlate: preset('正方形岩板茶几', 95, 95, 36, '#e9e7e3', '#2b2b2b', { shape: 'rect', base: 'legs', legmat: 'metal' }),
    coffeeMarble: preset('圓形大理石茶几', 90, 90, 40, '#f0ede8', '#c5a35a', { shape: 'round', base: 'pedestal', legmat: 'metal' }),
    coffeeDrum: preset('圓鼓茶几', 80, 80, 38, '#efe6d8', '#efe6d8', { shape: 'round', base: 'drum', legmat: 'wood' }),
    coffeeOval: preset('橢圓茶几', 130, 70, 40, '#d9c3a3', '#b98a5e', { shape: 'oval', base: 'legs', legmat: 'wood' }),
  });
  // 茶几只留 15 款（使用者 2026-10-23：同性質的不要重複）：莉凱自家 3 款＋下面 12 款；其他款不列在商品庫（舊專案用到的還是畫得出來）
  for (const [k, f] of [['ownAmis', 'raised'], ['ownMila', 'raised'], ['ownEmma', 'raised'], ['ownDanish', 'legs'], ['ownPencil', 'legs'], ['ownHeart', 'other']]) if (PRODUCTS[k]) PRODUCTS[k].form = f;   // 餐桌腳型
  const COFFEE_KEEP = new Set(['marbleCross', 'cageRound', 'travRound', 'plinthLong', 'ironDrawerLong', 'walnutShelf', 'floatSquare', 'leatherSquare', 'travPill', 'pebble', 'trayNest', 'slabNestLong']);
  for (const [k, T] of Object.entries(PRODUCTS)) if (T.sub === '茶几' && T.generic && !COFFEE_KEEP.has(k)) T.libHide = true;
  // 茶几形狀：圓形 round／長方形 rect／正方形 square／異形 free／套几 nest（沒標的照名字和尺寸判斷）
  const FORM = { coffee: 'rect', coffeeset: 'nest', side: 'round', coffeeSlate: 'rect', coffeeWood: 'rect', coffeeSquare: 'square', coffeeMarble: 'round', coffeeDrum: 'round', coffeeOval: 'free',
    nestRound: 'nest', nestSquare: 'nest', drawerCoffee: 'rect', cloudCoffee: 'free', ownDorn: 'free', ownAshBig: 'round', ownAshSmall: 'round' };
  for (const [k, T] of Object.entries(PRODUCTS)) {
    if (T.sub !== '茶几' || T.form) continue;
    T.form = FORM[k] || (/套|子母|組合/.test(T.name) ? 'nest' : /圓|鼓/.test(T.name) ? 'round' : /雲|造型|異|橢圓|不規則/.test(T.name) ? 'free' : Math.abs(T.w - T.d) < 12 ? 'square' : 'rect');
  }
}
