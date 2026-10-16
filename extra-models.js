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
