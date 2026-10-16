/* 裝潢風格：地板、牆面、主牆、窗框門框的配色，加上每種風格的軟裝（窗簾、地毯、燈、植栽、掛畫）
 * 依 2026 台灣常見的裝潢風格整理（北歐、奶油、輕奢、現代、簡約、侘寂、美拉德）
 * floor.kind：wood 木地板／tile 磁磚／marble 大理石／cement 微水泥
 * accent（主牆＝後牆）.kind：paint 油漆／panel 線板／marble 大理石＋金屬條／plaster 礦物塗料
 */
import * as THREE from 'three';

export const STYLES = {
  base: {                                        // 還沒選風格時的樣子
    name: '未選擇', floor: { kind: 'wood', color: '#d9c7ad' }, wall: '#f1f4f6', accent: { kind: 'paint', color: '#f1f4f6' },
    skirt: '#d5dee6', frame: '#4a4b4f', door: '#b48d64', doorFrame: '#efe9e0', decor: null,
  },
  nordic: {
    name: '北歐風', desc: '白牆配淺色原木，加一點鼠尾草綠，明亮、自然、好親近。',
    tags: ['白牆', '淺橡木地板', '鼠尾草綠主牆', '棉麻窗簾', '大型綠植'],
    floor: { kind: 'wood', color: '#dcc29c' }, wall: '#f6f4f0', accent: { kind: 'paint', color: '#a9b79f' },
    skirt: '#f6f4f0', frame: '#f1f1ef', door: '#d8bf98', doorFrame: '#f1f1ef',
    decor: {
      curtain: { style: 'layered', cmat: 'linen', color: '#e9e4da', color2: '#b99c74', color3: '#f8f6f1' },
      rug: { shape: 'rect', color: '#dcd8cf', color2: '#9aa597' },
      plant: { style: 'tall', color: '#f2efe9', color2: '#5f7d63' },
      lamp: { style: 'tripod', color: '#f3ead8', color2: '#c9a77c' },
      light: { type: 'pendant', style: 'dome', color: '#f1efea', color2: '#c9a77c' },
      dining: { style: 'dome', color: '#f1efea', color2: '#c9a77c' },
      art: { style: 'single', color: '#a9b79f', color2: '#d9a37f', color3: '#c9a77c' },
    },
  },
  cream: {
    name: '奶油風', desc: '奶油白、燕麥色的低彩度色調，牆面加線板，搭配圓弧和柔軟布料，溫柔療癒。',
    tags: ['奶油白牆', '暖木地板', '線板主牆', '布加紗窗簾', '圓形地毯'],
    floor: { kind: 'wood', color: '#e2caa6' }, wall: '#f4ece0', accent: { kind: 'panel', color: '#f1e6d5' },
    skirt: '#efe3d1', frame: '#f7f3ec', door: '#efe3d1', doorFrame: '#f7f3ec',
    decor: {
      curtain: { style: 'layered', cmat: 'linen', color: '#efe3d1', color2: '#c8a97e', color3: '#fbf7f0' },
      rug: { shape: 'round', color: '#efe6d8', color2: '#c9a27a' },
      plant: { style: 'ball', color: '#efe6d8', color2: '#7d9670' },
      lamp: { style: 'drum', color: '#f6eedf', color2: '#c8a97e' },
      light: { type: 'pendant', style: 'globe', color: '#f8f3ea', color2: '#c8a97e' },
      dining: { style: 'globe', color: '#f8f3ea', color2: '#c8a97e' },
      art: { style: 'round', color: '#d9b48f', color2: '#f2e3cf', color3: '#c8a97e' },
    },
  },
  luxe: {
    name: '輕奢風', desc: '大理石地坪與主牆，金屬細條收邊，深色絨布窗簾，低調有質感。',
    tags: ['大理石地坪', '大理石主牆＋金屬條', '絨布窗簾', '多頭吊燈', '金色點綴'],
    floor: { kind: 'marble', color: '#ece9e5', vein: '#b9b3ab' }, wall: '#e8e2d9', accent: { kind: 'marble', color: '#f1ede7', vein: '#bdb5aa', metal: '#c5a35a' },
    skirt: '#3a3632', frame: '#8f7a55', door: '#4a3a30', doorFrame: '#3a3632',
    decor: {
      curtain: { style: 'drape', cmat: 'velvet', color: '#4f5d58', color2: '#c5a35a', color3: '#f5f3ee' },
      rug: { shape: 'rect', color: '#c9c4bd', color2: '#b8995a' },
      plant: { style: 'snake', color: '#2e2c2b', color2: '#4f6b4f' },
      lamp: { style: 'arc', color: '#efe9df', color2: '#c5a35a' },
      light: { type: 'pendant', style: 'chandelier', color: '#c5a35a', color2: '#c5a35a' },
      dining: { style: 'chandelier', color: '#c5a35a', color2: '#c5a35a' },
      art: { style: 'triptych', color: '#2f3e46', color2: '#c5a35a', color3: '#c5a35a' },
    },
  },
  modern: {
    name: '現代風', desc: '黑白灰冷色調，大尺寸磁磚、深色主牆、黑色窗框，俐落有個性。',
    tags: ['大板磁磚', '深灰主牆', '黑色窗框', '長型吊燈', '遮光布簾'],
    floor: { kind: 'tile', color: '#c9c9c6', grout: '#a6a6a3' }, wall: '#f2f2f0', accent: { kind: 'paint', color: '#4b4e52' },
    skirt: '#2a2a2a', frame: '#2a2a2b', door: '#3a3b3e', doorFrame: '#2a2a2b',
    decor: {
      curtain: { style: 'drape', cmat: 'blackout', color: '#9a9c9e', color2: '#2a2a2a', color3: '#f5f3ee' },
      rug: { shape: 'rect', color: '#6d6f72', color2: '#2a2a2a' },
      plant: { style: 'snake', color: '#d9d9d6', color2: '#4f6b4f' },
      lamp: { style: 'arc', color: '#e8e8e6', color2: '#2a2a2a' },
      light: { type: 'pendant', style: 'linear', color: '#2a2a2a', color2: '#2a2a2a' },
      dining: { style: 'linear', color: '#2a2a2a', color2: '#2a2a2a' },
      art: { style: 'single', color: '#1f1f1f', color2: '#d8d8d4', color3: '#1f1f1f' },
    },
  },
  minimal: {
    name: '簡約風', desc: '少即是多：原木地板、米白牆、棉麻布簾，收納乾淨、留白多（日系無印感）。',
    tags: ['原木地板', '米白牆', '棉麻布簾', '吸頂燈', '大量留白'],
    floor: { kind: 'wood', color: '#cfae84' }, wall: '#f4f2ed', accent: { kind: 'paint', color: '#ebe6dc' },
    skirt: '#cfae84', frame: '#e9e7e2', door: '#cfae84', doorFrame: '#e9e7e2',
    decor: {
      curtain: { style: 'drape', cmat: 'linen', color: '#e6dfd2', color2: '#a88a62', color3: '#f5f3ee' },
      rug: { shape: 'rect', color: '#e4dccd', color2: '#d2c6b2' },
      plant: { style: 'tall', color: '#e4dccd', color2: '#6b8a5e' },
      lamp: { style: 'drum', color: '#f4eee2', color2: '#a88a62' },
      light: { type: 'ceillight', style: 'disk', color: '#fff8ea', color2: '#ffffff' },
      dining: { style: 'cone', color: '#e9e3d6', color2: '#a88a62' },
      art: null,
    },
  },
  wabi: {
    name: '侘寂風', desc: '大地色礦物塗料與微水泥，保留手作的斑駁質感，原木、亞麻，安靜樸實。',
    tags: ['微水泥地坪', '礦物塗料牆', '大地色主牆', '亞麻紗簾', '深色木件'],
    floor: { kind: 'cement', color: '#cbc2b5' }, wall: '#ddd3c5', wallTex: 'plaster', accent: { kind: 'plaster', color: '#c4b29b' },
    skirt: '#ddd3c5', frame: '#5b5048', door: '#5b4636', doorFrame: '#6b5a4a',
    decor: {
      curtain: { style: 'sheer', cmat: 'linen', color: '#e6dccd', color2: '#5b5048', color3: '#e6dccd' },
      rug: { shape: 'round', color: '#bba68a', color2: '#8f7a62' },
      plant: { style: 'tall', color: '#a8957e', color2: '#6f7a5a' },
      lamp: { style: 'drum', color: '#efe6d6', color2: '#5b4636' },
      light: { type: 'pendant', style: 'cone', color: '#a8957e', color2: '#5b4636' },
      dining: { style: 'cone', color: '#a8957e', color2: '#5b4636' },
      art: { style: 'round', color: '#b39b7d', color2: '#e8dfd0', color3: '#6b5a4a' },
    },
  },
  maillard: {
    name: '美拉德風', desc: '焦糖、咖啡、駝色的大地色系，胡桃木地板配絨布，溫暖濃郁有復古感。',
    tags: ['胡桃木地板', '焦糖色主牆', '絨布窗簾', '駝色地毯', '暖棕色調'],
    floor: { kind: 'wood', color: '#a8794f' }, wall: '#ecdcc8', accent: { kind: 'paint', color: '#b98a5e' },
    skirt: '#7a5236', frame: '#6b4a33', door: '#6b4a33', doorFrame: '#7a5236',
    decor: {
      curtain: { style: 'drape', cmat: 'velvet', color: '#9c6a43', color2: '#5a3d2a', color3: '#f1e6d6' },
      rug: { shape: 'rect', color: '#c49a6c', color2: '#7a5236' },
      plant: { style: 'ball', color: '#7a5236', color2: '#6f7f4f' },
      lamp: { style: 'tripod', color: '#efdcc0', color2: '#5a3d2a' },
      light: { type: 'pendant', style: 'dome', color: '#9c6a43', color2: '#5a3d2a' },
      dining: { style: 'dome', color: '#9c6a43', color2: '#5a3d2a' },
      art: { style: 'triptych', color: '#b5652d', color2: '#e4c49b', color3: '#5a3d2a' },
    },
  },
};
export const STYLE_KEYS = ['nordic', 'cream', 'luxe', 'modern', 'minimal', 'wabi', 'maillard'];
// 軟裝的尺寸：有些款式（弧形燈、長型吊燈、三聯畫）尺寸不一樣
export const DECOR_SIZE = {
  arc: { w: 120, d: 40, h: 190 }, linear: { w: 120, d: 20, h: 90 }, chandelier: { w: 70, d: 70, h: 90 },
  triptych: { w: 150, d: 3, h: 60 }, round: { w: 60, d: 3, h: 60 }, single: { w: 90, d: 3, h: 60 },
};

