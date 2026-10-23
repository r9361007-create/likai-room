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
export function registerExtras(PRODUCTS) {
  Object.assign(PRODUCTS, EXTRA_PRODUCTS);
  // 原版單椅標上低背／高背
  for (const [k, tag] of [['lounge', '低背'], ['shellchair', '低背'], ['woodchair', '低背'], ['wingchair', '高背'], ['armchair', '低背']]) if (PRODUCTS[k] && !PRODUCTS[k].name.includes('背）')) PRODUCTS[k].name += `（${tag}）`;
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