/* ---------- 材質貼圖（canvas 畫的，不用外部圖片） ---------- */
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const shade = (hex, k) => `rgb(${rgb(hex).map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function toTex(c) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function canvas() { const c = document.createElement('canvas'); c.width = c.height = 512; return [c, c.getContext('2d')]; }
function noise(x, base, n, a, r, r0 = 20, r1 = 110) {   // 灑一層淡淡的斑駁色塊（微水泥、礦物塗料、大理石底）
  for (let i = 0; i < n; i++) {
    const px = r() * 512, py = r() * 512, rad = r0 + r() * (r1 - r0), k = 1 + (r() - 0.5) * a;
    const col = shade(base, k).replace('rgb', 'rgba'), g = x.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, col.replace(')', ',.5)')); g.addColorStop(1, col.replace(')', ',0)'));   // 漸層到「同色透明」，不會越疊越暗
    x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
}
const cache = new Map();
// 一張貼圖鋪 120 公分見方
export function floorTexture(f) {
  const key = JSON.stringify(f); if (cache.has(key)) return cache.get(key);
  const [c, x] = canvas(), r = rnd(7);
  if (f.kind === 'wood') {                       // 木地板：每片 15 公分寬，深淺略有不同，錯縫
    for (let i = 0; i < 8; i++) {
      x.fillStyle = shade(f.color, 0.95 + r() * 0.1); x.fillRect(0, i * 64, 512, 64);
      for (let k = 0; k < 14; k++) { x.fillStyle = shade(f.color, 0.9 + r() * 0.08).replace('rgb', 'rgba').replace(')', ',.25)'); x.fillRect(0, i * 64 + r() * 64, 512, 1 + r() * 2); }   // 木紋
      x.fillStyle = 'rgba(60,40,20,.22)'; x.fillRect(0, i * 64, 512, 1.5); x.fillRect((i * 197) % 512, i * 64, 1.5, 64);
    }
  } else if (f.kind === 'tile') {                // 60×120 大板磁磚
    x.fillStyle = f.color; x.fillRect(0, 0, 512, 512); noise(x, f.color, 30, 0.035, r, 60, 160);
    x.fillStyle = f.grout; x.fillRect(0, 0, 512, 2); x.fillRect(0, 256, 512, 2); x.fillRect(0, 0, 2, 512);
  } else if (f.kind === 'marble') {              // 大理石：底色＋細長的紋路＋拼縫
    x.fillStyle = f.color; x.fillRect(0, 0, 512, 512); noise(x, f.color, 40, 0.025, r, 60, 180);
    x.strokeStyle = f.vein; x.globalAlpha = 0.35;
    for (let v = 0; v < 6; v++) {
      x.lineWidth = 0.4 + r() * 1.2; x.beginPath(); let px = r() * 512, py = 0; x.moveTo(px, py);
      while (py < 512) { px += (r() - 0.45) * 40; py += 10 + r() * 30; x.lineTo(px, py); } x.stroke();
    }
    x.globalAlpha = 1; x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, 0, 512, 1.5); x.fillRect(0, 0, 1.5, 512);
  } else {                                       // 微水泥：整片無接縫，只有斑駁
    x.fillStyle = f.color; x.fillRect(0, 0, 512, 512); noise(x, f.color, 140, 0.14, r, 30, 140);
  }
  const t = toTex(c); cache.set(key, t); return t;
}
// 牆面貼圖：礦物塗料（斑駁）或大理石；一張鋪 100 公分
export function wallTexture(kind, color, vein) {
  const key = kind + color + (vein || ''); if (cache.has(key)) return cache.get(key);
  const [c, x] = canvas(), r = rnd(11);
  x.fillStyle = color; x.fillRect(0, 0, 512, 512);
  if (kind === 'plaster') { noise(x, color, 120, 0.14, r, 60, 200); noise(x, color, 260, 0.1, r, 8, 30); }   // 大片柔和的深淺＋細小的刷痕
  else { floorTexture({ kind: 'marble', color, vein }); x.drawImage(cache.get(JSON.stringify({ kind: 'marble', color, vein })).image, 0, 0); }
  const t = toTex(c); cache.set(key, t); return t;
}
// 讓貼圖照實際尺寸鋪（BoxGeometry 預設每一面都拉滿一張）
export function scaleBoxUV(geo, sx, sy, sz, unit) {
  const uv = geo.attributes.uv, dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];   // +x −x +y −y +z −z
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * dims[f][0] / unit, uv.getY(j) * dims[f][1] / unit); }
  uv.needsUpdate = true;
}
