/* 莉凱家俱自家商品 3D 模型
 * 來源：andytsai-000/furniture-planner 的自家商品與廚房一般款，加上我們自己建的沙發（雷內新版、花瓣、GET BACK、聖日耳曼）
 * 自動擷取合併，請勿手改；原版或沙發建模更新時請 Claude 重新擷取。
 * 單位公分，原點在家具底部中心，正面朝 +Z。
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const spaces = { colors: [] };                       // 原版的自訂紋路：這裡不用
const overlay = new THREE.Group(), state = { room: {} };
let TYPES;
const V3 = THREE.Vector3;
const MATS = new Map();
const CTEX = new Map();
function customTex(col, even) {                                          // even：皮革、布料這類應該整片均勻的材質——把圖片上深深淺淺的色塊完全拉平，只留細紋
  try {
    const o = spaces && Array.isArray(spaces.colors) ? spaces.colors.find(q => q.c === col && q.tex) : null; if (!o) return null;
    const key = o.tex + (even ? '|even' : ''); let t = CTEX.get(key);
    if (!t) {
      if (even) {
        const S = 192, mk = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; }, c = mk(S), x = c.getContext('2d', { willReadFrequently: true });
        x.fillStyle = col; x.fillRect(0, 0, S, S); t = new THREE.CanvasTexture(c);
        const im = new Image(); im.onload = () => { try {
          x.drawImage(im, 0, 0, S, S); const sm = mk(12); sm.getContext('2d').drawImage(c, 0, 0, 12, 12);
          const bl = mk(S), bx = bl.getContext('2d', { willReadFrequently: true }); bx.imageSmoothingQuality = 'high'; bx.drawImage(sm, 0, 0, S, S);
          const I = x.getImageData(0, 0, S, S), d = I.data, lo = bx.getImageData(0, 0, S, S).data, av = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
          for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) { const r = d[i + k] / Math.max(10, lo[i + k]); d[i + k] = Math.max(0, Math.min(255, av[k] * (1 + (r - 1) * 0.45))); }   // 每一點只留下和周圍的相對差異（細紋），底色統一成平均色
          x.putImageData(I, 0, 0); t.needsUpdate = true; } catch (e) { } };
        im.src = o.tex;
      } else t = new THREE.TextureLoader().load(o.tex);
      t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 4; CTEX.set(key, t);   // 鏡射重複：接縫處看不出來
    }
    return t;
  } catch (e) { return null; }
}
const TRI_CM = 42, TRI_GAIN = 0.55, TRI_SAT = 1.06;
let TRI_MAX = 0, TRI_CUR = 0;
const GRAIN_ON = { value: 0 };
const GRAIN = { leather: 1, fabric: 2, velvet: 3, wood: 4 };
function fxMat(m) {                                                       // 依 userData.tri（自訂紋路）、userData.grain（質感）改寫著色器
  const U = m.userData, tri = !!U.tri, gr = U.grain || 0;
  m.onBeforeCompile = sh => {
    sh.uniforms.grainOn = GRAIN_ON;
    if (tri) { sh.uniforms.triMap = { value: U.tri }; sh.uniforms.triS = { value: U.triS }; sh.uniforms.triO = { value: U.triO }; sh.uniforms.triG = { value: new THREE.Vector2(TRI_GAIN, TRI_SAT) }; }
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTriP;\nvarying vec3 vTriN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTriP = transformed * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));\nvTriN = objectNormal;');
    let head = '#include <common>\nvarying vec3 vTriP;\nvarying vec3 vTriN;\nuniform float grainOn;\n' + (tri ? 'uniform sampler2D triMap;\nuniform float triS;\nuniform float triO;\nuniform vec2 triG;\n' : '');
    if (gr) head += `
float gHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float gNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gHash(i), gHash(i + vec3(1, 0, 0)), f.x), mix(gHash(i + vec3(0, 1, 0)), gHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(gHash(i + vec3(0, 0, 1)), gHash(i + vec3(1, 0, 1)), f.x), mix(gHash(i + vec3(0, 1, 1)), gHash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
vec2 gUV(vec3 q) { vec3 a = abs(vTriN); return a.x > a.y && a.x > a.z ? q.zy : a.y > a.z ? q.xz : q.xy; }
float grainH(vec3 q) {
  ${gr === 1 ? 'float n = gNoise(q * 1.3) * 0.65 + gNoise(q * 2.9) * 0.35; return smoothstep(0.2, 0.8, n);'
    : gr === 2 ? 'vec2 u = gUV(q) * 5.0; return 0.5 + 0.35 * sin(u.x) * sin(u.y) + 0.3 * (gNoise(q * 1.6) - 0.5);'
    : gr === 3 ? 'return gNoise(q * 3.0) * 0.6 + gNoise(q * 0.9) * 0.4;'
    : 'vec2 u = gUV(q); return gNoise(vec3(u.x * 0.05, u.y * 1.6, 3.0)) * 0.7 + gNoise(vec3(u.x * 0.2, u.y * 4.5, 7.0)) * 0.3;'}
}
`;
    let fs = sh.fragmentShader.replace('#include <common>', head);
    let mapCode = '#include <map_fragment>';
    if (tri) mapCode = 'vec3 triW = pow(abs(normalize(vTriN)), vec3(4.0)); triW /= (triW.x + triW.y + triW.z);\ndiffuseColor.rgb *= (texture2D(triMap, vTriP.zy / triS + triO) * triW.x + texture2D(triMap, vTriP.xz / triS + triO) * triW.y + texture2D(triMap, vTriP.xy / triS + triO) * triW.z).rgb * triG.x;\nfloat triL = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)); diffuseColor.rgb = max(vec3(0.0), mix(vec3(triL), diffuseColor.rgb, triG.y));';
    if (gr) {
      const amt = [0, 0.07, 0.06, 0.025, 0.03][gr], col = [0, 0.05, 0.07, 0.05, tri ? 0 : 0.07][gr], fq = [0, 2.9, 5.0, 3.0, 4.5][gr];   // 起伏的高度（公分）、顏色的深淺變化、最細的紋路頻率
      mapCode += `\nfloat gH = 0.5, gFade = 0.0;\nif (grainOn > 0.5) { gFade = clamp(1.3 - length(fwidth(vTriP)) * ${(fq * 0.9).toFixed(2)}, 0.0, 1.0); if (gFade > 0.01) gH = grainH(vTriP); diffuseColor.rgb *= 1.0 + (gH - 0.5) * ${col.toFixed(2)} * gFade; }`;
      fs = fs.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (grainOn > 0.5 && gFade > 0.01) {
  vec2 gD = vec2(grainH(vTriP + dFdx(vTriP)) - gH, grainH(vTriP + dFdy(vTriP)) - gH) * ${amt.toFixed(3)} * gFade;   // 往左右、上下各取一點算坡度（每個像素各自算，不會出現小方塊）
  vec3 gSx = dFdx(-vViewPosition), gSy = dFdy(-vViewPosition), gR1 = cross(gSy, normal), gR2 = cross(normal, gSx);
  float gDet = dot(gSx, gR1) * faceDirection;
  normal = normalize(abs(gDet) * normal - sign(gDet) * (gD.x * gR1 + gD.y * gR2));
}`);
      fs = fs.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nif (grainOn > 0.5) roughnessFactor = clamp(roughnessFactor + (0.5 - gH) * 0.18 * gFade, 0.04, 1.0);`);
    }
    sh.fragmentShader = fs.replace('#include <map_fragment>', mapCode);
  };
  m.customProgramCacheKey = () => 'fx' + (tri ? 't' : '') + gr;
  m.needsUpdate = true;
  return m;
}
function triMat(m, tx, even) {
  const slab = even === 'slab' && TRI_MAX > 0;                            // 大理石、陶板：整張圖剛好鋪滿這件家具最長的一邊（像一整片石板，紋路跟著尺寸放大縮小，不重複）
  m.userData.triO = slab ? 0.5 : 0;
  m.userData.triS = slab ? TRI_MAX + 2 : even ? Math.max(14, (TRI_CUR || TRI_CM) * 0.4) : TRI_CUR || TRI_CM;   // 皮革、布料的紋理本來就細：鋪小一點
  m.map = null; m.color.set('#ffffff'); if (m.clearcoat !== undefined) m.clearcoat = Math.min(m.clearcoat, 0.08); if (m.sheen !== undefined) m.sheen = 0;   // 表面的反光、絨光會把顏色洗白：自訂的紋路以圖片的顏色為準
  m.userData.tri = tx;
  return fxMat(m);
}
function mat(color, rough = 0.75, metal = 0) {
  const tx = customTex(color), k = color + '|' + rough + '|' + metal + (tx ? '|' + tx.uuid + '|' + TRI_CUR : '');
  if (!MATS.has(k)) { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: metal }); if (tx) triMat(m, tx); MATS.set(k, m); }
  return MATS.get(k);
}
function add(g, geo, m, x, y, z) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  g.add(mesh); return mesh;
}
function B(g, w, h, d, x, y, z, m) { return add(g, new THREE.BoxGeometry(Math.max(w, .1), Math.max(h, .1), Math.max(d, .1)), m, x, y, z); }
function RB(g, w, h, d, r, x, y, z, m) {
  w = Math.max(w, .2); h = Math.max(h, .2); d = Math.max(d, .2);
  r = Math.min(r, Math.min(w, h, d) / 2 - 0.05);
  if (r <= 0.2) return B(g, w, h, d, x, y, z, m);
  return add(g, new RoundedBoxGeometry(w, h, d, 3, r), m, x, y, z);
}
function C(g, rt, rb, h, x, y, z, m, seg = 24) { return add(g, new THREE.CylinderGeometry(rt, rb, Math.max(h, .1), seg), m, x, y, z); }
function legs4(g, w, d, legH, inset, size, m, round = true) {
  for (const x of [-w / 2 + inset, w / 2 - inset]) for (const z of [-d / 2 + inset, d / 2 - inset]) {
    if (round) C(g, size / 2, size * 0.4, legH, x, legH / 2, z, m, 12);
    else B(g, size, legH, size, x, legH / 2, z, m);
  }
}
const opt = (id, name, extra = {}) => ({ id, name, ...extra });
const GLASS = new THREE.MeshStandardMaterial({ color: '#d6e6ea', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false });
function glassPane(g, w, h, d, x, y, z) { const m = add(g, new THREE.BoxGeometry(w, h, d), GLASS, x, y, z); m.castShadow = false; return m; }
function rod(g, a, b, r, m) {
  const dir = new V3().subVectors(b, a), len = dir.length();
  const mesh = add(g, new THREE.CylinderGeometry(r, r, len, 10), m, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  mesh.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.normalize());
  return mesh;
}
function slats(g, x, y, fw, fh, z, m, dark) {
  B(g, fw, fh, 0.4, x, y, z - 0.9, dark);
  const n = Math.max(2, Math.floor(fw / 3.6)), step = fw / n;
  for (let i = 0; i < n; i++) B(g, step - 1.2, fh, 1.6, x - fw / 2 + step * (i + .5), y, z, m);
}
function mirrorIfLeft(it, g) { if (it.side !== 'left') return g; const o = new THREE.Group(); g.scale.x = -1; o.add(g); return o; }
const seatList = max => Array.from({ length: max }, (_, i) => opt(String(i + 1), `${i + 1} 人座`));
const SEATS_OPT = { key: 'seats', label: '座位數', list: seatList(4) };
const SEATS_OPT_L = { key: 'seats', label: '主座座位數', list: seatList(4) };
function seatsOf(it) { const T = TYPES[it.type] || {}; return Math.max(1, parseInt(it.seats || (T.def && T.def.seats) || 1, 10) || 1); }
const SIDE_OPT = { key: 'side', label: '貴妃位置', list: [opt('right', '貴妃在右'), opt('left', '貴妃在左')] };
function buildReclinerSofa(it) { // 電動躺椅沙發：方塊扶手＋獨立座椅模組＋上下分段靠背
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), P = mat(it.color2, 0.95), dark = mat('#3d3a38', 0.8);
  const base = 3, seatTop = Math.min(47, h * 0.47), aw = Math.min(28, w * 0.13);
  const armTop = Math.min(64, h * 0.64), capT = 13, bt = Math.min(22, d * 0.22);
  B(g, w - 8, base, d - 10, 0, base / 2, -2, dark);
  RB(g, w - 2 * aw + 2, h - 22 - base, bt, 4, 0, base + (h - 22 - base) / 2, -d / 2 + bt / 2, F);
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - aw / 2);
    RB(g, aw - 3, armTop - capT - base, d - 8, 2.5, x + s * 1.5, base + (armTop - capT - base) / 2, -3, F);
    RB(g, aw, capT, d - 2, 4, x, armTop - capT / 2, -1, F);
  }
  const inner = w - 2 * aw, n = seatsOf(it), cw = inner / n, cd = d - bt - 2;
  const backH = (h - seatTop) * 0.55, headH = (h - seatTop) * 0.5;
  for (let i = 0; i < n; i++) {
    const x = -inner / 2 + cw * (i + .5);
    RB(g, cw - 1.2, seatTop - base, cd, 3, x, base + (seatTop - base) / 2, d / 2 - cd / 2, F);
    const m1 = RB(g, cw - 2, backH, 16, 5, x, seatTop + backH / 2 - 1, -d / 2 + bt + 6, F); m1.rotation.x = -0.1;
    const m2 = RB(g, cw - 2.5, headH, 20, 7, x, h - headH / 2, -d / 2 + bt / 2 + 6, F); m2.rotation.x = 0.12;
  }
  if (inner > 80) for (const s of [-1, 1]) {
    const m = RB(g, 44, 44, 12, 6, s * (inner / 2 - 30), seatTop + 22, -d / 2 + bt + 22, P); m.userData.pil = 1;
    m.rotation.x = -0.25; m.rotation.z = s * 0.15;
  }
  return g;
}
function tuftPillowGeo(bw, bh, bt, cols, rowAt) {
  const geo = new THREE.BoxGeometry(1, 1, 1, 54, 36, 8), P = geo.attributes.position, N = geo.attributes.normal;
  const A = bw / 2, Bh = bh / 2, Cc = bt / 2, R = Math.min(Cc * 0.86, 10), dep = Math.min(1.5, bt * 0.07), sg = 2.5, ys = (rowAt - 0.5) * bh;
  const cl = (v, m) => Math.max(-m, Math.min(m, v));
  for (let i = 0; i < P.count; i++) {
    let px = P.getX(i) * bw, py = P.getY(i) * bh, pz = P.getZ(i) * bt;
    const cx = cl(px, A - R), cy = cl(py, Bh - R), cz = cl(pz, Cc - R);
    let nx = px - cx, ny = py - cy, nz = pz - cz; const ln = Math.hypot(nx, ny, nz) || 1; nx /= ln; ny /= ln; nz /= ln;
    px = cx + nx * R; py = cy + ny * R; pz = cz + nz * R;
    // 壓線：直線（正面＋上緣）、橫線（只在正面）
    const wf = Math.max(0, nz), wv = Math.min(1, wf + Math.max(0, ny) * 0.8);
    let ev = 0, dev = 0;
    for (let c = 1; c < cols; c++) { const t = (px - (-A + bw * c / cols)) / sg, e = Math.exp(-t * t); ev += e; dev += -2 * t / sg * e; }
    const th = (py - ys) / sg, eh = Math.exp(-th * th), deh = -2 * th / sg * eh;
    const D = dep * (wv * ev + wf * eh * (1 - ev * 0.5));
    px -= nx * D; py -= ny * D; pz -= nz * D;
    P.setXYZ(i, px, py, pz);
    const gx = dep * wv * dev, gy = dep * wf * deh; let mx = nx + gx * Math.max(wf, 0.3), my = ny + gy * wf, mz = nz; const ml = Math.hypot(mx, my, mz) || 1;
    N.setXYZ(i, mx / ml, my / ml, mz / ml);
  }
  P.needsUpdate = true; N.needsUpdate = true; geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
}
function buildDanishSofa(it) { // 丹麥沙發：布面底框＋圓錐木腳、後高前低的弧形扶手、厚坐墊、格紋車線的蓬鬆背墊
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), W = mat(it.color2, 0.55), dark = mat('#2a2826', 0.6);
  const seam = surfMat(it.fabric || 'fabric', '#' + new THREE.Color(it.color).multiplyScalar(0.87).getHexString());
  const legH = Math.min(15, h * 0.17), pH = Math.min(11, h * 0.12), baseTop = legH + pH;
  const seatTop = Math.min(45, h * 0.5), aw = Math.min(17, w * 0.085), ins = 1.5;
  const armF = Math.min(57, h * 0.635), armB = Math.min(68, h * 0.755), bt = Math.min(13, d * 0.15);
  // 木腳（上粗下細）＋中間的黑色支撐腳
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) C(g, 1.9, 2.8, legH, sx * (w / 2 - 7), legH / 2, sz * (d / 2 - 7), W, 20).rotation.x = Math.PI;
  if (w > 150) C(g, 1.4, 1.4, legH, 0, legH / 2, d / 2 - 14, dark, 12);
  // 底框
  RB(g, w, pH, d, 2.6, 0, legH + pH / 2, 0, F);
  // 扶手：側面輪廓（後高、弧線下降、前段平、前上角圓）擠出成厚度
  const zb = -d / 2 + ins, zf = d / 2 - ins, L = zf - zb, bv = 2.6, y0 = baseTop - 0.3;
  const sh = new THREE.Shape();
  sh.moveTo(zb + bv, y0); sh.lineTo(zf - bv, y0);
  sh.lineTo(zf - bv, armF - bv - 5); sh.quadraticCurveTo(zf - bv, armF - bv, zf - bv - 6, armF - bv);
  sh.lineTo(zb + L * 0.52, armF - bv);
  sh.bezierCurveTo(zb + L * 0.34, armF - bv, zb + L * 0.3, armB - bv, zb + L * 0.1, armB - bv);
  sh.quadraticCurveTo(zb + bv, armB - bv, zb + bv, armB - bv - 5); sh.lineTo(zb + bv, y0);
  const at = aw - 2 * bv;
  for (const sx of [-1, 1]) {
    const geo = new THREE.ExtrudeGeometry(sh, { depth: at, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 4, curveSegments: 16 });
    geo.translate(0, 0, -at / 2);
    const m = add(g, geo, F, sx * (w / 2 - ins - aw / 2), 0, 0); m.rotation.y = -Math.PI / 2;
    // 扶手外側的車線：一條橫的、兩條直的
    const xo = sx * (w / 2 - ins + 0.05), hy = baseTop + (armF - baseTop) * 0.45;
    B(g, 0.3, 0.35, L - 6, xo, hy, 0, seam);
    for (const k of [0.36, 0.7]) { const z = zf - L * k, top = k > 0.5 ? armF + (armB - armF) * 0.55 : armF; B(g, 0.3, top - baseTop - 5, 0.35, xo, baseTop + (top - baseTop - 5) / 2 + 1, z, seam); }
  }
  // 背框（和扶手後段一樣高）
  const inner = w - 2 * aw - 2 * ins;
  RB(g, inner + 2, armB - baseTop, bt, 3, 0, baseTop + (armB - baseTop) / 2, zb + bt / 2, F);
  // 坐墊、背墊
  const n = seatsOf(it), cw = inner / n, sd = zf - (zb + bt) - 0.5, st = seatTop - baseTop;
  const bH = h - seatTop + 1.1, bT = Math.min(25, d * 0.28), rows = [bH * 0.52, bH * 0.48];
  for (let i = 0; i < n; i++) {
    const x = -inner / 2 + cw * (i + 0.5);
    RB(g, cw - 0.6, st, sd, 4.5, x, baseTop + st / 2, zf - sd / 2 - 0.5, F);
    // 背墊：一整塊蓬鬆的墊子往後靠，正面有兩條直的、一條橫的淺壓線（3 欄 × 2 列）
    const bg = new THREE.Group(); bg.position.set(x, seatTop - 3, zb + bt - 3); bg.rotation.x = -0.15; g.add(bg);
    add(bg, tuftPillowGeo(cw - 0.8, bH, bT, 3, 0.56), F, 0, bH / 2, bT / 2);
  }
  return g;
}
function softPillowGeo(pw, ph, pt) {
  const geo = new THREE.BoxGeometry(1, 1, 1, 22, 22, 2), P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const u = P.getX(i) * 2, v = P.getY(i) * 2, q = P.getZ(i) * 2;
    const f = Math.pow(Math.max(0, 1 - u * u * u * u), 0.55) * Math.pow(Math.max(0, 1 - v * v * v * v), 0.55);
    P.setXYZ(i, u * pw / 2 * (1 - 0.055 * v * v), v * ph / 2 * (1 - 0.055 * u * u), q * pt / 2 * (0.1 + 0.9 * f));
  }
  P.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
  geo.userData.pil = true;                                               // 抱枕、腰枕：可以個別點選換顏色
  return geo;
}
function buildLetItBeSofa(it) { // Let it be：皮革包覆的薄底框＋細不鏽鋼腳、厚坐墊、低矮分段靠背、大靠枕；轉角＋往前伸的貴妃（預設貴妃在右，選左時鏡射）
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), Lt = surfMat('leather', it.color2), Mt = mat('#d9dbde', 0.18, 0.95);
  const legH = Math.min(13, h * 0.16), fT = 4, pTop = legH + fT, cushT = Math.min(22, h * 0.28), seatTop = pTop + cushT;
  const sd = Math.min(105, d * 0.4), cwid = Math.min(110, w * 0.3), bt = 11, armW = Math.min(25, w * 0.07);
  const backTop = Math.min(57, h * 0.71), armTop = Math.min(seatTop + 17, backTop), zb = -d / 2, xL = -w / 2, xR = w / 2, wingL = xR - cwid;
  // 底框：皮革包覆的圓管圍一圈（上緣一道白色車線），管子兩端是亮面金屬蓋；裡面一片深色底板托著坐墊
  const Dk = mat('#2b2a2b', 0.7), St = mat('#f1e9da', 0.8), tr = fT / 2 + 0.3, ty = legH + fT / 2, cap = 0.9;
  const tubeX = (x0, x1, z, o) => {                                         // 左右向的管子：兩端有金屬蓋
    const len = x1 - x0 - 2 * cap, cx = (x0 + x1) / 2;
    C(g, tr, tr, len, cx, ty, z, Lt, 24).rotation.z = Math.PI / 2;
    for (const e of [x0 + cap / 2, x1 - cap / 2]) C(g, tr + 0.12, tr + 0.12, cap, e, ty, z, Mt, 24).rotation.z = Math.PI / 2;
    B(g, len - 1, 0.24, 0.3, cx, ty + tr * 0.80, z + o * tr * 0.62, St).rotation.x = o * 0.66;
  };
  const tubeZ = (z0, z1, x, o) => {                                         // 前後向的管子：接在左右向的管子之間
    C(g, tr, tr, z1 - z0, x, ty, (z0 + z1) / 2, Lt, 24).rotation.x = Math.PI / 2;
    B(g, 0.3, 0.24, z1 - z0 - 1, x + o * tr * 0.62, ty + tr * 0.80, (z0 + z1) / 2, St).rotation.z = -o * 0.66;
  };
  const zB = zb + tr + 0.15, zF = zb + sd - tr, zW = d / 2 - tr - 0.15;
  tubeX(xL, xR, zB, -1); tubeX(xL, wingL + tr, zF, 1); tubeX(wingL, xR, zW, 1);
  tubeZ(zB + tr, zF - tr, xL + tr + cap, -1); tubeZ(zB + tr, zW - tr, xR - tr - cap, 1); tubeZ(zF + tr, zW - tr, wingL + tr + cap, -1);
  B(g, wingL - xL - 8, 1.6, sd - 2 * tr - 6, (xL + wingL) / 2 + 1, ty - 0.6, zb + sd / 2, Dk);
  B(g, cwid - 10, 1.6, d - 2 * tr - 6, xR - cwid / 2, ty - 0.6, 0, Dk);
  // 不鏽鋼腳：和管子上的金屬套是一體的——套住圓管的金屬套往下收成一支上寬下窄的扁腳
  const sl = 7, legGeo = (() => {
    const hw = sl / 2, yT = ty - tr * 0.35, sh = new THREE.Shape();
    sh.moveTo(-hw, yT); sh.lineTo(hw, yT);
    sh.bezierCurveTo(hw, yT - 2.6, 2.05, yT - 2.4, 1.95, yT - 5.2);      // 肩部：從金屬套的寬度弧線收窄
    sh.lineTo(1.15, 1.25); sh.quadraticCurveTo(1.1, 0.8, 0.7, 0.8); sh.lineTo(-0.7, 0.8); sh.quadraticCurveTo(-1.1, 0.8, -1.15, 1.25);
    sh.lineTo(-1.95, yT - 5.2); sh.bezierCurveTo(-2.05, yT - 2.4, -hw, yT - 2.6, -hw, yT);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.5, bevelSegments: 3, curveSegments: 14 });
    geo.translate(0, 0, -0.75); return geo;
  })();
  const leg = (x, z) => {
    C(g, tr + 0.2, tr + 0.2, sl, x, ty, z, Mt, 28).rotation.z = Math.PI / 2;   // 套住圓管的金屬套
    add(g, legGeo, Mt, x, 0, z);                                               // 扁腳（寬的那一面順著管子）
    C(g, 0.95, 0.95, 0.25, x, 0.125, z, Dk, 14).scale.z = 0.8;                 // 腳底墊片
  };
  for (const z of [zB, zF]) { leg(xL + 22, z); leg(wingL - 18, z); if (wingL - xL > 200) leg((xL + wingL) / 2, z); }
  for (const x of [wingL + 16, xR - 16]) { leg(x, zW); leg(x, zB); }
  // 靠背（低矮、一段一段）、主座外端的扶手
  const seatL = xL + armW, inner = wingL - seatL, n = seatsOf(it), cw = inner / n, bh = backTop - pTop;
  for (let i = 0; i < n; i++) RB(g, cw - 1.2, bh, bt, 5, seatL + cw * (i + .5), pTop + bh / 2, zb + bt / 2 + 0.5, F);
  RB(g, cwid - bt - 1, bh, bt, 5, wingL + (cwid - bt) / 2, pTop + bh / 2, zb + bt / 2 + 0.5, F);
  RB(g, armW, armTop - pTop, sd - 1, 5, xL + armW / 2 + 0.5, pTop + (armTop - pTop) / 2, zb + sd / 2, F);
  // 貴妃外側的靠背（只到轉角那一段），外面包一片皮革
  const ws = d - sd > 130 ? Math.min(80, (d - sd) * 0.48) : 0, sideLen = ws ? sd + ws - 1.5 : Math.min(sd * 1.05, d * 0.5);   // 貴妃這一側：轉角後面再一個有靠背的座位，最前面才是沒有靠背的貴妃
  RB(g, bt, bh, sideLen, 5, xR - bt / 2 - 0.5, pTop + bh / 2, zb + sideLen / 2 + 0.5, F);
  RB(g, 1.4, bh - 6, sideLen - 8, 0.6, xR - 0.75, pTop + (bh - 6) / 2 + 1, zb + sideLen / 2 + 0.5, Lt);
  // 坐墊：主座每人一塊、轉角一塊、貴妃一塊
  const seatD = sd - bt - 2.5;
  for (let i = 0; i < n; i++) RB(g, cw - 1, cushT, seatD, 4.5, seatL + cw * (i + .5), pTop + cushT / 2, zb + bt + 1 + seatD / 2, F);
  const cornerW = cwid - bt - 2;
  RB(g, cornerW, cushT, seatD, 4.5, wingL + cornerW / 2 + 0.5, pTop + cushT / 2, zb + bt + 1 + seatD / 2, F);
  const chD = d - sd - ws - (ws ? 1.5 : 2);
  if (ws) RB(g, cornerW, cushT, ws - 1, 4.5, wingL + cornerW / 2 + 0.5, pTop + cushT / 2, zb + sd + ws / 2 - 0.5, F);
  RB(g, cwid - 2.4, cushT, chD, 4.5, xR - cwid / 2, pTop + cushT / 2, d / 2 - chD / 2 - 1.2, F);
  // 背墊：每個座位一塊方正的大背墊，靠在矮背板上、高出背板；轉角在後面和側面各一塊
  const bcH = h - seatTop + 1.5, bcT = 19, lean = 0.2;
  const backCush = (bw, x, z, ry) => { const o = new THREE.Group(); o.position.set(x, seatTop - 1.5, z); o.rotation.y = ry || 0; const q = RB(o, bw, bcH, bcT, 6.5, 0, bcH / 2, 0, F); q.rotation.x = -lean; q.position.z = bcT / 2 + 1 - Math.sin(lean) * bcH / 2 + Math.sin(lean) * bcH * 0.5; g.add(o); };
  for (let i = 0; i < n; i++) backCush(cw - 7, seatL + cw * (i + .5), zb + bt + 1);
  backCush(cornerW - 9, wingL + cornerW / 2 - 3, zb + bt + 1);
  if (ws) backCush(ws - 7, xR - bt - 1, zb + sd + ws / 2 - 0.5, -Math.PI / 2);
  else backCush(Math.min(sideLen - bt - 24, 78), xR - bt - 1, zb + bt + 22 + Math.min(sideLen - bt - 24, 78) / 2, -Math.PI / 2);
  // 抱枕：轉角兩個、扶手那端三個（小的、斜靠著）
  const pil = (pw, phh, pt, x, z, m, ln, ry, rz) => { const o = new THREE.Group(); o.position.set(x, seatTop - 1, z); o.rotation.y = ry || 0; const q = add(o, softPillowGeo(pw, phh, pt), m, 0, phh / 2, 0); q.rotation.x = -ln; q.rotation.z = rz || 0; q.position.z = Math.sin(ln) * phh / 2; g.add(o); };
  const pz = zb + bt + bcT + 9;
  // 左右各三顆、兩邊對稱：由外往內是橘色、深黃、綠色
  const PC = ['#d8672a', '#a8791a', '#5f7d55'].map(c => surfMat(it.fabric || 'fabric', c)), px = [13, 29, 46], pry = [0.75, 0.5, 0.35], pzz = [1, 7, 13], psz = [[44, 42, 12], [42, 40, 12], [40, 38, 11]], prz = [0.04, -0.05, 0.06], pln = [0.3, 0.36, 0.42];
  const xC = wingL + cornerW + 0.5;
  for (let k = 0; k < 3; k++) {
    if (n > 0) pil(psz[k][0], psz[k][1], psz[k][2], seatL + px[k], pz + pzz[k], PC[k], pln[k], pry[k], prz[k]);
    pil(psz[k][0], psz[k][1], psz[k][2], xC - px[k], pz + pzz[k], PC[k], pln[k], -pry[k], -prz[k]);
  }
  return mirrorIfLeft(it, g);
}
function sweepShellGeo(pts, side, y0, tF, hF, r0, r1, o = {}) {
  const n = pts.length, S = [0], A = 8, M = 2 * A + 3, pos = [], uv = [], idx = [];
  for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = S[n - 1], cen = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = side * (b[1] - a[1]) / tl, nz = -side * (b[0] - a[0]) / tl, s = S[i];
    const k0 = s < r0 ? Math.sqrt(1 - (1 - s / r0) ** 2) : 1, k1 = L - s < r1 ? Math.sqrt(1 - (1 - (L - s) / r1) ** 2) : 1, k = Math.max(0.1, Math.min(k0, k1));
    const yb = y0 + (o.lift ? o.lift(s, L) : 0), t = tF(s, L), H = Math.max(yb + 2, hF(s, L)), c = t / 2, hw = k * t / 2, rr = Math.min(hw, (H - yb) * 0.45);
    const ring = [[c + hw, yb]];
    for (let j = 0; j <= 2 * A; j++) { const f = j / (2 * A) * Math.PI; ring.push([c + hw * Math.cos(f), H - rr + rr * Math.sin(f)]); }
    ring.push([c - hw, yb]);
    for (const q of ring) { const v = Math.min(1, Math.max(0, (q[1] - yb) / (H - yb))), wi = Math.min(1, Math.max(0, q[0] / t)); q[0] -= (o.bulge || 0) * k * Math.sin(Math.PI * Math.pow(v, 0.8)) * (1 - wi) + (o.taper || 0) * t * v * wi; }
    ring.forEach((q, j) => { pos.push(pts[i][0] + nx * q[0], q[1], pts[i][1] + nz * q[0]); uv.push(s / 60, j / M); });
    cen.push([pts[i][0] + nx * c, (yb + H) / 2, pts[i][1] + nz * c]);
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < M; j++) {
    const a = i * M + j, b = i * M + (j + 1) % M, c = a + M, e = b + M;
    idx.push(a, c, b, b, c, e);
  }
  const c0 = n * M, c1 = c0 + 1; pos.push(...cen[0], ...cen[n - 1]); uv.push(0, 0.5, L / 60, 0.5);
  for (let j = 0; j < M; j++) { idx.push(c0, j, (j + 1) % M); idx.push(c1, (n - 1) * M + (j + 1) % M, (n - 1) * M + j); }
  let vol = 0;                                                             // 面的正反看體積的正負：算出來是負的就整個翻面
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const q = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = q; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
}
const RCH_PIL_OPT = { key: 'rp', label: '圓抱枕', list: [opt('on', '放圓抱枕'), opt('off', '不放')] };
const RENE = {
  mainDepth: 80,     // 主座（一字型）的深度；圓貴妃的直徑＝家具的「深」
  seatH: 40,         // 座面高度
  seatEdge: 7,       // 座面上緣的圓角半徑
  seatInset: 5,      // 圓座比貴妃靠背的外緣內縮多少
  bite: 25,          // 主座靠貴妃那端內凹，最後面最多伸進圓座多少
  backT: 15,         // 主座靠背厚度
  armT: 22,          // 主座扶手厚度
  chaiseBackT: 14,   // 貴妃靠背厚度
  cornerR: 32,       // 靠背轉成扶手的轉角半徑
  bulge: 2.2,        // 靠背、扶手外側面中段往外鼓多少
  taper: 0.22,       // 靠背、扶手越往上越薄的比例（0＝上下一樣厚）
  armDrop: 30,       // 扶手前端從多長開始圓弧降低
  armEndH: 55,       // 扶手最前端（最低點）離地的高度；靠背最高點＝家具的「高」（預設 73）
  chaiseEnd: 0.16,   // 貴妃靠背繞到哪裡結束（弧度：0＝圓座正側邊，正值往前多繞一點，負值提早結束）
  chaiseDrop: 34,    // 貴妃靠背尾端從多長開始圓弧降低
  sqPillow: [62, 50, 21],   // 主座方抱枕：寬、高、厚
  sqPillowChaise: [72, 50, 21],   // 貴妃方抱枕：寬、高、厚
  sqPillowAt: [0.17, 0.68],   // 主座兩顆方抱枕的位置（0＝靠貴妃那端、1＝靠扶手那端）
  pillowLean: 0.24,  // 方抱枕往後靠的角度（弧度）
  roundPillowR: 23,  // 圓抱枕半徑
};
function buildRoundChaiseSofa(it) { // 雷內沙發：落地的整塊軟包主座＋圓形貴妃（雙色），靠背順著轉角彎成扶手、貴妃的靠背繞著圓座半圈；方形大背枕、圓抱枕（預設貴妃在右，選左時鏡射）
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), F2 = fabMat(it, 'color2'), Dk = mat('#232323', 0.7);
  const seamOf = c => surfMat(it.fabric || 'fabric', '#' + new THREE.Color(c).multiplyScalar(0.86).getHexString());
  const xL = -w / 2, xR = w / 2, zb = -d / 2;
  const P = RENE, R = Math.min(d / 2, w * 0.3), cx = xR - R, cz = zb + R, Rs = R - P.seatInset;          // 圓貴妃：直徑＝總深度，圓座比外圈的靠背內縮一點
  const sd = Math.min(P.mainDepth, d * 0.6), zf = zb + sd, xJ = xR - 2 * R + 4;              // 主座深度、主座和圓貴妃的交界
  const seatTop = Math.min(P.seatH, h * 0.58), y0 = 1.5, yw = 2.5, er = Math.min(P.seatEdge, seatTop * 0.2);
  const tb = P.backT, ta = Math.min(P.armT, (xJ - xL) * 0.15), tc = P.chaiseBackT, rc = Math.min(P.cornerR, sd * 0.42), bg = P.bulge;   // 靠背、扶手、貴妃靠背的厚度；殼的外側面中段微鼓（bg）
  const Rg = Rs + 0.8, xb = xJ + Math.min(P.bite, R * 0.33);                                 // 主座靠貴妃那端是內凹的弧，貼著圓座；越往後越伸進去，最多伸到 xb
  const line = (P, x0, z0, x1, z1) => { const m = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 4)); for (let i = 1; i <= m; i++) P.push([x0 + (x1 - x0) * i / m, z0 + (z1 - z0) * i / m]); };
  const arc = (P, ax, az, r, a0, a1) => { const m = Math.max(4, Math.ceil(Math.abs(a1 - a0) * r / 3)); for (let i = 1; i <= m; i++) { const a = a0 + (a1 - a0) * i / m; P.push([ax + r * Math.cos(a), az + r * Math.sin(a)]); } };
  const drop = (s, L, len, top, low) => { const u = Math.min(1, Math.max(0, (s - (L - len)) / len)); return top - (top - low) * (1 - Math.sqrt(1 - u * u)); };   // 尾端的頂高用四分之一圓弧降下來
  // 主座：深色底座、底部一圈滾邊、整塊的軟包座體（前緣一道車線）；平面輪廓靠貴妃那端內凹
  const mx0 = xL + ta - 5, mz0 = zb + tb - 5;
  const aF = Math.PI - Math.asin(Math.max(-1, Math.min(1, (zf - cz) / Rg))), aB = Math.PI + Math.acos(Math.min(1, (cx - xb) / Rg));
  const xF = cx + Rg * Math.cos(aF), fl = Math.min(7, sd * 0.1);
  const slab = (y, ht, bv, grow) => {                                        // 照主座的平面輪廓擠出一塊：上下緣倒圓角
    const sh = new THREE.Shape(), a0 = aF + fl / Rg;
    sh.moveTo(mx0, -mz0); sh.lineTo(mx0, -zf); sh.lineTo(xF - fl, -zf); sh.quadraticCurveTo(xF, -zf, cx + Rg * Math.cos(a0), -(cz + Rg * Math.sin(a0)));
    for (let i = 1; i <= 28; i++) { const q = a0 + (aB - a0) * i / 28; sh.lineTo(cx + Rg * Math.cos(q), -(cz + Rg * Math.sin(q))); }
    sh.lineTo(xb, -mz0); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: ht - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelOffset: grow - bv, bevelSegments: 5, curveSegments: 10 }), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 60, uv.getY(i) / 60);
    geo.rotateX(-Math.PI / 2); geo.translate(0, y + bv, 0); return geo;
  };
  B(g, xJ - xL - ta - 12, yw, sd - 12, (xL + ta + xJ) / 2 - 1, yw / 2, zb + sd / 2 - 1, Dk);   // 深色底座收在扶手內側，不會從扶手前端露出來
  add(g, slab(yw, 3.8, 1.4, -0.2), F, 0, 0, 0);
  add(g, slab(5.4, seatTop - 5.4, er, -0.6), F, 0, 0, 0);
  C(g, 0.22, 0.22, xF - fl - mx0 - er, (mx0 + er + xF - fl) / 2, seatTop - er - 0.3, zf - 0.62, seamOf(it.color), 6).rotation.z = Math.PI / 2;
  // 主座的靠背＋扶手：一片厚殼從交界沿著背面走、轉過圓角、順著側邊往前，扶手比靠背厚，前端圓弧收低、底緣微微離地
  const mp = [[xb, zb + bg]]; line(mp, xb, zb + bg, xL + bg + rc, zb + bg); arc(mp, xL + bg + rc, zb + bg + rc, rc, -Math.PI / 2, -Math.PI); line(mp, xL + bg, zb + bg + rc, xL + bg, zf + 2);
  const sC = xb - xL - bg - rc, eC = sC + Math.PI * rc / 2, tail = (s, L, len) => Math.min(1, Math.max(0, (s - (L - len)) / len));
  add(g, sweepShellGeo(mp, 1, y0, s => { const u = Math.min(1, Math.max(0, (s - sC + 14) / (eC - sC + 14))); return tb + (ta - tb) * u * u * (3 - 2 * u); },
    (s, L) => drop(s, L, Math.min(P.armDrop, sd * 0.4), h, Math.max(seatTop + 4, Math.min(P.armEndH, h))), 2, ta * 0.62, { bulge: bg, taper: P.taper, lift: (s, L) => 4 * tail(s, L, 26) ** 2 }), F, 0, 0, 0);
  // 圓貴妃：深色底座、圓座（上緣圓角、底部滾邊、側面一圈車線）、靠主座那個後角補一小塊
  C(g, Rs - 7, Rs - 7, yw, cx, yw / 2, cz, Dk, 48);
  const pr = [[0, yw], [Rs - 2.4, yw], [Rs - 0.6, 3.1], [Rs - 0.1, 4.4], [Rs - 0.6, 5.7], [Rs - 1.6, 6.3], [Rs - 0.5, 7.4], [Rs, 9.4]];
  for (let j = 0; j <= 8; j++) { const f = j / 8 * Math.PI / 2; pr.push([Rs - er + er * Math.cos(f), seatTop - er + er * Math.sin(f)]); }
  pr.push([0, seatTop]);
  add(g, new THREE.LatheGeometry(pr.map(p => new THREE.Vector2(p[0], p[1])), 96), F2, cx, 0, cz);
  const zc = cz - Math.sqrt(Math.max(0, Rs * Rs - (cx - xb) ** 2)) + 1.5;
  RB(g, cx - xb - 0.8, seatTop - 5.4, zc - zb - 6, 3, (xb + 0.8 + cx) / 2, 5.4 + (seatTop - 5.4) / 2, (zb + 6 + zc) / 2, F2);
  add(g, new THREE.TorusGeometry(Rs + 0.02, 0.22, 6, 120), seamOf(it.color2), cx, seatTop - er - 0.3, cz).rotation.x = Math.PI / 2;
  // 圓貴妃的靠背：從交界直直走到圓心正後方，再繞著圓座到外側，全程等高、尾端大圓角收下來
  const cp = [[xb, zb + bg]]; line(cp, xb, zb + bg, cx, zb + bg); arc(cp, cx, cz, R - bg, -Math.PI / 2, P.chaiseEnd);
  add(g, sweepShellGeo(cp, -1, y0, (s, L) => tc - 2 * tail(s, L, L * 0.4),
    (s, L) => drop(s, L, Math.min(P.chaiseDrop, R * 0.46), h, seatTop + 2), 2, 8, { bulge: bg, taper: P.taper, lift: (s, L) => 3 * tail(s, L, 22) ** 2 }), F2, 0, 0, 0);
  // 小黑腳
  for (const [x, z] of [[xL + 12, zb + 10], [xL + 12, zf - 10], [xJ - 12, zb + 10], [xJ - 12, zf - 10]]) C(g, 2.2, 2.2, 1.2, x, 0.6, z, Dk, 12);
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; C(g, 2.2, 2.2, 1.2, cx + (Rs - 14) * Math.cos(a), 0.6, cz + (Rs - 14) * Math.sin(a), Dk, 12); }
  // 方抱枕：斜靠在靠背上、高出靠背；主座兩顆用貴妃的布色、貴妃一顆用主座的布色（跳色）
  const lean = (geo, nm, m, x, z, ry, ln, rz) => {                          // (x, z)＝枕頭上緣靠著的位置，底部往前滑出去；nm＝面板上顯示的名字
    geo.userData.pilName = nm; const o = new THREE.Group(), ph = geo.boundingBox.max.y - geo.boundingBox.min.y; o.position.set(x, seatTop - 1, z); o.rotation.y = ry || 0;
    const q = add(o, geo, m, 0, ph / 2 * Math.cos(ln), Math.sin(ln) * ph / 2); q.rotation.x = -ln; q.rotation.z = rz || 0; g.add(o);
  };
  const span = xJ - (xL + ta), bw = Math.min(P.sqPillow[0], span * 0.44), bz = zb + tb + 6;
  for (const f of P.sqPillowAt) lean(softPillowGeo(bw, P.sqPillow[1], P.sqPillow[2]), '方抱枕', F2, xJ - span * f, bz, 0, P.pillowLean, f < 0.5 ? 0.015 : -0.02);
  lean(softPillowGeo(Math.min(P.sqPillowChaise[0], R * 0.96), P.sqPillowChaise[1], P.sqPillowChaise[2]), '方抱枕', F, cx - R * 0.1, zb + tc + 6, 0, P.pillowLean, 0.02);
  // 圓抱枕：扶手那端一顆、貴妃外側一顆
  if (it.rp !== 'off') {
    const P3 = surfMat(it.fabric || 'fabric', it.color3 || '#d49a2e'), rp = Math.min(P.roundPillowR, R * 0.31);
    const rpGeo = () => {
      const pts = []; for (let j = 0; j <= 20; j++) { const a = -Math.PI / 2 + j / 20 * Math.PI; pts.push(new THREE.Vector2(Math.max(0, rp * Math.pow(Math.cos(a), 0.8)), rp * 0.33 * Math.sin(a))); }
      const geo = new THREE.LatheGeometry(pts, 40); geo.rotateX(Math.PI / 2); geo.computeBoundingBox(); geo.userData.pil = true; return geo;
    };
    lean(rpGeo(), '圓抱枕', P3, xL + ta + rp * 0.85, zb + tb + 25, 0.5, 0.28);
    const a = -0.72, rr = R - tc - 10;
    lean(rpGeo(), '圓抱枕', P3, cx + rr * Math.cos(a), cz + rr * Math.sin(a), Math.atan2(-Math.cos(a), -Math.sin(a)), 0.3);
  }
  return mirrorIfLeft(it, g);
}
const BED_MATT_OPT = { key: 'matt', label: '床墊', list: [opt('on', '放床墊'), opt('off', '不放（只看床台）')] };
function wingShellGeo(w, Hh, t, rc, depthAt) {
  const xc = w / 2 - t / 2, zc = t / 2, N1 = 6, NA = 8, NB = 14, E = 5, rt = Math.min(t / 2 - 0.2, 1.8), lv = [];
  for (let i = 0; i <= 14; i++) lv.push([(Hh - rt) * i / 14, t / 2]);
  for (let j = 1; j <= 4; j++) { const q = j / 4 * Math.PI / 2; lv.push([Hh - rt + rt * Math.sin(q), Math.max(0.2, t / 2 - rt * (1 - Math.cos(q)))]); }
  const slice = (y, ht) => {
    const zt = Math.max(zc + rc + 0.5, depthAt(y) - t / 2), c = [];
    for (let i = 0; i < N1; i++) c.push([xc, zt + (zc + rc - zt) * i / N1]);
    for (let i = 0; i < NA; i++) { const q = -Math.PI / 2 * i / NA; c.push([xc - rc + rc * Math.cos(q), zc + rc + rc * Math.sin(q)]); }
    for (let i = 0; i < NB; i++) c.push([(xc - rc) * (1 - 2 * i / NB), zc]);
    for (let i = 0; i < NA; i++) { const q = -Math.PI / 2 - Math.PI / 2 * i / NA; c.push([-(xc - rc) + rc * Math.cos(q), zc + rc + rc * Math.sin(q)]); }
    for (let i = 0; i <= N1; i++) c.push([-xc, zc + rc + (zt - zc - rc) * i / N1]);
    const n = c.length, T = c.map((_, i) => { const p = c[Math.max(0, i - 1)], q = c[Math.min(n - 1, i + 1)], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; }), ring = [];
    for (let i = 0; i < n; i++) ring.push([c[i][0] - T[i][1] * ht, c[i][1] + T[i][0] * ht]);
    for (let k = 1; k <= E; k++) { const f = k / (E + 1) * Math.PI, i = n - 1; ring.push([c[i][0] + ht * (-T[i][1] * Math.cos(f) + T[i][0] * Math.sin(f)), c[i][1] + ht * (T[i][0] * Math.cos(f) + T[i][1] * Math.sin(f))]); }
    for (let i = n - 1; i >= 0; i--) ring.push([c[i][0] + T[i][1] * ht, c[i][1] - T[i][0] * ht]);
    for (let k = 1; k <= E; k++) { const f = k / (E + 1) * Math.PI; ring.push([c[0][0] + ht * (T[0][1] * Math.cos(f) - T[0][0] * Math.sin(f)), c[0][1] + ht * (-T[0][0] * Math.cos(f) - T[0][1] * Math.sin(f))]); }
    return { ring, n };
  };
  const pos = [], uv = [], idx = []; let M = 0, n = 0, U = null;
  for (const [y, ht] of lv) {
    const sl = slice(y, ht); M = sl.ring.length; n = sl.n;
    if (!U) { U = [0]; for (let i = 1; i < M; i++) U.push(U[i - 1] + Math.hypot(sl.ring[i][0] - sl.ring[i - 1][0], sl.ring[i][1] - sl.ring[i - 1][1])); }
    sl.ring.forEach((q, i) => { pos.push(q[0], y, q[1]); uv.push(U[i] / 60, y / 60); });
  }
  for (let j = 0; j < lv.length - 1; j++) for (let i = 0; i < M; i++) { const p = j * M + i, q = j * M + (i + 1) % M; idx.push(p, p + M, q, q, p + M, q + M); }
  const cap = (base, flip) => {                                           // 上、下的封口：外圈和內圈一格一格對接，兩端的半圓用扇形補
    const tri = (p, q, r) => flip ? idx.push(base + p, base + r, base + q) : idx.push(base + p, base + q, base + r), inn = i => n + E + (n - 1 - i);
    for (let i = 0; i < n - 1; i++) { tri(i, i + 1, inn(i + 1)); tri(i, inn(i + 1), inn(i)); }
    for (let k = 0; k <= E; k++) tri(n - 1, n + k, n + k + 1 <= n + E ? n + k + 1 : inn(n - 1));
    for (let k = 0; k <= E; k++) tri(inn(0), 2 * n + E + k, k < E ? 2 * n + E + k + 1 : 0);
  };
  const b0 = pos.length / 3; for (let i = 0; i < M; i++) { pos.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); uv.push(uv[i * 2], uv[i * 2 + 1]); }   // 底面另外一組頂點：底邊才會是利落的折角
  cap(b0, false); cap((lv.length - 1) * M, true);
  let vol = 0;
  for (let i = 0; i < idx.length; i += 3) { const p = idx[i] * 3, q = idx[i + 1] * 3, r = idx[i + 2] * 3; vol += pos[p] * (pos[q + 1] * pos[r + 2] - pos[q + 2] * pos[r + 1]) - pos[p + 1] * (pos[q] * pos[r + 2] - pos[q + 2] * pos[r]) + pos[p + 2] * (pos[q] * pos[r + 1] - pos[q + 1] * pos[r]); }
  if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const q = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = q; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
}
function buildAmisBed(it) { // 阿美族床台：布面床框浮在四支亮面金屬刀片腳上，床墊內嵌 5 cm；床頭是一片往後仰的布面薄殼，兩端圓角往前彎成淺淺的側翼（上窄、到床墊的高度最寬），裡面嵌一塊跳色的靠墊（中間一道車線）
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), F2 = fabMat(it, 'color2'), M = mat(it.color3 || '#c9ccd0', 0.14, 1), Dk = mat('#232323', 0.75);
  const seam = surfMat(it.fabric || 'fabric', '#' + new THREE.Color(it.color2).multiplyScalar(0.84).getHexString());
  const zb = -d / 2, zf = d / 2;
  const legH = Math.min(14, h * 0.14), fh = Math.min(17, h * 0.17), top = legH + fh, inset = Math.min(5, fh * 0.4), rim = 4;   // inset：床墊沉進床框的深度
  const mh = Math.min(27, h * 0.27), my = top - inset;                                                                      // 床墊厚度、床墊底的高度
  // 床頭的尺寸：外殼厚度、轉角半徑、靠墊厚度、往後仰的角度；整片床頭比床框的底再低一點
  const tw = 4, rc = Math.min(6, w * 0.04), padT = 7, lean = Math.min(0.09, 8 / h), hy0 = Math.max(4, legH - 4), Hh = (h - hy0 - Math.min(12, d * 0.06) * Math.sin(lean)) / Math.cos(lean) - 0.8, hz0 = zb + Hh * Math.sin(lean);
  const yk = (my + mh * 0.35 - hy0) / Math.cos(lean), dTop = Math.min(12, d * 0.06), dMid = Math.min(24, d * 0.12), dBot = Math.min(16, d * 0.08);   // 側翼的深度：最上面、床墊的高度（最寬）、最下面
  const depthAt = y => { const e = v => v * v * (3 - 2 * v); return y < yk ? dBot + (dMid - dBot) * e(y / yk) : dMid + (dTop - dMid) * e((y - yk) / (Hh - yk)); };
  const hb = new THREE.Group(); hb.position.set(0, hy0, hz0); hb.rotation.x = -lean; g.add(hb);
  add(hb, wingShellGeo(w, Hh, tw, rc, depthAt), F, 0, 0, 0);
  // 靠墊：嵌在外殼裡，比外殼矮一點；中間一道車線、上緣一圈滾邊
  const pw = w - 2 * tw - 1.2, py0 = (my - hy0) / Math.cos(lean) - 1, ph = Hh - 3.5 - py0, pz = tw - 0.6 + padT / 2;
  RB(hb, pw, ph, padT, 3.2, 0, py0 + ph / 2, pz, F2);
  B(hb, 0.35, ph - 6.5, 0.5, 0, py0 + ph / 2, pz + padT / 2 - 0.15, seam);
  { const c = C(hb, 0.3, 0.3, pw - 7, 0, py0 + ph - 3.1, pz + padT / 2 - 1.3, seam, 6); c.rotation.z = Math.PI / 2; }
  // 床框：四面圍板＋裡面的床板（比圍板低 inset）；後面那片藏在靠墊底下
  const bw = w - 2 * tw - 0.8, bz0 = zb + Hh * Math.sin(lean) + tw * 0.5, bl = zf - bz0, bzc = (bz0 + zf) / 2;
  for (const sd of [-1, 1]) RB(g, rim, fh, bl, 1.8, sd * (bw / 2 - rim / 2), legH + fh / 2, bzc, F);
  RB(g, bw, fh, rim, 1.8, 0, legH + fh / 2, zf - rim / 2, F); RB(g, bw, fh, rim, 1.8, 0, legH + fh / 2, bz0 + rim / 2, F);
  B(g, bw - rim, fh - inset - 1, bl - rim, 0, legH + 1 + (fh - inset - 1) / 2, bzc, F);
  B(g, bw - 10, 1.2, bl - 10, 0, legH + 0.4, bzc, Dk);
  // 金屬刀片腳：斜斜往外踩的腳掌
  const lg = new THREE.Shape(); lg.moveTo(-1.3, legH); lg.lineTo(1.3, legH); lg.lineTo(1.0, 4.2); lg.bezierCurveTo(1.0, 2.2, 2.6, 1.0, 9.5, 0.75); lg.lineTo(9.5, 0); lg.lineTo(-0.6, 0); lg.bezierCurveTo(-1.0, 1.5, -1.0, 4, -1.3, legH);
  const lgeo = new THREE.ExtrudeGeometry(lg, { depth: 2.2, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 2, curveSegments: 10 }); lgeo.translate(0, 0, -1.1);
  for (const sx of [-1, 1]) for (const [z, sz] of [[zf - 9, 1], [bz0 + 12, -1]]) add(g, lgeo, M, sx * (bw / 2 - 7), 0, z).rotation.y = Math.atan2(-sz, sx);
  // 床墊：深色側邊＋白色表布，沉進床框 inset；床頭那端貼著靠墊
  if (it.matt !== 'off') {
    const mzb = hz0 - (my - hy0 + 3) * Math.tan(lean) + (tw + padT) / Math.cos(lean) + 0.3, mw = bw - 2 * rim - 0.6, ml = zf - rim - 0.3 - mzb, mz = mzb + ml / 2;
    const Sd = surfMat('fabric', '#2e2f33'), Tp = surfMat('fabric', '#f4f3ef');
    RB(g, mw, mh - 5, ml, 3, 0, my + (mh - 5) / 2, mz, Sd);
    RB(g, mw, 7.5, ml, 3.4, 0, my + mh - 3.75, mz, Tp);
    RB(g, mw + 0.5, 0.7, ml + 0.5, 0.3, 0, my + mh - 7.3, mz, Dk);
  }
  return g;
}
function buildMilaBed(it) { // 米拉床台：深色皮革床框（總高 30、腳高 15）＋黑色床板，四支不鏽鋼扁腳；床頭往後仰、上寬下窄，側面看是下厚上薄的楔形，深色外殼包著淺色的正面軟包（八道直條車線，越往兩側越往外斜成扇形），淺色皮面翻過上緣
  const g = new THREE.Group(), { w, d, h } = it;
  const F1 = fabMat(it), F2 = fabMat(it, 'color2'), M = mat(it.color3 || '#b9b6b0', 0.12, 1), Dk = mat('#121212', 0.95), Gl = mat('#1a1a1a', 0.6);
  const zb = -d / 2, zf = d / 2, legH = Math.min(15, h * 0.14), top = Math.min(30, h * 0.28), fh = top - legH;
  // 床頭：y0～h，背面垂直；正面在底部離背面 Db、頂端 Dt（往後仰）；底部寬 Wb、頂端寬 Wt
  const y0 = Math.max(3, legH - 2), H = h - y0, Db = Math.min(22, d * 0.105), Dt = Math.min(6, d * 0.03), Wt = w, Wb = w - Math.min(8, w * 0.05), ct = 3.2, N = 8;
  const morph = (nx, ny, fn) => { const geo = new THREE.BoxGeometry(1, 1, 1, nx, ny, 1), P = geo.attributes.position, U = geo.attributes.uv;
    for (let i = 0; i < P.count; i++) { const u = P.getX(i), v = P.getY(i) + 0.5, q = fn(u, v, P.getZ(i) > 0); P.setXYZ(i, q[0], q[1], q[2]); U.setXY(i, q[0] / 60, q[1] / 60 + (P.getZ(i) > 0 ? 0 : 3)); }
    geo.computeVertexNormals(); return geo; };
  const Wv = v => Wb + (Wt - Wb) * v, Dv = v => Db + (Dt - Db) * v;
  add(g, morph(2, 6, (u, v, fr) => [u * Wv(v), y0 + v * H, zb + (fr ? Dv(v) - 0.2 : 0)]), F2, 0, 0, 0);            // 深色外殼（側面、背面）
  const chan = (x, v) => { const Wp = Wv(v) * (0.74 + 0.26 * v) - 3, t = (x / Wp + 0.5) * N, dc = Math.abs(t - Math.round(t)) * Wp / N; return (t < -0.5 || t > N + 0.5 ? 1.5 : 1.7 - 1.5 * Math.exp(-((dc / 0.9) ** 2)) + 0.5 * Math.cos(Math.PI * Math.min(1, dc / (Wp / N / 2))) * 0 + 0.45 * (1 - Math.min(1, dc / (Wp / N / 2)) ** 2)); };   // 一片片微鼓的皮面，片和片之間一道細細的凹線
  add(g, morph(240, 20, (u, v, fr) => { const W = Wv(v) - 1.2, x = u * W, e = Math.min(1, (0.5 - Math.abs(u)) * W / 1.6), rt = Math.min(1, Math.sqrt(Math.max(0, (1 - v) * (H - 1.4) / 1.8)) * 0.7 + 0.3);   // 兩側、上緣收圓
    return [x, y0 + 1 + v * (H - 1.4), zb + Dv(v) + (fr ? (ct - 2.6 + chan(x, v)) * Math.sqrt(Math.max(0, e)) * rt : -0.6)]; }), F1, 0, 0, 0);    // 淺色正面軟包
  RB(g, Wt - 0.4, 1.5, Dt + 1.6, 0.7, 0, h - 0.75, zb + (Dt + 1.6) / 2 + 0.3, F1);   // 淺色皮面翻過上緣（平的，只有邊緣倒圓）
  for (const sd of [-1, 1]) { const o = add(g, new THREE.CylinderGeometry(0.28, 0.28, Math.hypot(H - 6, Db - Dt), 6), F1, sd * (Wb + Wt) / 4, y0 + H / 2, zb + (Db + Dt) / 2 + 0.2); o.rotation.x = -Math.atan2(Db - Dt, H - 6); o.rotation.z = -sd * Math.atan2((Wt - Wb) / 2, H); }   // 側面前緣的淺色滾邊
  // 床框：四面圓角圍板＋黑色床板（比圍板低一點）；後面那片藏在床頭底下
  const bw = Wb - 2.4, rim = 4.5, bz0 = zb + Db * 0.45, bl = zf - bz0, bzc = (bz0 + zf) / 2;
  for (const sd of [-1, 1]) RB(g, rim, fh, bl, 2, sd * (bw / 2 - rim / 2), legH + fh / 2, bzc, F2);
  RB(g, bw, fh, rim, 2, 0, legH + fh / 2, zf - rim / 2, F2); RB(g, bw, fh, rim, 2, 0, legH + fh / 2, bz0 + rim / 2, F2);
  B(g, bw - rim, fh - 1.8, bl - rim, 0, legH + (fh - 1.8) / 2, bzc, Dk);
  B(g, 0.25, 0.12, bl - 2 * rim, 0, top - 1.75, bzc, mat('#060606', 1));                                              // 床板中間的接縫
  // 不鏽鋼扁腳：上寬下窄，斜 45° 站在四個角落，底下一顆黑色腳墊
  const lgeo = new THREE.CylinderGeometry(2.9, 1.9, legH - 0.5, 4, 1).toNonIndexed(); lgeo.rotateY(Math.PI / 4); lgeo.scale(1, 1, 0.32); lgeo.computeVertexNormals();
  for (const sx of [-1, 1]) for (const [z, sz] of [[zf - 6, 1], [bz0 + 14, -1]]) { add(g, lgeo, M, sx * (bw / 2 - 6.5), 0.5 + (legH - 0.5) / 2, z).rotation.y = sx * sz * Math.PI / 4; C(g, 0.7, 0.7, 0.5, sx * (bw / 2 - 6.5), 0.25, z, Gl, 10); }
  // 床墊：放在床框上
  if (it.matt !== 'off') {
    const mzb = zb + Dv((top - y0 + 12) / H) + ct + 0.6, mw = bw - 1, ml = zf - 0.5 - mzb, mz = mzb + ml / 2, mh = Math.min(25, h * 0.23);
    RB(g, mw, mh, ml, 4, 0, top - 1.8 + mh / 2, mz, surfMat('fabric', '#f4f3ef'));
    RB(g, mw + 0.4, 0.6, ml + 0.4, 0.3, 0, top - 1.8 + mh * 0.3, mz, surfMat('fabric', '#d9d6cf'));
  }
  return g;
}
function buildEmmaBed(it) { // Emma 床台：布面床框（寬邊的圍板、圓角，裡面黑色床板）架在四支往外斜、往下收細的深色木腳上；床頭是一片往後仰的布面厚板，立在床框後緣上面，四邊一圈車線
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), Wd = surfMat('wood', it.color2), Dk = mat('#121212', 0.95);
  const seam = surfMat(it.fabric || 'fabric', '#' + new THREE.Color(it.color).multiplyScalar(0.82).getHexString());
  const zb = -d / 2, zf = d / 2, top = Math.min(30, h * 0.3), legH = Math.min(15, top * 0.5), fh = top - legH, rim = Math.min(9, w * 0.06);
  // 床頭：往後仰的厚板，底下坐在床框上
  const ht = Math.min(11, d * 0.055), lean = Math.min(0.1, 9 / h), hw = w - 4, Hh = (h - top + 1.5 - ht * Math.sin(lean)) / Math.cos(lean), hz = zb + Hh * Math.sin(lean) + 0.2;
  const hb = new THREE.Group(); hb.position.set(0, top - 1.5, hz); hb.rotation.x = -lean; g.add(hb);
  RB(hb, hw, Hh, ht, 2.2, 0, Hh / 2, ht / 2, F);
  for (const sd of [-1, 1]) B(hb, 0.22, Hh - 5, 0.22, sd * (hw / 2 - 2.3), Hh / 2, ht + 0.02, seam);                    // 正面邊緣的車線
  B(hb, hw - 4.6, 0.22, 0.22, 0, Hh - 2.4, ht + 0.02, seam);
  // 床框：四面寬圍板＋黑色床板；床框後緣在床頭底下
  const bz0 = hz - 0.5, bl = zf - bz0, bzc = (bz0 + zf) / 2;
  for (const sd of [-1, 1]) RB(g, rim, fh, bl, 2.4, sd * (w / 2 - rim / 2), legH + fh / 2, bzc, F);
  RB(g, w, fh, rim, 2.4, 0, legH + fh / 2, zf - rim / 2, F); RB(g, w, fh, rim, 2.4, 0, legH + fh / 2, bz0 + rim / 2, F);
  B(g, w - rim, fh - 1.2, bl - rim, 0, legH + (fh - 1.2) / 2, bzc, Dk);
  B(g, 0.25, 0.12, bl - 2 * rim, 0, top - 1.15, bzc, mat('#050505', 1));
  // 木腳：方錐形，上粗下細，往外斜
  const lgeo = new THREE.CylinderGeometry(3.6, 2.2, legH, 4, 1).toNonIndexed(); lgeo.rotateY(Math.PI / 4);
  { const P = lgeo.attributes.position; for (let i = 0; i < P.count; i++) { const k = (legH / 2 - P.getY(i)) / legH * 2.6; P.setX(i, P.getX(i) + k); P.setZ(i, P.getZ(i) + k * 0.5); } lgeo.computeVertexNormals(); }
  for (const sx of [-1, 1]) for (const [z, sz] of [[zf - 9, 1], [bz0 + 9, -1]]) add(g, lgeo, Wd, sx * (w / 2 - 9), legH / 2, z).scale.set(sx, 1, sz);
  // 床墊
  if (it.matt !== 'off') {
    const mzb = hz + ht + 0.6 + 8 * Math.tan(lean), mw = w - 2, ml = zf - 1 - mzb, mh = Math.min(25, h * 0.23);
    RB(g, mw, mh, ml, 4, 0, top - 1.2 + mh / 2, mzb + ml / 2, surfMat('fabric', '#f4f3ef'));
    RB(g, mw + 0.4, 0.6, ml + 0.4, 0.3, 0, top - 1.2 + mh * 0.3, mzb + ml / 2, surfMat('fabric', '#d9d6cf'));
  }
  return g;
}
function seamBoxGeo(bw, bh, bd, R, seams, o = {}) {
  const dep = o.dep || 0.42, sg = o.sg || 0.75, dims = { x: bw, y: bh, z: bd };
  R = Math.max(0.3, Math.min(R, bw / 2 - 0.1, bh / 2 - 0.1, bd / 2 - 0.1));
  const cuts = a => {
    const L = dims[a], v = [-L / 2, L / 2], push = q => { if (q > -L / 2 + 0.05 && q < L / 2 - 0.05) v.push(q); };
    for (const k of [0.15, 0.4, 0.7, 1]) { push(-L / 2 + R * k); push(L / 2 - R * k); }
    for (const q of seams) if (q.a === a) for (const k of [-3.2, -2.2, -1.5, -1, -0.6, -0.3, 0, 0.3, 0.6, 1, 1.5, 2.2, 3.2]) push(q.at + k * sg);
    if (a === 'y' && o.taper) push(o.taper.y);
    v.sort((p, q) => p - q);
    const u = [v[0]]; for (const q of v) if (q - u[u.length - 1] > 0.08) u.push(q);
    const out = [u[0]]; for (let i = 1; i < u.length; i++) { const gap = u[i] - u[i - 1], n = Math.ceil(gap / 14); for (let j = 1; j <= n; j++) out.push(u[i - 1] + gap * j / n); }
    return out;
  };
  const X = cuts('x'), Y = cuts('y'), Z = cuts('z'), nx_ = X.length - 1, ny_ = Y.length - 1, nz_ = Z.length - 1;
  const geo = new THREE.BoxGeometry(1, 1, 1, nx_, ny_, nz_), P = geo.attributes.position, N = geo.attributes.normal;
  const A = bw / 2, Bh = bh / 2, Cc = bd / 2, cl = (v, m) => Math.max(-m, Math.min(m, v));
  for (let i = 0; i < P.count; i++) {
    let px = X[Math.round((P.getX(i) + 0.5) * nx_)], py = Y[Math.round((P.getY(i) + 0.5) * ny_)], pz = Z[Math.round((P.getZ(i) + 0.5) * nz_)];
    const cx = cl(px, A - R), cy = cl(py, Bh - R), cz = cl(pz, Cc - R);
    let nx = px - cx, ny = py - cy, nz = pz - cz; const ln = Math.hypot(nx, ny, nz) || 1; nx /= ln; ny /= ln; nz /= ln;
    px = cx + nx * R; py = cy + ny * R; pz = cz + nz * R;
    let D = 0, gx = 0, gy = 0, gz = 0;
    for (const q of seams) {
      const nn = q.a === 'x' ? nx : q.a === 'y' ? ny : nz; let wt = 1 - nn * nn; if (q.f) wt *= q.f(nx, ny, nz);
      if (wt <= 0.001) continue;
      const t = ((q.a === 'x' ? px : q.a === 'y' ? py : pz) - q.at) / sg, e = Math.exp(-t * t) * wt * dep, ge = -2 * t / sg * e;
      D += e; if (q.a === 'x') gx += ge; else if (q.a === 'y') gy += ge; else gz += ge;
    }
    px -= nx * D; py -= ny * D; pz -= nz * D;
    let mx = nx + gx, my = ny + gy, mz = nz + gz;
    if (o.taper && py < o.taper.y) {
      const span = o.taper.y + Bh, t = (o.taper.y - py) / span, k = o.taper.amt * t * t;
      px *= 1 - k / A; pz *= 1 - k / Cc; my -= 2 * o.taper.amt * t / span * Math.hypot(nx, nz);
    }
    P.setXYZ(i, px, py, pz);
    const ml = Math.hypot(mx, my, mz) || 1; N.setXYZ(i, mx / ml, my / ml, mz / ml);
  }
  P.needsUpdate = true; N.needsUpdate = true; geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
}
function build171Sofa(it) { // 171 型：牛皮 L 型——懸浮的厚座體（整片坐面、車線分格）、矮胖扶手、可往後靠的三塊背墊、布面長腰枕、黑鐵翼型腳；預設貴妃在右，選左時鏡射
  const g = new THREE.Group(), { w, d, h } = it;
  const F = surfMat(it.fabric || 'leather', it.color), Pl = surfMat('fabric', it.color2), M = mat(it.color3 || '#232325', 0.5, 0.55);
  const legH = Math.min(13, h * 0.145), seatTop = Math.min(44, h * 0.49), armTop = Math.min(55, h * 0.61), bodyH = seatTop - legH;
  const awL = Math.min(20, w * 0.07), awR = awL, cwid = Math.min(101.67, w * 0.35673), sd = Math.min(102, d);
  const zb = -d / 2, xL = -w / 2, xR = w / 2, wingL = xR - cwid, seatL = xL + awL, n = seatsOf(it), inner = wingL - seatL, cw = inner / n;
  const ext = d - sd, ySeam = -bodyH / 2 + bodyH * 0.44, side = (nx, ny) => 1 - Math.max(0, ny);
  // 背墊：厚厚一塊往後靠，正面一條直線、一條橫線，交會處凹下去
  const lean = 0.3, bT = 15, by0 = seatTop + 2, bHs = (h - by0 - bT * Math.sin(lean)) / Math.cos(lean) + 1.35, bz = zb + bHs * Math.sin(lean) + 0.5;
  const zFace = bz + bT * Math.cos(lean);                                  // 背墊正面底部的位置
  const backCush = (bw, x) => { const o = new THREE.Group(); o.position.set(x, by0, bz); o.rotation.x = -lean; g.add(o);
    add(o, seamBoxGeo(bw, bHs, bT, 5, [{ a: 'x', at: 0 }, { a: 'y', at: -bHs / 2 + bHs * 0.47 }], { dep: 0.55, sg: 0.9 }), F, 0, bHs / 2, bT / 2); };
  // 腰枕：布面長方形，立在坐面上靠著背墊
  const lumbar = (pw, x) => { const ph = 22, o = new THREE.Group(); o.position.set(x, seatTop - 0.6, zFace + 2.5); g.add(o);
    const q = add(o, softPillowGeo(pw, ph, 12), Pl, 0, ph / 2, 0); q.rotation.x = -0.26; q.position.z = Math.sin(0.26) * ph / 2 + 3; };
  for (let i = 0; i < n; i++) { const x = seatL + cw * (i + .5); backCush(cw - 0.8, x); lumbar(cw * 0.93, x); }
  const cbw = cwid - awR; backCush(cbw - 0.8, wingL + cbw / 2); lumbar(cbw * 0.93, wingL + cbw / 2);
  // 背墊後面固定的矮背
  RB(g, xR - awR - seatL, armTop - 3 - legH, 7, 2.5, (seatL + xR - awR) / 2, legH + (armTop - 3 - legH) / 2, zb + 3.6, F);
  // 主座：一整片坐面，直的車線在每個座位中間，橫的一條；線順著前緣往下，正面下方再一條橫線，底部往內收
  const mz0 = zb + 5, mz1 = zb + sd - 2, mD = mz1 - mz0, mW = inner - 0.3, zs = (zFace + 12 + mz1) / 2;
  const ms = [{ a: 'z', at: zs - (mz0 + mz1) / 2 }, { a: 'y', at: ySeam, f: side }];
  for (let i = 0; i < n; i++) ms.push({ a: 'x', at: -inner / 2 + cw * (i + .5) });
  add(g, seamBoxGeo(mW, bodyH, mD, 6.5, ms, { taper: { y: ySeam, amt: 2.6 } }), F, seatL + mW / 2, legH + bodyH / 2, (mz0 + mz1) / 2);
  // 貴妃：比主座長，中間一條直線，橫線和主座對齊，前段再一條
  const cD = d - 5, cz = zb + 5 + cD / 2, cs = [{ a: 'x', at: -awR * 0.3 }, { a: 'z', at: zs - cz }, { a: 'y', at: ySeam, f: side }];
  if (ext > 50) cs.push({ a: 'z', at: zb + sd + ext * 0.3 - cz });
  add(g, seamBoxGeo(cwid - 0.9, bodyH, cD, 6.5, cs, { taper: { y: ySeam, amt: 2.6 } }), F, wingL + 0.3 + (cwid - 0.9) / 2, legH + bodyH / 2, cz);
  // 扶手：左右兩邊一樣——整塊落到底（和座體一樣懸空），外側一條橫線、一條直線，正面一條直線；右邊那支包在貴妃的後段外側
  const aH = armTop - legH;
  for (const sx of [-1, 1]) add(g, seamBoxGeo(awL, aH, sd, 5.5, [{ a: 'y', at: -aH / 2 + aH * 0.54, f: nx => nx * sx > -0.5 ? 1 : 0 }, { a: 'z', at: -sd * 0.03, f: nx => nx * sx > -0.5 ? 1 : 0 }, { a: 'x', at: sx * awL * 0.08, f: (nx, ny, nz) => Math.max(0, nz) }], { taper: { y: -aH / 2 + aH * 0.3, amt: 1.6 } }), F, sx * (w / 2 - awL / 2), legH + aH / 2, zb + sd / 2);
  // 黑鐵翼型腳：貼地的長桿（中間厚、兩端薄，兩端有腳墊）＋中間兩支扁立柱撐住座體
  const sled = (x, z, L, alongZ) => {
    const o = new THREE.Group(); o.position.set(x, 0, z); if (alongZ) o.rotation.y = Math.PI / 2; g.add(o);
    const px = L * 0.2, sh = new THREE.Shape();
    sh.moveTo(-L / 2, 0.6); sh.lineTo(L / 2, 0.6); sh.lineTo(L / 2, 2.4); sh.lineTo(px + 4, 4.3); sh.lineTo(-px - 4, 4.3); sh.lineTo(-L / 2, 2.4); sh.lineTo(-L / 2, 0.6);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 1 }); geo.translate(0, 0, -1.2);
    add(o, geo, M, 0, 0, 0);
    for (const sx of [-1, 1]) { B(o, 5, legH - 3.8, 1.2, sx * px, 4 + (legH - 3.8) / 2, 0, M); C(o, 0.8, 0.8, 0.6, sx * (L / 2 - 4), 0.3, 0, M, 12); }
    B(o, px * 2 + 5, 1.2, 2.4, 0, legH - 1.6, 0, M);
  };
  const lz = zb + sd / 2 + 1, lL = sd * 0.63;
  sled(seatL + 8, lz, lL, true); sled(wingL - 8, lz, lL, true);
  if (inner > 230) sled((seatL + wingL) / 2, lz, lL, true);
  if (ext > 40) sled(xR - cwid / 2, d / 2 - Math.min(24, ext * 0.4), cwid * 0.66, false); else sled(xR - 12, lz, lL, true);
  return mirrorIfLeft(it, g);
}
function shell120(g, w, d, legH, armTop, M, St, arms) {
  const t = 4.5, R = 11, a = 0.17, yc = legH + t / 2, yT = armTop - t / 2, L = (yT - (yc + R - R * Math.sin(a))) / Math.cos(a);
  const xc = w / 2 - t / 2 - R * Math.cos(a) - L * Math.sin(a), right = [], P = [];
  right.push([xc, yc]);
  for (let i = 1; i <= 10; i++) { const th = -Math.PI / 2 + (Math.PI / 2 - a) * i / 10; right.push([xc + R * Math.cos(th), yc + R + R * Math.sin(th)]); }
  for (let i = 1; i <= 12; i++) { const e = right[10]; right.push([e[0] + Math.sin(a) * L * i / 12, e[1] + Math.cos(a) * L * i / 12]); }
  if (arms === 'both') for (let i = right.length - 1; i >= 0; i--) P.push([-right[i][0], right[i][1]]); else P.push([-w / 2 + t / 2, yc]);
  P.push([0, yc], ...right);
  const n = P.length - 1, zb = -d / 2 + 0.5, zf = d / 2, rz = Math.min(13, armTop - legH - t), zF = y => { const q = Math.min(1, Math.max(0, (y - (armTop - rz)) / rz)); return zf - rz * (1 - Math.sqrt(1 - q * q)); };
  const ring = k => {                                                       // 一圈斷面：外側走一趟、扶手頂繞半圈、內側走回來、另一端再繞半圈
    const out = [], inn = [], hh = t / 2 * k, N = [];
    for (let i = 0; i <= n; i++) { const A = P[Math.max(0, i - 1)], B_ = P[Math.min(n, i + 1)], tx = B_[0] - A[0], ty = B_[1] - A[1], l = Math.hypot(tx, ty); N.push([ty / l, -tx / l, tx / l, ty / l]); }
    for (let i = 0; i <= n; i++) { out.push([P[i][0] + N[i][0] * hh, P[i][1] + N[i][1] * hh]); inn.push([P[i][0] - N[i][0] * hh, P[i][1] - N[i][1] * hh]); }
    const cap = (i, sgn) => [1, 2, 3].map(q => { const th = q * Math.PI / 4, c = Math.cos(th) * sgn, s_ = Math.sin(th) * sgn; return [P[i][0] + (N[i][0] * c + N[i][2] * s_) * hh, P[i][1] + (N[i][1] * c + N[i][3] * s_) * hh]; });
    return [...out, ...cap(n, 1), ...inn.reverse(), ...cap(0, -1)];
  };
  const rings = [[0, 1], [0.5, 1], [1, 1], [2, 0.86], [3, 0.5]], pos = [], idx = [];
  let K = 0;
  rings.forEach(([u, k]) => { const r = ring(k); K = r.length; r.forEach(([x, y]) => { const f = zF(y); pos.push(x, y, u <= 1 ? zb + (f - 1.6 - zb) * u : u === 2 ? f - 0.6 : f); }); });
  for (let j = 0; j < rings.length - 1; j++) for (let k = 0; k < K; k++) { const a0 = j * K + k, b0 = j * K + (k + 1) % K, c0 = (j + 1) * K + (k + 1) % K, d0 = (j + 1) * K + k; idx.push(a0, b0, c0, a0, c0, d0); }
  const capFace = (o, front) => { const tri = (x, y, z) => front ? idx.push(o + x, o + y, o + z) : idx.push(o + x, o + z, o + y), inI = i => (n + 1) + 3 + (n - i);
    for (let i = 0; i < n; i++) { tri(i, i + 1, inI(i + 1)); tri(i, inI(i + 1), inI(i)); }
    tri(n, n + 1, n + 2); tri(n, n + 2, n + 3); tri(n, n + 3, inI(n));
    const e = inI(0); tri(e, e + 1, e + 2); tri(e, e + 2, e + 3); tri(e, e + 3, 0); };
  capFace(0, false); capFace((rings.length - 1) * K, true);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  add(g, geo, M, 0, 0, 0);
  // 外殼邊緣的鋸齒車線：一條直線上面疊一條鋸齒，沿著正面的邊走一圈，再順著扶手頂往後走
  const zig = (at, len) => { const A = [], Bz = [], m = Math.max(2, Math.round(len / 0.85)); for (let i = 0; i <= m; i++) { const [q, nrm] = at(i / m); A.push(q); Bz.push(q.clone().addScaledVector(nrm, i % 2 ? 0.5 : -0.5)); }
    for (const [pp, r] of [[A, 0.09], [Bz, 0.11]]) add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp, false, 'catmullrom', 0.05), pp.length * 2, r, 4, false), St, 0, 0, 0).castShadow = false; };
  const seg = [0]; for (let i = 1; i <= n; i++) seg.push(seg[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  zig(u => { const sAt = u * seg[n]; let i = 1; while (i < n && seg[i] < sAt) i++; const f = (sAt - seg[i - 1]) / (seg[i] - seg[i - 1] || 1), x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, y = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f, tx = P[i][0] - P[i - 1][0], ty = P[i][1] - P[i - 1][1], l = Math.hypot(tx, ty) || 1;
    return [new V3(x, y, zF(y) + 0.06), new V3(ty / l, -tx / l, 0)]; }, seg[n]);
  for (const i of arms === 'both' ? [0, n] : [n]) { const z1 = zF(armTop) - 1.5; zig(u => [new V3(P[i][0], armTop + 0.04, z1 + (zb + 2 - z1) * u), new V3(1, 0, 0)], z1 - zb - 2); }
  return { xc, t, edge: xc + 9, top: legH + t };
}
function legs120(g, pts, legH, M) {                                         // 亮面鑄造金屬腳：外側是直的斜邊，往下收細；頂端往沙發內側彎出一片托座接底框
  const pad = mat('#1c1c1c', 0.8), sh = new THREE.Shape(), H = legH - 0.4;
  sh.moveTo(-0.75, 0.5); sh.lineTo(-1.9, H); sh.lineTo(7.2, H); sh.lineTo(7.2, H - 0.7); sh.bezierCurveTo(3.4, H - 0.9, 1.9, H - 2.6, 1.5, H - 6.5); sh.lineTo(0.75, 0.5); sh.lineTo(-0.75, 0.5);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.3, bevelEnabled: true, bevelThickness: 0.55, bevelSize: 0.5, bevelSegments: 3, curveSegments: 12 }); geo.translate(0, 0, -0.65);
  for (const [x, z, sx] of pts) { add(g, geo, M, x, 0, z).scale.x = -sx; C(g, 0.55, 0.55, 0.5, x + sx * 0.0, 0.25, z, pad, 10); }
}
function cushion120(g, cw, ct, cd, x, y, z, F) { return add(g, seamBoxGeo(cw, ct, cd, 6.5, [{ a: 'y', at: ct / 2 - 3.6, f: (nx, ny) => 1 - Math.abs(ny) }], { dep: 0.3, sg: 0.5, taper: { y: -ct / 2 + ct * 0.55, amt: 3.2 } }), F, x, y + ct / 2, z); }
function build120Sofa(it) { // 120 型：合成皮 U 形外殼（底框＋薄扶手）托著布面厚坐墊，高背墊各一顆釦子，細金屬腳；兩顆合成皮小腰枕
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), Lt = surfMat('leather', it.color2), M = mat(it.color3 || '#55524f', 0.16, 0.95);
  const St = mat('#' + new THREE.Color(it.color2).lerp(new THREE.Color('#d8c8ad'), 0.55).getHexString(), 0.8);
  const legH = Math.min(15, h * 0.15), seatTop = Math.min(45, h * 0.44), armTop = Math.min(58, h * 0.57);
  const sh = shell120(g, w, d, legH, armTop, Lt, St, 'both'), n = seatsOf(it), inner = 2 * sh.edge, cw = inner / n, zb = -d / 2;
  // 合成皮矮背板（背墊靠著它）
  RB(g, inner + 6, armTop - legH - 2, 5, 2.2, 0, legH + (armTop - legH - 2) / 2 + 1, zb + 3, Lt);
  // 坐墊：前上緣一圈車線，下半段往內收、窩在外殼裡
  const ct = seatTop - sh.top + 1.5, cd = d - 9;
  for (let i = 0; i < n; i++) cushion120(g, cw - 0.5, ct, cd, -inner / 2 + cw * (i + .5), sh.top - 1.5, d / 2 - cd / 2 - 0.6, F);
  // 高背墊：往後靠，上緣圓圓的，中間一顆包釦
  const lean = 0.2, bT = 16, by0 = seatTop - 3, bH = (h - by0 - bT * Math.sin(lean)) / Math.cos(lean) + 1.6, bz = zb + 0.6 + bH * Math.sin(lean);
  for (let i = 0; i < n; i++) { const o = new THREE.Group(); o.position.set(-inner / 2 + cw * (i + .5), by0, bz); o.rotation.x = -lean; g.add(o);
    // 背墊：上窄下寬、上薄下厚，上面兩個角是大圓角；釦子的位置微微凹下去
    const bg = seamBoxGeo(cw - 1, bH, bT, 7.6, [], {}), BP = bg.attributes.position, A = (cw - 1) / 2, Rc = Math.min(13, A * 0.4);
    for (let q = 0; q < BP.count; q++) { let px = BP.getX(q), py = BP.getY(q), pz = BP.getZ(q); const t = py / bH + 0.5;
      const dx = Math.abs(px) - (A - Rc), dy = py - (bH / 2 - Rc); if (dx > 0 && dy > 0) { const r = Math.hypot(dx, dy); if (r > Rc) { px = Math.sign(px) * (A - Rc + dx / r * Rc); py = bH / 2 - Rc + dy / r * Rc; } }
      px *= 1 - 0.07 * t; pz = -bT / 2 + (pz + bT / 2) * (1 - 0.28 * t * t);
      if (pz > 0) { const rr = Math.hypot(px, py) / 9; pz -= 1.1 * Math.exp(-rr * rr); }
      BP.setXYZ(q, px, py, pz); }
    BP.needsUpdate = true; bg.computeBoundingBox(); bg.computeBoundingSphere();
    add(o, bg, F, 0, bH / 2, bT / 2);
    add(o, new THREE.SphereGeometry(1.5, 16, 10), F, 0, bH * 0.5, bT * 0.93 - 0.75).scale.z = 0.45; }
  // 模組接縫（最右邊一個座位是獨立一座）
  const zFace = bz + bT * Math.cos(lean), jx = n > 1 ? inner / 2 - cw : null;
  if (jx !== null) B(g, 0.5, 4.7, d - 2, jx, legH + 2.3, 0.4, mat('#2a2a2c', 0.8));
  // 合成皮小腰枕：放在座位交界的地方
  const px = n === 1 ? [] : n === 2 ? [0] : [-inner / 2 + cw, inner / 2 - cw];
  for (const x of px) { const o = new THREE.Group(); o.position.set(x, seatTop - 0.8, zFace + 3); g.add(o);
    const q = add(o, softPillowGeo(44, 27, 11), Lt, 0, 13.5, 0); q.rotation.x = -0.3; q.position.z = Math.sin(0.3) * 13.5 + 2;
    const q2 = add(o, softPillowGeo(43.6, 26.6, 10.6), F, 0, 13.5, 0); q2.rotation.x = -0.3; q2.position.z = q.position.z - 0.5; }
  // 金屬腳：每座模組的四個角
  const lz = d / 2 - 10, xe = sh.xc - 2, pts = [];
  for (const sz of [-1, 1]) { pts.push([-xe, sz * lz, -1, sz], [xe, sz * lz, 1, sz]); if (jx !== null) pts.push([jx - 5, sz * lz, 1, sz], [jx + 5, sz * lz, -1, sz]); }
  legs120(g, pts, legH, M);
  return g;
}
function build120Ottoman(it) { // 120 型腳椅：同一款外殼，只有一側有扶手（預設在右，選左時鏡射）
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), Lt = surfMat('leather', it.color2), M = mat(it.color3 || '#55524f', 0.16, 0.95);
  const St = mat('#' + new THREE.Color(it.color2).lerp(new THREE.Color('#d8c8ad'), 0.55).getHexString(), 0.8);
  const legH = Math.min(15, h * 0.26), seatTop = Math.min(45, h * 0.78), sh = shell120(g, w, d, legH, h, Lt, St, 'right');
  const x0 = -w / 2 + 0.6, x1 = sh.edge, ct = seatTop - sh.top + 1.5;
  cushion120(g, x1 - x0, ct, d - 1.5, (x0 + x1) / 2, sh.top - 1.5, 0, F);
  const lz = d / 2 - 10, pts = [];
  for (const sz of [-1, 1]) pts.push([-w / 2 + 8, sz * lz, -1, sz], [sh.xc - 2, sz * lz, 1, sz]);
  legs120(g, pts, legH, M);
  return mirrorIfLeft(it, g);
}
function buildAthenaSofa(it) { // 雅典娜：全牛皮 L 型——厚厚一整片的座台（直條車線、後段一排拉點），座台比坐深還深，背後留一段平台；矮背靠塊＋斜靠的大背墊；
  // 轉角那一座的後外角是圓弧；單側矮扶手包著一條實木；亮面金屬刀腳。預設轉角＋貴妃在右，選左時鏡射
  const g = new THREE.Group(), { w, d, h } = it;
  const F = surfMat(it.fabric || 'leather', it.color), Wd = surfMat('wood', it.color2 || '#7a4a2b'), M = mat(it.color3 || '#4d4a48', 0.16, 0.95);
  const legH = Math.min(15, h * 0.17), seatTop = Math.min(40, h * 0.46), pH = seatTop - legH;
  const D = Math.min(110, d), Ww = Math.min(110, w * 0.28), aw = Math.min(8.5, w * 0.022), xL = -w / 2, xR = w / 2, zb = -d / 2, wingL = xR - Ww;
  const xs = xL + aw + 0.4, n = seatsOf(it), inner = wingL - xs, cw = inner / n, top = (nx, ny) => Math.max(0, ny), zT = zb + 64;   // xs：座台從扶手和實木條的內側開始
  const body = (x0, x1, z0, z1, seams, rc) => { const bw = x1 - x0 - 0.5, bd = z1 - z0 - 0.5, geo = seamBoxGeo(bw, pH, bd, 6.5, seams, { dep: 0.4, sg: 0.7, taper: { y: -pH / 2 + pH * 0.35, amt: 2 } });
    if (rc) { const P = geo.attributes.position, A = bw / 2, C = bd / 2; for (let i = 0; i < P.count; i++) { const dx = P.getX(i) - (A - rc), dz = (-C + rc) - P.getZ(i); if (dx > 0 && dz > 0) { const r = Math.hypot(dx, dz); if (r > rc) { P.setX(i, A - rc + dx / r * rc); P.setZ(i, -C + rc - dz / r * rc); } } } P.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere(); }
    add(g, geo, F, (x0 + x1) / 2, legH + pH / 2, (z0 + z1) / 2); };
  // 背靠塊（固定、矮矮一塊）和斜靠在上面的大背墊（邊緣一圈車線）
  const bz0 = zb + 16, bz1 = zb + 34, bkH = Math.min(24, (h - seatTop) * 0.5), lean = 0.3, cT = 22, cH = (h - seatTop + 1 - cT * 0.7 * Math.sin(lean)) / Math.cos(lean) + 0.7;
  const block = (x0, x1, z0, z1, alongZ) => { const bw = x1 - x0, bd = z1 - z0, L = alongZ ? bd : bw, k = Math.max(1, Math.round(L / 32)), sm = [];
    for (let i = 1; i < k; i++) sm.push({ a: alongZ ? 'z' : 'x', at: -L / 2 + L * i / k });
    add(g, seamBoxGeo(bw, bkH + 1, bd, 3, sm, { dep: 0.3, sg: 0.6 }), F, (x0 + x1) / 2, seatTop - 1 + (bkH + 1) / 2, (z0 + z1) / 2); };
  const cushion = (bw, x, z, ry) => { const o = new THREE.Group(); o.position.set(x, seatTop - 1, z); o.rotation.y = ry || 0; g.add(o);
    // 大背墊：像一顆飽滿的枕頭——邊緣一圈凸起的滾邊、上面兩個角微微翹起，上薄下厚
    const cg = seamBoxGeo(bw, cH, cT, 8.5, [{ a: 'z', at: 0 }], { dep: -0.7, sg: 0.55 }), CP = cg.attributes.position, A = bw / 2, Bh = cH / 2;
    for (let i = 0; i < CP.count; i++) { let px = CP.getX(i), py = CP.getY(i), pz = CP.getZ(i); const t = py / cH + 0.5, u = Math.abs(px) / A;
      pz *= (1 - 0.3 * t * t) * (1 - 0.16 * u * u * u * u);                // 上緣、左右兩側比較薄，中間鼓
      const e = Math.max(0, u - 0.86) / 0.14 * Math.max(0, t - 0.86) / 0.14; if (e > 0) { px += Math.sign(px) * 1.6 * e; py += 2.2 * e; }   // 上面兩個角的小耳朵
      CP.setXYZ(i, px, py, pz); }
    CP.needsUpdate = true; cg.computeBoundingBox(); cg.computeBoundingSphere();
    const q = add(o, cg, F, 0, cH / 2, cT / 2); const pv = new THREE.Group(); pv.rotation.x = -lean; o.add(pv); pv.add(q); };
  // 主座：靠扶手那一座是 n−1 人、靠轉角那一座是 1 人；每個座位三條直線，後段一條橫的拉點線
  const mods = n > 1 ? [[xs, wingL - cw], [wingL - cw, wingL]] : [[xs, wingL]];
  for (const [x0, x1] of mods) { const k = Math.round((x1 - x0) / cw) * 3, sm = [{ a: 'z', at: zT - (zb + D / 2), f: top }];
    for (let i = 1; i < k; i++) sm.push({ a: 'x', at: -(x1 - x0) / 2 + (x1 - x0) * i / k });
    body(x0, x1, zb, zb + D, sm); block(x0 + 2, x1 - 2, bz0, bz1); }
  for (let i = 0; i < n; i++) cushion(cw - 3, xs + cw * (i + .5), bz1 + 4);
  // 轉角：後外角是大圓弧，背靠塊和背墊短一點、避開圓角
  // 轉角那一座：扇形（四分之一圓）——尖端在 L 的內角，外緣是一道圓弧；由中間一條放射狀的縫分成兩片。背靠塊和背墊斜放 45°，面向內角
  const vx = wingL, vz = zb + D, gp = 0.5, bv = 2.6, ux = Math.SQRT1_2, uz = -Math.SQRT1_2;       // (vx, vz)：內角；(ux, uz)：由內角指向圓弧中點的方向
  for (const [a0, a1] of [[0, Math.PI / 4 - 0.004], [Math.PI / 4 + 0.004, Math.PI / 2]]) {
    const sh = new THREE.Shape(), am = (a0 + a1) / 2, ox = Math.cos(am) * (bv + gp) * 1.6, oy = Math.sin(am) * (bv + gp) * 1.6;
    sh.moveTo(ox, oy); sh.absellipse(0, 0, Ww - bv - gp, D - bv - gp, a0 + 0.03, a1 - 0.03, false, 0); sh.lineTo(ox, oy);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: pH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 4, curveSegments: 14 });
    const m = add(g, geo, F, vx, legH + bv, vz); m.rotation.x = -Math.PI / 2;
  }
  const rp = Math.min(Ww, D) * 0.6, cwd = Math.min(74, Math.min(Ww, D) * 0.68);          // 背墊後緣離內角的距離、背墊寬度
  { const o = new THREE.Group(); o.position.set(vx + ux * (rp + 11), 0, vz + uz * (rp + 11)); o.rotation.y = -Math.PI / 4; g.add(o);
    const k = 4, sm = []; for (let i = 1; i < k; i++) sm.push({ a: 'x', at: -cwd / 2 + cwd * i / k });
    add(o, seamBoxGeo(cwd, bkH + 1, 17, 3, sm, { dep: 0.3, sg: 0.6 }), F, 0, seatTop - 1 + (bkH + 1) / 2, 0); }
  cushion(cwd + 4, vx + ux * (rp + 1), vz + uz * (rp + 1), -Math.PI / 4);
  // 貴妃：長長一片往前伸，車線是橫的；外側一塊背靠和背墊（只到一半），前段沒有靠背
  const ext = d - D;
  if (ext > 30) { const k = Math.max(1, Math.round(ext / 30)), sm = [{ a: 'x', at: Ww / 2 - 60, f: top }]; for (let i = 1; i < k; i++) sm.push({ a: 'z', at: -ext / 2 + ext * i / k });
    body(wingL, xR, zb + D, d / 2, sm);
    const Lc = Math.min(100, ext * 0.62); if (Lc > 40) { block(xR - 34, xR - 16, zb + D + 3, zb + D + 3 + Lc, true); cushion(Lc - 3, xR - 38, zb + D + 3 + Lc / 2, -Math.PI / 2); } }
  // 扶手：中間是一片實木立板，皮革從上面包下來——外側一片垂到座台底、內側一片只到坐面，上緣是圓的；前後端看得到夾在中間的實木
  const aTop = Math.min(seatTop + 17, h - 10), aH = aTop - legH - 2, wT = 2.4, pT = (aw - wT) / 2, ax = xL + aw / 2, az = zb + D / 2;
  RB(g, wT, aH - 5, D - 1, 0.9, ax, legH + 2 + (aH - 5) / 2, az, Wd);
  const sideSeam = sx => [{ a: 'z', at: -D * 0.17, f: nx => nx * sx > 0.3 ? 1 : 0 }, { a: 'z', at: D * 0.17, f: nx => nx * sx > 0.3 ? 1 : 0 }];
  add(g, seamBoxGeo(pT + 0.4, aH, D - 5, 1.5, sideSeam(-1), { dep: 0.3, sg: 0.6 }), F, xL + (pT + 0.4) / 2, legH + 2 + aH / 2, az - 0.5);   // 外側：薄薄一片垂到座台底
  RB(g, pT + 0.4, aH, D - 5, 1.5, xL + aw - (pT + 0.4) / 2, legH + 2 + aH / 2, az - 0.5, F);   // 內側（靠坐墊那一面）：皮革一樣整片包到底，看不到木頭；木頭只在正面和背面的斷面露出來
  RB(g, aw + 0.5, 6, D - 6, 2.9, ax, aTop - 2.9, az - 0.8, F);
  // 抱枕（布面）：轉角兩顆、扶手這端兩顆
  const PL = [surfMat('fabric', '#c9c8c4'), surfMat('fabric', '#8791a6')], pz = bz1 + 4 + cT + 6;
  const pil = (x, z, m, rz, ry) => { const o = new THREE.Group(); o.position.set(x, seatTop - 0.6, z); o.rotation.y = ry; g.add(o); const q = add(o, softPillowGeo(45, 45, 13), m, 0, 22.5, 0); q.rotation.x = -0.34; q.rotation.z = rz; q.position.z = Math.sin(0.34) * 22.5; };
  pil(xL + aw + 28, pz, PL[1], 0.05, 0.3); pil(xL + aw + 60, pz, PL[0], -0.04, 0.12);
  const pr = rp - cT - 5; for (const [sd, m, rz] of [[-1, PL[1], 0.05], [1, PL[0], -0.04]]) pil(vx + ux * pr + sd * uz * 17, vz + uz * pr - sd * ux * 17, m, rz, -Math.PI / 4 + sd * 0.15);
  // 金屬刀腳：每一座的四個角
  const pts = [], quad = (x0, x1, z0, z1, cut) => { for (const [x, sx] of [[x0 + 8, -1], [x1 - 8, 1]]) for (const [z, sz] of [[z0 + 9, -1], [z1 - 9, 1]]) pts.push([x, z, sx, sz]); };
  for (const [x0, x1] of mods) quad(x0, x1, zb, zb + D);
  pts.push([vx + 9, vz - 9, -1, 1], [vx + 9, zb + 12, -1, -1], [xR - 12, vz - 9, 1, 1], [vx + ux * (Math.min(Ww, D) - 14), vz + uz * (Math.min(Ww, D) - 14), 1, -1]);   // 轉角：內角、圓弧兩端、圓弧中點
  if (ext > 30) quad(wingL, xR, zb + D, d / 2);
  legs120(g, pts, legH, M);
  return mirrorIfLeft(it, g);
}
function buildFloatLSofa(it) { // 懸浮平台 L 型：雙色平台底座＋黑鐵雪橇腳（兩端鍍鉻）＋彎曲木ㄈ型邊几（玻璃立板）＋車線坐墊、大背墊、長腰枕
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), Bs = fabMat(it, 'color2'), Wd = surfMat('wood', it.color3 || '#d9bd94'), Mt = mat('#232325', 0.45, 0.6), Cr = mat('#d9dbde', 0.15, 0.95);
  const legH = 11, pT = 11, pTop = legH + pT, cushT = 19, seatTop = pTop + cushT, bt = 14;
  const sd = Math.min(100, d * 0.6), cwid = Math.min(105, w * 0.33), shelfW = Math.min(42, w * 0.13);
  const mainL = -w / 2, mainR = w / 2 - cwid - 2;
  // 平台底座（邊角圓潤）
  RB(g, mainR - mainL, pT, sd, 3.6, (mainL + mainR) / 2, legH + pT / 2, -d / 2 + sd / 2, Bs);
  RB(g, cwid, pT, d, 3.6, w / 2 - cwid / 2, legH + pT / 2, 0, Bs);
  // 黑鐵雪橇腳：兩支扁立柱＋貼地的扁鐵，扁鐵兩端各一塊鍍鉻腳墊
  const sled = (x, z, len, alongZ) => { const o = new THREE.Group(); o.position.set(x, 0, z); if (alongZ) o.rotation.y = Math.PI / 2; g.add(o);
    B(o, len + 12, 1, 4.2, 0, 1.3, 0, Mt);
    for (const s of [-1, 1]) { B(o, 4.2, legH - 1.6, 1.4, s * len / 2, 1.8 + (legH - 1.6) / 2, 0, Mt); RB(o, 6, 1.6, 4.6, 0.5, s * (len / 2 + 7.5), 0.8, 0, Cr); } };
  const sl = sd - 40;
  sled(mainL + shelfW + 30, -d / 2 + sd / 2, sl, true);
  sled(mainR - 25, -d / 2 + sd / 2, sl, true);
  sled(w / 2 - cwid / 2, d / 2 - 22, cwid - 40, false);
  // 彎曲木ㄈ型邊几（主座外端）：底板貼在平台上、靠坐墊那一面是立板、上面是檯面，轉角是彎的；裡面一片玻璃立板（正面＋外側）
  const sz = -d / 2 + sd / 2, shH = Math.min(60, h * 0.68), wt = 2, br = 3.2, x0 = mainL + 1, x1 = mainL + shelfW, yb = pTop, zF = -d / 2 + sd - 0.5, zB = -d / 2 + 0.5;
  { const sh = new THREE.Shape(), xi = x1 - wt;
    sh.moveTo(x0, yb); sh.lineTo(x1 - br, yb); sh.quadraticCurveTo(x1, yb, x1, yb + br); sh.lineTo(x1, shH - br); sh.quadraticCurveTo(x1, shH, x1 - br, shH); sh.lineTo(x0, shH);
    sh.lineTo(x0, shH - wt); sh.lineTo(xi - br * 0.4, shH - wt); sh.quadraticCurveTo(xi, shH - wt, xi, shH - wt - br * 0.4); sh.lineTo(xi, yb + wt + br * 0.4); sh.quadraticCurveTo(xi, yb + wt, xi - br * 0.4, yb + wt); sh.lineTo(x0, yb + wt); sh.lineTo(x0, yb);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: zF - zB, bevelEnabled: false, curveSegments: 10 }), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 60, uv.getY(i) / 60);
    add(g, geo, Wd, 0, 0, zB); }
  const gx = x0 + Math.min(10, shelfW * 0.25), gz = zF - 9, gh = shH - yb - 2 * wt;
  glassPane(g, x1 - wt - gx, gh, 0.8, (gx + x1 - wt) / 2, yb + wt + gh / 2, gz);
  glassPane(g, 0.8, gh, gz - zB - 8, gx, yb + wt + gh / 2, (gz + zB + 8) / 2);
  // 矮背框（底座布料），背墊靠在前面
  const seatL = mainL + shelfW + 1, inner = mainR - seatL, n = seatsOf(it), cw = inner / n, fbH = Math.min(h - 16, seatTop + 30) - pTop;
  RB(g, w / 2 - seatL, fbH, 8, 3, (seatL + w / 2) / 2, pTop + fbH / 2, -d / 2 + 4, Bs);
  // 坐墊（上下緣各一圈車線，前緣比平台多出一點）、背墊（正面一圈內縮的車線）、長腰枕
  const seat = (cw_, dep, x, z) => add(g, seamBoxGeo(cw_, cushT, dep, 5.5, [{ a: 'y', at: cushT / 2 - 3.2, f: (nx, ny) => 1 - Math.abs(ny) }, { a: 'y', at: -cushT / 2 + 3.2, f: (nx, ny) => 1 - Math.abs(ny) }], { dep: 0.35, sg: 0.55 }), F, x, pTop + cushT / 2, z);
  const backH = Math.min(50, h - seatTop + 2), bT = 16;
  const back = (bw, x) => { const o = new THREE.Group(); o.position.set(x, h - backH * Math.cos(0.1) - bT * Math.sin(0.1), -d / 2 + 8.5); o.rotation.x = -0.1; g.add(o);
    const q = Math.min(4.5, bw * 0.08); add(o, seamBoxGeo(bw, backH, bT, 6, [{ a: 'x', at: -bw / 2 + q, f: (nx, ny, nz) => Math.max(0, nz) }, { a: 'x', at: bw / 2 - q, f: (nx, ny, nz) => Math.max(0, nz) }, { a: 'y', at: backH / 2 - q, f: (nx, ny, nz) => Math.max(0, nz) }], { dep: 0.3, sg: 0.5 }), F, 0, backH / 2, bT / 2); };
  const lumbar = (lw, x) => { const m = RB(g, lw, 21, 15, 7.4, x, seatTop + 10.5, -d / 2 + 8.5 + bT + 6.5, F); m.rotation.x = -0.22; m.userData.pil = 1; };
  for (let i = 0; i < n; i++) { const x = seatL + cw * (i + .5); seat(cw - 1.2, sd - bt + 1, x, -d / 2 + bt + (sd - bt + 1) / 2); back(cw - 2, x); lumbar(cw - 5, x); }
  // 貴妃
  const cx = w / 2 - cwid / 2, aw = 16;
  seat(cwid - 1.2, d - bt, cx, -d / 2 + bt + (d - bt) / 2);
  back(cwid - aw - 2, cx - aw / 2); lumbar(cwid - aw - 5, cx - aw / 2);
  const armH = seatTop + 20, al = sd * 0.85;
  RB(g, aw, armH - pTop, al, 4, w / 2 - aw / 2, pTop + (armH - pTop) / 2, -d / 2 + al / 2, F);
  return mirrorIfLeft(it, g);
}
const BASES = { legs: '四腳', sled: '雪橇腳', x: '交叉腳', panel: '板腳', pedestal: '單柱底座', tulip: '喇叭底座', cross: '十字腳', drum: '實心底座' };
const baseList = ids => ids.map(id => opt(id, BASES[id]));
const LEGMATS = [opt('wood', '木頭'), opt('metal', '鐵件')];
function tableTop(g, shape, w, d, t, y, m) {
  if (shape === 'oval') return roundedTop(g, w, d, t, y - t / 2, m, Math.min(w, d) / 2 - 0.01); // 橢圓形＝長圓形（兩端半圓）
  if (shape === 'round') { const c = C(g, .5, .5, t, 0, y, 0, m, 64); c.scale.set(w, 1, d); return c; }
  return RB(g, w, t, d, Math.min(1.5, t / 2), 0, y, 0, m);
}
function tableBase(g, base, shape, w, d, lh, M, metal) { // 腳座由地面長到 lh（桌面下緣）
  const rnd = shape !== 'rect', th = metal ? 2.5 : 5;
  if (base === 'sled') {
    const x = rnd ? w * 0.3 : w / 2 - 10, zl = rnd ? d * 0.6 : d - 16;
    for (const s of [-1, 1]) {
      for (const zs of [-1, 1]) B(g, th, lh, th, s * x, lh / 2, zs * (zl / 2 - th / 2), M);
      B(g, th, th, zl, s * x, th / 2, 0, M);
      B(g, th, th, zl, s * x, lh - th / 2, 0, M);
    }
  } else if (base === 'x') {
    const x = rnd ? w * 0.3 : w / 2 - 10, span = (rnd ? d * 0.62 : d - 14) - th, L = Math.hypot(lh, span), a = Math.atan2(lh, span);
    for (const s of [-1, 1]) for (const r of [-1, 1]) { const m = B(g, th, th, L, s * x, lh / 2, 0, M); m.rotation.x = r * a; }
    B(g, 2 * x, th, th, 0, lh - th / 2, 0, M);
  } else if (base === 'panel') {
    const pt = metal ? 1.5 : 4, x = (rnd ? w * 0.3 : w / 2 - pt / 2 - 1), pd = rnd ? d * 0.55 : d - 4;
    for (const s of [-1, 1]) B(g, pt, lh, pd, s * x, lh / 2, 0, M);
  } else if (base === 'pedestal') {
    if (w > 1.6 * d) {
      for (const s of [-1, 1]) { C(g, th * 1.2, th * 1.2, lh, s * w * 0.28, lh / 2, 0, M, 20); B(g, 8, 2.5, d * 0.6, s * w * 0.28, 1.25, 0, M); }
      B(g, w * 0.56, 4, 5, 0, lh - 6, 0, M);
    } else {
      C(g, th * 1.3, th * 1.3, lh, 0, lh / 2, 0, M, 20);
      if (rnd) C(g, .5, .5, 2.5, 0, 1.25, 0, M, 40).scale.set(w * 0.5, 1, d * 0.5);
      else B(g, w * 0.5, 2.5, d * 0.5, 0, 1.25, 0, M);
    }
  } else if (base === 'tulip') {
    const r = Math.min(w, d) * 0.28;
    C(g, th * 0.9, r, lh * 0.9, 0, lh * 0.45, 0, M, 40);
    C(g, th * 1.2, th * 0.9, lh * 0.12, 0, lh * 0.94, 0, M, 20);
  } else if (base === 'cross') {
    const L = Math.min(w, d) * 0.62;
    C(g, th * 1.1, th * 1.1, lh, 0, lh / 2, 0, M, 20);
    B(g, L, 3, 6, 0, 1.5, 0, M); B(g, 6, 3, L, 0, 1.5, 0, M);
  } else if (base === 'drum') {
    if (rnd) C(g, .5, .5, lh, 0, lh / 2, 0, M, 48).scale.set(w * 0.62, 1, d * 0.62);
    else B(g, w * 0.7, lh, d * 0.7, 0, lh / 2, 0, M);
  } else {
    const pts = rnd ? [[.33, .33], [-.33, .33], [.33, -.33], [-.33, -.33]].map(([a, b]) => [a * w, b * d])
      : [[w / 2 - 6, d / 2 - 6], [-(w / 2 - 6), d / 2 - 6], [w / 2 - 6, -(d / 2 - 6)], [-(w / 2 - 6), -(d / 2 - 6)]];
    for (const [x, z] of pts) metal ? C(g, 1.2, 1.2, lh, x, lh / 2, z, M, 10) : B(g, th, lh, th, x, lh / 2, z, M);
  }
}
const BAR_BASES = { key: 'base', label: '腳座', list: baseList(['legs', 'sled', 'panel']) };
const BARROUND_BASES = { key: 'base', label: '腳座', list: baseList(['pedestal', 'tulip', 'cross']) };
const BAR_LEGMAT = { key: 'legmat', label: '腳材質', list: [opt('metal', '鐵件'), opt('wood', '木頭')] };
function buildBarTable(it, kind) {
  const g = new THREE.Group(), { w, d, h } = it, t = 4, metal = it.legmat !== 'wood', M = metal ? mat(it.color2, 0.32, 0.75) : mat(it.color2, 0.55);
  const fy = Math.min(28, h * 0.27), fr = metal ? 2.2 : 3.5;                 // 踏腳桿的高度、粗細
  if (kind === 'island') {                                                    // 中島吧檯：櫃體＋往座位那一側伸出去的檯面
    const Bd = bodyMat(it), Tp = surfMat(it.topmat || 'slate', it.color3 || it.color), Dk = mat('#2b2a2a', 0.7), St = mat('#8a8d91', 0.3, 0.8);
    const over = Math.min(28, d * 0.38), bd = d - over - 1.5, bz = -d / 2 + 1.5 + bd / 2, kick = 8, bh = h - t - kick;
    B(g, w - 4, kick, bd - 6, 0, kick / 2, bz - 1, Dk);
    B(g, w, bh, bd, 0, kick + bh / 2, bz, Bd);
    const nd = Math.max(2, Math.round(w / 45)), dw = w / nd;                  // 工作那一側的門片
    for (let i = 1; i < nd; i++) B(g, 0.4, bh - 1, 0.3, -w / 2 + dw * i, kick + bh / 2, -d / 2 + 1.45, Dk);
    for (let i = 0; i < nd; i++) B(g, 1.2, 12, 1.2, -w / 2 + dw * (i + (i % 2 ? 0.14 : 0.86)), kick + bh - 12, -d / 2 + 0.9, St);
    RB(g, w, t, d, 1, 0, h - t / 2, 0, Tp);
    const rz = -d / 2 + 1.5 + bd + 5;                                               // 座位這一側的踏腳桿
    C(g, 1.3, 1.3, w - 16, 0, 20, rz, St, 14).rotation.z = Math.PI / 2;
    for (const sx of [-1, 0, 1]) B(g, 1.6, 1.6, 5, sx * (w / 2 - 14), 20, rz - 2.5, St);
    return g;
  }
  if (kind === 'wall') {                                                      // 靠牆吧檯：固定在牆上的檯面＋三角支架
    tableTop(g, 'rect', w, d, t, h - t / 2, topMat(it));
    B(g, w - 4, 7, 1.8, 0, h - t - 3.5, -d / 2 + 0.9, M);
    const bl = Math.min(30, h * 0.3);
    for (const sx of [-1, 1]) { const x = sx * (w / 2 - Math.min(18, w * 0.15));
      B(g, 2.4, bl, 2.4, x, h - t - bl / 2, -d / 2 + 1.2, M); B(g, 2.4, 2.4, d - 6, x, h - t - 1.2, -1, M);
      rod(g, new V3(x, h - t - bl + 1.5, -d / 2 + 1.5), new V3(x, h - t - 2, d / 2 - 6), 1, M); }
    return g;
  }
  if (kind === 'round') {                                                     // 圓形高腳桌
    const base = it.base || 'pedestal';
    tableTop(g, 'round', w, d, t, h - t / 2, topMat(it));
    tableBase(g, base, 'round', w, d, h - t, M, metal);
    if (base !== 'tulip') { const r = Math.min(w, d) * 0.3;
      add(g, new THREE.TorusGeometry(r, 1.1, 10, 44), M, 0, fy, 0).rotation.x = Math.PI / 2;
      B(g, 2 * r, 1.5, 1.5, 0, fy, 0, M); B(g, 1.5, 1.5, 2 * r, 0, fy, 0, M); }
    return g;
  }
  const base = it.base || 'legs';                                             // 長型吧檯桌
  tableTop(g, 'rect', w, d, t, h - t / 2, topMat(it));
  tableBase(g, base, 'rect', w, d, h - t, M, metal);
  if (base === 'legs') { for (const sz of [-1, 1]) B(g, w - 12, fr, fr, 0, fy, sz * (d / 2 - 6), M); for (const sx of [-1, 1]) B(g, fr, fr, d - 12, sx * (w / 2 - 6), fy + 12, 0, M); }
  else if (base === 'sled') for (const sz of [-1, 1]) B(g, w - 20, fr, fr, 0, fy, sz * ((d - 16) / 2 - (metal ? 1.25 : 2.5)), M);
  else B(g, w - 4, fr + 1, fr, 0, fy, 0, M);
  return g;
}
function buildBarStool(it, style) {
  const g = new THREE.Group(), { w, d, h } = it, S = fabMat(it), metal = it.legmat !== 'wood';
  const L = metal ? mat(it.color2, 0.3, 0.75) : mat(it.color2, 0.55), lr = metal ? 1.1 : 1.7;
  const seatH = style === 'round' ? h : Math.min(76, h * 0.76), fy = Math.max(18, seatH - 45);
  // 四支外張的腳＋一圈踏腳：top／bot 是腳在坐面下和地面的位置（相對寬深的比例）
  const splay = (top, bot, yTop, ring) => {
    const at = y => { const k = (yTop - y) / yTop, f = top + (bot - top) * k; return [w * f, d * f]; };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(g, new V3(sx * w * top, yTop, sz * d * top), new V3(sx * w * bot, 0, sz * d * bot), lr, L);
    const [fx, fz] = at(fy);
    if (ring) { const m = add(g, new THREE.TorusGeometry(Math.SQRT2 * fx, lr * 0.8, 10, 44), L, 0, fy, 0); m.rotation.x = Math.PI / 2; m.scale.y = fz / fx; }
    else for (const s of [-1, 1]) { rod(g, new V3(-fx, fy, s * fz), new V3(fx, fy, s * fz), lr * 0.8, L); rod(g, new V3(s * fx, fy, -fz), new V3(s * fx, fy, fz), lr * 0.8, L); }
  };
  if (style === 'round') {                                                    // 圓凳：圓形軟墊、沒有靠背
    C(g, .5, .5, 2, 0, seatH - 8.2, 0, L, 40).scale.set(w * 0.9, 1, d * 0.9);
    const m = add(g, new THREE.CylinderGeometry(.5, .5, 6, 40), S, 0, seatH - 4.2, 0); m.scale.set(w, 1, d);
    add(g, new THREE.SphereGeometry(.5, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), S, 0, seatH - 1.25, 0).scale.set(w * 0.985, 2.4, d * 0.985);
    splay(0.26, 0.45, seatH - 8.2, true);
    return g;
  }
  if (style === 'swivel') {                                                   // 升降旋轉：圓盤底座＋中柱＋踏腳環
    const Mt = mat(it.color2, 0.2, 0.85), r = Math.min(w, d) * 0.5;
    C(g, r * 0.9, r, 2, 0, 1, 0, Mt, 44); C(g, 2.6, 2.6, seatH - 12, 0, 2 + (seatH - 12) / 2, 0, Mt, 20); C(g, 4.2, 4.6, 22, 0, 13, 0, Mt, 20);
    add(g, new THREE.TorusGeometry(r * 0.78, 1, 10, 44), Mt, 0, fy, 0).rotation.x = Math.PI / 2;
    B(g, r * 1.56, 1.4, 1.4, 0, fy, 0, Mt);
    C(g, 9, 6, 3, 0, seatH - 10.5, 0, Mt, 20);
    RB(g, w, 9, d - 3, 4, 0, seatH - 4.5, 1.5, S);
    const bk = RB(g, w, Math.min(26, h - seatH + 4), 6, 2.8, 0, seatH - 4 + Math.min(26, h - seatH + 4) / 2, -d / 2 + 4, S); bk.rotation.x = -0.12;
    return g;
  }
  if (style === 'wood') {                                                     // 實木高腳椅：後腳往上延伸成椅背
    const W = L, ps = metal ? 2.6 : 3.6, x = w / 2 - ps / 2 - 1, z = d / 2 - ps / 2 - 1;
    RB(g, w, 4.5, d - 2, 1.6, 0, seatH - 2.25, 1, S);
    for (const sx of [-1, 1]) { B(g, ps, seatH - 4.5, ps, sx * x, (seatH - 4.5) / 2, z, W); B(g, ps, h, ps, sx * x, h / 2, -z, W); B(g, ps * 0.7, ps * 0.7, 2 * z, sx * x, fy + 14, 0, W); }
    B(g, 2 * x, ps * 0.8, ps * 0.8, 0, fy, z, W); B(g, 2 * x, ps * 0.7, ps * 0.7, 0, fy + 8, -z, W);
    B(g, 2 * x, 4, ps * 0.7, 0, seatH - 6.5, z, W);
    RB(g, 2 * x + ps, 9, ps * 0.8, 1.2, 0, h - 5.5, -z, W);
    const sh = h - 11 - seatH - 4; if (sh > 8) for (let i = -1; i <= 1; i++) B(g, 3.2, sh, 1.6, i * x * 0.55, seatH + 2 + sh / 2, -z, W);
    return g;
  }
  // 低背吧檯椅：軟包坐墊＋一段矮靠背
  RB(g, w, 8, d - 4, 3.2, 0, seatH - 4, 2, S);
  const bh = Math.min(22, h - seatH + 2);
  const bk = RB(g, w - 2, bh, 5, 2.4, 0, h - bh / 2, -d / 2 + 3.5, S); bk.rotation.x = -0.1;
  for (const sx of [-1, 1]) rod(g, new V3(sx * (w / 2 - 8), seatH - 6, -d / 2 + 5), new V3(sx * (w / 2 - 8), h - bh + 3, -d / 2 + 3), lr * 0.8, L);
  splay(0.36, 0.47, seatH - 8, false);
  return g;
}
const KITCHEN_OPTS = [{ key: 'style', label: '門板款式', list: [opt('flat', '平板門'), opt('groove', '無把手'), opt('slat', '格柵門')] }];
function buildCabinet(it, o = {}) {
  const g = new THREE.Group(), { w, d, h } = it, style = it.style || 'flat';
  const Body = bodyMat(it), HD = mat(o.counter ? '#9a9a9a' : it.color2, 0.35, 0.6), dark = mat('#4b4540', 0.8);
  const plinth = Math.min(8, h * 0.08), topT = o.counter ? 4 : o.top ? 2.5 : 0, bodyTop = h - topT, dh = bodyTop - plinth;
  B(g, w - 4, plinth, d - 6, 0, plinth / 2, -3, dark);
  if (style === 'glass') { // 中空櫃體才看得到層板
    B(g, w, dh, 1.5, 0, plinth + dh / 2, -d / 2 + 0.75, Body);
    for (const s of [-1, 1]) B(g, 1.8, dh, d - 2, s * (w / 2 - 0.9), plinth + dh / 2, -1, Body);
    B(g, w, 1.8, d - 2, 0, bodyTop - 0.9, -1, Body);
    B(g, w, 1.8, d - 2, 0, plinth + 0.9, -1, Body);
    const ns = Math.max(1, Math.round(dh / 38));
    for (let i = 1; i < ns; i++) B(g, w - 3.6, 1.5, d - 5, 0, plinth + dh * i / ns, -1.5, Body);
  } else B(g, w, dh, d - 2, 0, plinth + dh / 2, -1, Body);
  const n = Math.max(1, Math.round(w / (o.doorW || 50))), dw = w / n;
  const tall = h > 140, hl = Math.min(tall ? 30 : 12, dh * 0.3), cy = plinth + dh / 2, zf = d / 2 - 0.9;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + dw * (i + .5);
    const side = n === 1 ? -1 : (i % 2 === 0 ? 1 : -1), hx = x + side * (dw / 2 - 4);
    const handle = () => {
      if (o.counter) B(g, Math.min(16, dw * 0.4), 1.2, 1.5, x, bodyTop - 6, d / 2 + 0.7, HD);
      else B(g, 1.5, hl, 2, hx, tall ? plinth + dh * 0.5 : bodyTop - 5 - hl / 2, d / 2 + 1, HD);
    };
    if (style === 'slat') { slats(g, x, cy, dw - 1, dh - 1, d / 2 - 0.8, Body, dark); continue; }
    if (style === 'glass') {
      const f = 4, z = d / 2 - 1;
      B(g, dw - 0.6, f, 2, x, plinth + dh - f / 2 - 0.3, z, Body);
      B(g, dw - 0.6, f, 2, x, plinth + f / 2 + 0.3, z, Body);
      for (const s of [-1, 1]) B(g, f, dh - 0.6, 2, x + s * (dw / 2 - f / 2 - 0.3), cy, z, Body);
      glassPane(g, dw - 2 * f, dh - 2 * f, 0.5, x, cy, z);
      handle(); continue;
    }
    B(g, dw - 0.6, dh - 0.6, 1.8, x, cy, zf, Body);
    if (style === 'groove') B(g, dw - 0.6, 1, 0.3, x, bodyTop - 2.5, d / 2 + 0.05, dark);
    else handle();
  }
  if (o.top) RB(g, w + 0.6, topT, d + 0.6, 0.8, 0, h - topT / 2, 0, topMat(it, 'color3'));
  if (o.counter) {
    B(g, w + 1, topT, d + 1, 0, h - topT / 2, 0, topMat(it, 'color2'));
    if (w > 100) {
      B(g, Math.min(60, w * 0.3), 0.4, d * 0.6, -w * 0.18, h + 0.1, -2, mat('#b8bcc0', 0.25, 0.8));
      C(g, 1.2, 1.2, 25, -w * 0.18, h + 12.5, -d / 2 + 8, mat('#b8bcc0', 0.25, 0.8), 12);
    }
  }
  return g;
}
function buildFridge(it) {
  const g = new THREE.Group(), { w, d, h } = it;
  const Bd = mat(it.color, 0.35, 0.3), HD = mat(it.color2, 0.3, 0.7);
  RB(g, w, h - 2, d - 3, 2, 0, 2 + (h - 2) / 2, -1.5, Bd);
  const top = (h - 2) * 0.32;
  B(g, w - 1, top - 0.8, 2, 0, h - top / 2, d / 2 - 1, Bd);
  B(g, w - 1, h - 2 - top - 0.8, 2, 0, 2 + (h - 2 - top) / 2, d / 2 - 1, Bd);
  B(g, 2, Math.min(25, top * 0.6), 2.5, -w / 2 + 6, h - top + top * 0.3, d / 2 + 1, HD);
  B(g, 2, Math.min(40, h * 0.25), 2.5, -w / 2 + 6, h - top - 30, d / 2 + 1, HD);
  return g;
}
const TOPMAT_LIST = [opt('wood', '木頭'), opt('marble', '大理石'), opt('slate', '陶板(岩板)'), opt('glass', '玻璃')];
const TOPMAT_OPT = { key: 'topmat', label: '桌面材質', list: TOPMAT_LIST };
const COUNTER_OPT = { key: 'topmat', label: '檯面材質', list: TOPMAT_LIST };
const TEX = {};
function surfTex(kind) {
  if (TEX[kind]) return TEX[kind];
  if (kind.endsWith('-inv')) { // 深色石材：深底白紋（把淺底深紋反轉）
    const src = surfTex(kind.slice(0, -4)).image, c2 = document.createElement('canvas'); c2.width = c2.height = 512;
    const x2 = c2.getContext('2d'); x2.drawImage(src, 0, 0);
    const img = x2.getImageData(0, 0, 512, 512);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.min(255, 22 + (255 - img.data[i]) * 3.2); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; }
    x2.putImageData(img, 0, 0);
    const t2 = new THREE.CanvasTexture(c2);
    t2.colorSpace = THREE.SRGBColorSpace; t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.anisotropy = 4;
    return TEX[kind] = t2;
  }
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 512);
  let seed = { marble: 11, slate: 29, fabric: 41, cement: 53, rattan: 67 }[kind] || 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const noise = amp => {
    const img = x.getImageData(0, 0, 512, 512);
    for (let i = 0; i < img.data.length; i += 4) { const v = 255 - amp / 2 + (rnd() - 0.5) * amp; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; }
    x.putImageData(img, 0, 0);
  };
  if (kind === 'marble') { // 大理石紋
    for (let k = 0; k < 16; k++) {
      x.strokeStyle = `rgba(95,95,100,${0.08 + rnd() * 0.28})`; x.lineWidth = 0.6 + rnd() * 2.4;
      x.beginPath(); let px = rnd() * 512, py = -10; x.moveTo(px, py);
      while (py < 522) { px += (rnd() - 0.5) * 46; py += 8 + rnd() * 22; x.lineTo(px, py); }
      x.stroke();
    }
  } else if (kind === 'slate') {                   // 陶板（岩板）：細顆粒＋淡淡的石紋
    noise(18);
    for (let k = 0; k < 12; k++) {
      x.strokeStyle = `rgba(110,110,115,${0.05 + rnd() * 0.14})`; x.lineWidth = 0.5 + rnd() * 1.6;
      x.beginPath(); let px = rnd() * 512, py = -10; x.moveTo(px, py);
      while (py < 522) { px += (rnd() - 0.5) * 60; py += 10 + rnd() * 26; x.lineTo(px, py); }
      x.stroke();
    }
  }
  else if (kind === 'fabric') noise(16);           // 布料織紋
  else if (kind === 'cement') {                    // 水泥
    noise(40);
    for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.04})`; x.beginPath(); x.arc(rnd() * 512, rnd() * 512, 10 + rnd() * 50, 0, 7); x.fill(); }
  } else if (kind === 'rattan') {                  // 藤編
    x.strokeStyle = 'rgba(80,50,20,.35)'; x.lineWidth = 3;
    for (let k = -512; k < 1024; k += 14) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 512, 512); x.stroke(); x.beginPath(); x.moveTo(k + 512, 0); x.lineTo(k, 512); x.stroke(); }
  } else { // 木紋
    for (let yy = 0; yy < 512; yy += 2) {
      x.fillStyle = `rgba(90,55,25,${0.03 + 0.07 * Math.abs(Math.sin(yy * 0.06 + Math.sin(yy * 0.011) * 3))})`;
      x.fillRect(0, yy, 512, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return TEX[kind] = t;
}
function surfMat(kind, col) {
  col = col || '#ffffff';
  const tx = kind === 'glass' ? null : customTex(col, kind === 'leather' || kind === 'velvet' || kind === 'fabric'), k = 'surf|' + kind + '|' + col + (tx ? '|' + tx.uuid + '|' + TRI_CUR + '|' + TRI_MAX : '');
  if (MATS.has(k)) return MATS.get(k);
  let m;
  switch (kind) {
    case 'glass': m = new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.2 }); break;
    case 'lacquer': case 'ceramic': m = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15 }); break;
    case 'marble': case 'slate': { // 深色時改用深底白紋
      const dark = hslOf(col).l < 0.3;
      m = new THREE.MeshStandardMaterial({ color: dark ? new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.75) : col, map: surfTex(kind + (dark ? '-inv' : '')), roughness: kind === 'marble' ? 0.18 : 0.4 });
      break;
    }
    case 'cement': m = new THREE.MeshStandardMaterial({ color: col, map: surfTex('cement'), roughness: 0.95 }); break;
    case 'rattan': m = new THREE.MeshStandardMaterial({ color: col, map: surfTex('rattan'), roughness: 0.85 }); break;
    case 'fabric': m = new THREE.MeshStandardMaterial({ color: col, map: surfTex('fabric'), roughness: 0.95 }); break;
    case 'leather': m = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5 }); break;
    case 'velvet': m = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.8, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.4) }); break;
    case 'metal': m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.32, metalness: 0.75 }); break;
    default: m = new THREE.MeshStandardMaterial({ color: col, map: surfTex('wood'), roughness: 0.55 });
  }
  if (GRAIN[kind] || kind === 'wood' || !['glass', 'lacquer', 'ceramic', 'marble', 'slate', 'cement', 'rattan', 'metal'].includes(kind)) m.userData.grain = GRAIN[kind] || 4;   // 皮革的皮紋、布料的織紋、絨布的細毛、木頭的木紋起伏
  if (tx) triMat(m, tx, kind === 'marble' || kind === 'slate' ? 'slab' : kind === 'leather' || kind === 'velvet' || kind === 'fabric'); else if (m.userData.grain) fxMat(m);
  if (kind === 'marble' || kind === 'slate' || kind === 'lacquer' || kind === 'ceramic') m.envMapIntensity = 1.6;   // 石材、烤漆的檯面：環境的反光明顯一點
  MATS.set(k, m);
  return m;
}
const topMat = (it, key = 'color') => surfMat(it.topmat || 'wood', it[key]);
const bodyMat = (it, key = 'color') => surfMat(it.bodymat || ((TYPES[it.type] || {}).def || {}).bodymat || 'wood', it[key]);
const fabMat = (it, key = 'color') => surfMat(it.fabric || 'fabric', it[key]);
const MIRROR = new THREE.MeshStandardMaterial({ color: '#dfe7ea', roughness: 0.04, metalness: 0.95 });
const SIDEBOARD_OPTS = [{ key: 'style', label: '款式', list: [opt('low', '矮櫃'), opt('slat', '格柵門矮櫃'), opt('tall', '高餐櫃（上玻璃櫃）', { size: { w: 120, d: 45, h: 200 } })] }, COUNTER_OPT];
function buildSideboard(it) {
  const g = new THREE.Group(), { w, d, h } = it, style = it.style || 'low';
  const Bd = bodyMat(it, 'color2'), knob = mat('#b08d57', 0.3, 0.8), dark = mat('#3b3632', 0.85);
  const lowH = style === 'tall' ? Math.min(86, h * 0.45) : h, legH = style === 'tall' ? 6 : Math.min(14, lowH * 0.16), topT = 3;
  if (style === 'tall') B(g, w - 4, legH, d - 6, 0, legH / 2, -3, dark); else legs4(g, w, d, legH, 5, 3.5, Bd, false);
  const bh = lowH - legH - topT;
  B(g, w, bh, d - 2, 0, legH + bh / 2, -1, Bd);
  RB(g, w + 1, topT, d + 1, 1, 0, lowH - topT / 2, 0, topMat(it));
  const n = Math.max(2, Math.round(w / 45)), dw = w / n, y = legH + bh / 2;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + dw * (i + .5);
    if (style === 'slat') { slats(g, x, y, dw - 1, bh - 1, d / 2 - 0.8, Bd, dark); continue; }
    B(g, dw - 0.6, bh - 0.6, 1.8, x, y, d / 2 - 0.9, Bd);
    add(g, new THREE.SphereGeometry(1.3, 10, 8), knob, x + (i % 2 ? -1 : 1) * (dw / 2 - 5), y + bh * 0.25, d / 2 + 0.6);
  }
  if (style === 'tall') { // 上層玻璃展示櫃（內縮）
    const ud = d * 0.7, uz = -d / 2 + ud / 2, uy0 = lowH, uh = h - lowH;
    B(g, w, uh, 1.5, 0, uy0 + uh / 2, -d / 2 + 0.75, Bd);
    for (const s of [-1, 1]) B(g, 2, uh, ud, s * (w / 2 - 1), uy0 + uh / 2, uz, Bd);
    B(g, w, 3, ud, 0, h - 1.5, uz, Bd);
    const ns = Math.max(1, Math.round(uh / 35));
    for (let i = 1; i < ns; i++) B(g, w - 4, 1.5, ud - 3, 0, uy0 + uh * i / ns, uz, Bd);
    const nu = Math.max(2, Math.round(w / 50)), uw = w / nu, zf = -d / 2 + ud;
    for (let i = 0; i < nu; i++) {
      const x = -w / 2 + uw * (i + .5);
      B(g, uw - 0.6, 3, 2, x, h - 4.5, zf, Bd); B(g, uw - 0.6, 3, 2, x, uy0 + 1.5, zf, Bd);
      for (const s of [-1, 1]) B(g, 3, uh - 6, 2, x + s * (uw / 2 - 1.8), uy0 + uh / 2 - 1.5, zf, Bd);
      glassPane(g, uw - 6, uh - 9, 0.5, x, uy0 + uh / 2 - 1.5, zf);
    }
  }
  return g;
}
function glowMat(col) {
  const k = 'glow|' + col;
  if (!MATS.has(k)) MATS.set(k, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.45, roughness: 0.8, side: THREE.DoubleSide }));
  return MATS.get(k);
}
function buildOven(it) {
  const g = new THREE.Group(), { w, d, h } = it, Bd = surfMat('lacquer', it.color), M = surfMat('metal', it.color2);
  RB(g, w, h, d, 1.5, 0, h / 2, 0, Bd);
  B(g, w * 0.72, h * 0.62, 0.5, -w * 0.1, h * 0.46, d / 2 + 0.1, DARKGLASS());
  const hb = C(g, 0.8, 0.8, w * 0.6, -w * 0.1, h * 0.83, d / 2 + 2, M, 10); hb.rotation.z = Math.PI / 2;
  for (let i = 0; i < 3; i++) C(g, 1.8, 1.8, 1.5, w * 0.37, h * (0.25 + i * 0.25), d / 2 + 0.7, M, 16).rotation.x = Math.PI / 2;
  return g;
}
function buildDishwasher(it) {
  const g = new THREE.Group(), { w, d, h } = it, Bd = surfMat('metal', it.color), M = surfMat('metal', it.color2);
  RB(g, w, h, d, 1, 0, h / 2, 0, Bd);
  B(g, w - 2, 8, 0.6, 0, h - 5, d / 2 + 0.2, surfMat('lacquer', '#2b2b2b'));
  B(g, 5, 1, 0.3, w * 0.3, h - 5, d / 2 + 0.6, glowMat('#7fd1ff'));
  const hb = C(g, 0.9, 0.9, w * 0.7, 0, h - 14, d / 2 + 2.5, M, 10); hb.rotation.z = Math.PI / 2;
  B(g, w - 2, 9, 0.5, 0, 4.5, d / 2 - 2, surfMat('lacquer', '#2b2b2b'));
  return g;
}
const DARKGLASS = () => surfMat('glass', '#1b1f24');
function buildMicrowave(it) {
  const g = new THREE.Group(), { w, d, h } = it, Bd = surfMat('lacquer', it.color);
  RB(g, w, h, d, 1.5, 0, h / 2, 0, Bd);
  B(g, w * 0.68, h - 6, 0.5, -w * 0.13, h / 2, d / 2 + 0.1, DARKGLASS());
  B(g, w * 0.2, h - 6, 0.5, w * 0.37, h / 2, d / 2 + 0.1, surfMat('metal', it.color2));
  return g;
}
function buildRiceCooker(it) {
  const g = new THREE.Group(), { w, d, h } = it, Bd = surfMat('lacquer', it.color), M = surfMat('metal', '#b8bcc0'), r = Math.min(w, d) / 2;
  C(g, r, r * 0.9, h * 0.7, 0, h * 0.35, 0, Bd, 32);
  add(g, new THREE.SphereGeometry(r * 0.95, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M, 0, h * 0.7, 0).scale.y = (h * 0.3) / (r * 0.95);
  for (const sd of [-1, 1]) B(g, 3, 2, 6, sd * r, h * 0.62, 0, surfMat('metal', it.color2));
  return g;
}
function buildCoffeeMaker(it) {
  const g = new THREE.Group(), { w, d, h } = it, Bd = surfMat('metal', it.color), blk = surfMat('lacquer', it.color2);
  RB(g, w, h, d * 0.55, 2, 0, h / 2, -d * 0.22, Bd);
  B(g, w, 4, d, 0, 2, 0, blk);
  B(g, w, h * 0.2, d, 0, h - h * 0.1, 0, Bd);
  C(g, 1.5, 1.5, 4, 0, h * 0.72, d * 0.15, blk, 10);
  C(g, 3.5, 3, 7, 0, 7.5, d * 0.15, surfMat('ceramic', '#ffffff'), 20);
  return g;
}
function buildDanishTable(it) {
  const g = new THREE.Group(), { w, d, h } = it;
  const T = topMat(it), L = surfMat('wood', it.color2), pad = mat('#3b3632', 0.8);
  const tt = 1, apH = 6, sT = Math.min(6.5, w * 0.08, d * 0.12), cr = Math.min(2.6, sT * 0.42);
  // 圓角桌面：用圓角矩形擠出，並把貼圖座標換算成 0～1
  const sh = new THREE.Shape(), x0 = -w / 2, y0 = -d / 2;
  sh.moveTo(x0 + cr, y0); sh.lineTo(x0 + w - cr, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + cr);
  sh.lineTo(x0 + w, y0 + d - cr); sh.quadraticCurveTo(x0 + w, y0 + d, x0 + w - cr, y0 + d);
  sh.lineTo(x0 + cr, y0 + d); sh.quadraticCurveTo(x0, y0 + d, x0, y0 + d - cr);
  sh.lineTo(x0, y0 + cr); sh.quadraticCurveTo(x0, y0, x0 + cr, y0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: tt, bevelEnabled: false, curveSegments: 8 });
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + w / 2) / w, (uv.getY(i) + d / 2) / d);
  const top = add(g, geo, T, 0, h - tt, 0); top.rotation.x = -Math.PI / 2;
  // 木框：外緣和桌面邊緣、桌腳平齊，兩端接在桌腳上段的方塊之間（看得到接縫）
  const yA = h - tt - apH, ay = yA + apH / 2;
  for (const s of [-1, 1]) {
    B(g, w - 2 * sT, apH, 2.4, 0, ay, s * (d / 2 - 1.2 - 0.12), L);
    B(g, 2.4, apH, d - 2 * sT, s * (w / 2 - 1.2 - 0.12), ay, 0, L);
  }
  // 實木腳：上段是和木框等高的圓角方塊，往下內側以弧線收窄，再一路收細到接近圓形；外側兩面是直的、和桌面平齊
  const fil = Math.min(7, yA * 0.12), sB = sT * 0.5, sM = sT * 0.74, ys = [0.6];
  for (let y = 8; y < yA - fil - 1; y += 9) ys.push(y);
  for (let i = 0; i <= 8; i++) ys.push(yA - fil + fil * i / 8);
  ys.push(h - tt);
  const M = 32, pos = [], uvs = [], idx = [];
  ys.forEach((y, j) => {
    const lin = sB + (sM - sB) * Math.min(1, y / yA), t = Math.max(0, Math.min(1, (y - (yA - fil)) / fil));
    const sz = y >= yA ? sT : lin + (sT - lin) * (1 - Math.sqrt(1 - t * t)), k = Math.min(1, y / yA), r = Math.min(sz / 2, cr + (sz * 0.46 - cr) * (1 - k) * (1 - k));
    for (let i = 0; i <= M; i++) {
      const q = Math.min(3, Math.floor(i / (M / 4))) , a = (i / M) * Math.PI * 2, cx = [1, -1, -1, 1][q] * (sz / 2 - r), cz = [1, 1, -1, -1][q] * (sz / 2 - r);
      pos.push(sz / 2 + cx + Math.cos(a) * r, y, sz / 2 + cz + Math.sin(a) * r); uvs.push(i / M * 0.35, y / 70);
    }
    if (j) for (let i = 0; i < M; i++) { const p0 = (j - 1) * (M + 1) + i, p1 = j * (M + 1) + i; idx.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1); }
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); lg.setIndex(idx); lg.computeVertexNormals();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add(g, lg, L, sx * w / 2, 0, sz * d / 2).scale.set(-sx, 1, -sz);
    C(g, sB * 0.42, sB * 0.42, 0.6, sx * (w / 2 - sB / 2), 0.3, sz * (d / 2 - sB / 2), pad, 12);
  }
  return g;
}
function roundedTop(g, w, d, tt, y, m, cr) {
  const sh = new THREE.Shape(), x0 = -w / 2, y0 = -d / 2;
  sh.moveTo(x0 + cr, y0); sh.lineTo(x0 + w - cr, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + cr);
  sh.lineTo(x0 + w, y0 + d - cr); sh.quadraticCurveTo(x0 + w, y0 + d, x0 + w - cr, y0 + d);
  sh.lineTo(x0 + cr, y0 + d); sh.quadraticCurveTo(x0, y0 + d, x0, y0 + d - cr);
  sh.lineTo(x0, y0 + cr); sh.quadraticCurveTo(x0, y0, x0 + cr, y0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: tt, bevelEnabled: false, curveSegments: 8 });
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + w / 2) / w, (uv.getY(i) + d / 2) / d);
  const mesh = add(g, geo, m, 0, y, 0); mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
function buildPencilTable(it) {
  const g = new THREE.Group(), { w, d, h } = it;
  const T = topMat(it), M = surfMat('metal', it.color2), pad = mat('#1a1a1a', 0.8);
  const tt = 0.7, st = 2, cr = Math.min(3, w * 0.04, d * 0.04);
  roundedTop(g, w, d, tt, h - tt, T, cr);
  roundedTop(g, w - 0.6, d - 0.6, st, h - tt - st, M, cr); // 薄陶板下面的黑色底板
  // 鉛筆腳：粗圓腳、頂端是平的，比桌面底下低一點；往下收細。靠桌角、比桌緣略內縮
  const y0 = h - tt - st, r = Math.min(2.8, w * 0.03), lx = w / 2 - r - 1.6, lz = d / 2 - r - 1.6, top = y0 - 2.4;
  // 鐵框：長邊對著桌腳中心，兩端由補強片接到桌腳；短邊在補強片後面
  const fh = 5, fy = y0 - fh / 2, bl = Math.min(10, w * 0.08), fx = lx - bl + 0.75;
  for (const s of [-1, 1]) { B(g, 2 * fx, fh, 1.5, 0, fy, s * lz, M); B(g, 1.5, fh, 2 * lz, s * fx, fy, 0, M); }
  // 補強片：一片厚鐵板，上緣貼桌底、靠桌腳那端往下斜到腳頂；下緣由鐵框底斜斜收到桌腳上
  const tri = new THREE.Shape(), bd = Math.min(17, h * 0.23);
  tri.moveTo(r - 0.4, top - y0 + 0.3); tri.lineTo(r + 2.4, 0); tri.lineTo(bl, 0); tri.lineTo(bl, -fh); tri.lineTo(bl - 1.2, -fh); tri.lineTo(r - 0.4, -bd); tri.lineTo(r - 0.4, top - y0 + 0.3);
  const tg = new THREE.ExtrudeGeometry(tri, { depth: 1.7, bevelEnabled: false }); tg.translate(0, 0, -0.85);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    C(g, r, 1.35, top - 0.8, sx * lx, 0.8 + (top - 0.8) / 2, sz * lz, M, 28);
    C(g, 1.1, 1.1, 0.8, sx * lx, 0.4, sz * lz, pad, 12);
    add(g, tg, M, sx * lx, y0, sz * lz).scale.x = -sx;
  }
  return g;
}
function buildVChair(it) { // 依正面、背面、側面照：一體成型曲面皮面座椅＋外斜木腳，後腳在椅背上段交會成倒 V
  const g = new THREE.Group(), { w, d, h } = it;
  const S = fabMat(it), L = surfMat('wood', it.color2), pad = mat('#2b2b2b', 0.8);
  const seatH = Math.min(45, h * 0.54), tilt = 0.26, sz0 = -d / 2 + 13;
  // 側面輪廓中心線（z, y）：前緣 → 微凹坐面 → 大弧轉角 → 後傾椅背
  const topZ = sz0 - 1.5 - Math.sin(tilt) * (h - seatH - 12);
  const path = new THREE.SplineCurve([
    new THREE.Vector2(d / 2 - 2.5, seatH - 2.2), new THREE.Vector2(d / 2 - 12, seatH - 3.3), new THREE.Vector2(0, seatH - 3.9),
    new THREE.Vector2(sz0 + 9, seatH - 3.2), new THREE.Vector2(sz0 + 2.5, seatH + 1.5), new THREE.Vector2(sz0 - 1.5, seatH + 12),
    new THREE.Vector2(topZ, h - 2.6),
  ]).getSpacedPoints(90);
  const N = path.length, up = [], lo = [];
  const thick = u => 6.2 - 1.8 * u;                         // 前緣較厚、往椅背漸薄
  const tan = i => { const a = path[Math.max(0, i - 1)], b = path[Math.min(N - 1, i + 1)]; return new THREE.Vector2(b.x - a.x, b.y - a.y).normalize(); };
  for (let i = 0; i < N; i++) {
    const t = tan(i), n = new THREE.Vector2(-t.y, t.x), hw = thick(i / (N - 1)) / 2;
    up.push(path[i].clone().addScaledVector(n, -hw)); lo.push(path[i].clone().addScaledVector(n, hw));
  }
  const cap = (i, dirSign) => { // 兩端半圓收邊
    const t = tan(i).multiplyScalar(dirSign), n = new THREE.Vector2(-tan(i).y, tan(i).x), hw = thick(i / (N - 1)) / 2, out = [];
    for (let k = 1; k < 8; k++) { const a = Math.PI * k / 8; out.push(path[i].clone().addScaledVector(n, -Math.cos(a) * hw).addScaledVector(t, Math.sin(a) * hw)); }
    return out;
  };
  const outline = [...up, ...cap(N - 1, 1), ...lo.reverse(), ...cap(0, -1).reverse()];
  const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(-p.x, p.y)));
  const shellGeo = new THREE.ExtrudeGeometry(shape, { depth: w - 4, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.6, bevelSegments: 5, curveSegments: 4 });
  const shell = add(g, shellGeo, S, -w / 2 + 2, 0, 0); shell.rotation.y = Math.PI / 2;
  // 後腳：由地面往後斜上，交會在椅背上段背後成倒 V
  const ay = seatH + (h - seatH) * 0.72, k = (ay - (seatH + 12)) / (h - 2.6 - (seatH + 12));
  const backZ = (sz0 - 1.5) + (topZ - (sz0 - 1.5)) * k;
  const apex = new V3(0, ay, backZ - 2.5 - 2);
  const footX = w / 2 - 2.5, footZ = -d / 2 + 1.5;
  // 座下木框：後橫木只在兩支後腳之間，兩側木框斜接到前腳（依背面照）
  const fy = seatH - 9.5, zfr = d / 2 - 9, fxr = w / 2 - 6;
  const t = (fy - 0.8) / (ay - 0.8), rx = footX * (1 - t) - 1.2, rz = footZ + (apex.z - footZ) * t;
  const beam = (x1, z1, x2, z2) => { const len = Math.hypot(x2 - x1, z2 - z1), m = B(g, 2.5, 4.5, len, (x1 + x2) / 2, fy, (z1 + z2) / 2, L); m.rotation.y = Math.atan2(x2 - x1, z2 - z1); };
  B(g, 2 * rx, 4.5, 2.5, 0, fy, rz, L);
  B(g, 2 * fxr, 4.5, 2.5, 0, fy, zfr, L);
  for (const s of [-1, 1]) beam(s * rx, rz, s * fxr, zfr);
  // 前腳：由座框往前、往外斜到地面
  for (const s of [-1, 1]) {
    rod(g, new V3(s * fxr, fy + 2, zfr), new V3(s * (w / 2 - 2.5), 0.8, d / 2 - 1.5), 1.9, L);
    C(g, 1.5, 1.5, 0.8, s * (w / 2 - 2.5), 0.4, d / 2 - 1.5, pad, 12);
  }
  for (const s of [-1, 1]) {
    rod(g, new V3(s * (w / 2 - 2.5), 0.8, -d / 2 + 1.5), apex, 1.9, L);
    C(g, 1.5, 1.5, 0.8, s * (w / 2 - 2.5), 0.4, -d / 2 + 1.5, pad, 12);
  }
  add(g, new THREE.SphereGeometry(2.7, 16, 12), L, apex.x, apex.y, apex.z);
  return g;
}
function buildDollChair(it) { // 娃娃餐椅：一體成型的皮革椅殼——坐墊厚、前緣圓，兩側從坐面往後一路包上去變成椅背，椅背在腰的位置內縮、往上又放寬，整圈邊緣一條滾邊；內側（坐面＋椅背正面）和外側（椅底＋椅背背面）各一色。椅背正面腰部一道橫車線，背面正中一道直縫線加拉鍊；黑色金屬錐形腳微微外張，接在座下的方框上
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), F2 = fabMat(it, 'color2'), M = surfMat('metal', it.color3 || '#1e1e20'), Gl = mat('#8d8d8d', 0.6), Zp = mat('#141414', 0.7);
  const sx = w / 48.6, sy = h / 83.65, sz = d / 48.65;
  // 從坐墊前緣（0）沿著椅殼到椅背頂（1）的十三個斷面：內側中線 z,y｜邊緣 x,y,z｜外側中線 z,y｜內、外側橫向的飽滿程度
  const ST = [
    [22.6, 37.0, 17.0, 37.0, 22.6, 22.6, 37.0, 6, 8],
    [24.3, 41.0, 21.2, 37.1, 21.2, 21.8, 35.6, 6, 8],
    [23.2, 44.6, 22.8, 37.5, 17.0, 18.0, 35.0, 6, 8],
    [17.0, 45.5, 22.9, 38.6, 9.0, 10.0, 34.9, 6, 8],
    [5.0, 45.0, 23.0, 41.0, 0.0, 0.0, 34.9, 5, 8],
    [-6.0, 44.8, 23.4, 45.6, -7.5, -10.0, 35.0, 3.5, 8],
    [-12.5, 46.0, 23.2, 50.5, -12.0, -17.5, 35.4, 2.6, 7],
    [-15.6, 50.5, 21.8, 56.0, -13.6, -20.6, 37.8, 2.4, 5],
    [-17.2, 58.5, 20.3, 60.5, -14.6, -21.5, 50.0, 2.4, 3],
    [-19.0, 68.0, 22.3, 66.5, -16.6, -22.6, 62.0, 2.4, 3],
    [-20.6, 76.5, 23.6, 75.0, -19.4, -23.6, 72.5, 2.4, 3],
    [-21.4, 80.6, 23.7, 79.6, -20.8, -24.1, 79.6, 2.6, 3],
    [-22.1, 82.4, 22.6, 82.0, -21.5, -23.9, 82.1, 2.8, 3],
    [-22.6, 82.95, 19.0, 82.95, -22.1, -22.6, 82.95, 3, 3],
  ], NS = ST.length - 1;
  const cur = fn => new THREE.CatmullRomCurve3(ST.map(fn), false, 'centripetal');
  const cC = cur(q => new V3(0, q[1], q[0])), cE = cur(q => new V3(q[2], q[3], q[4])), cO = cur(q => new V3(0, q[6], q[5]));
  const lin = (t, k) => { const f = t * NS, i = Math.min(NS - 1, Math.floor(f)); return ST[i][k] + (ST[i + 1][k] - ST[i][k]) * (f - i); };
  const gs = (a, s) => Math.exp(-((a / s) ** 2));
  const shell = (out, nu, nt) => { const pos = [], uv = [], idx = [];
    for (let j = 0; j <= nt; j++) { const t = j / nt, e = cE.getPoint(t), c = (out ? cO : cC).getPoint(t), n = lin(t, out ? 8 : 7);
      for (let i = 0; i <= nu; i++) { const u = i / nu * 2 - 1, f = 1 - Math.pow(Math.abs(u), n); let y = e.y + (c.y - e.y) * f, z = e.z + (c.z - e.z) * f, x = e.x * u;
        if (!out) { const q = Math.min(1, Math.max(0, (5.5 - t * NS) / 2)); x += Math.sign(u) * 2.4 * Math.min(1, t * NS) * q * q * (3 - 2 * q) * 4 * f * (1 - f); }   // 坐墊兩側比滾邊再鼓出來一點
        if (!out) { const k = 1 - u ** 4, a = gs(t - 8 / NS, 0.007), b = gs(t - (6.1 - 1.1 * u * u) / NS, 0.007), lum = t * NS > 6.1 && t * NS < 8 ? Math.sin(Math.PI * (t * NS - 6.1) / 1.9) : 0, up = t * NS > 8 ? Math.sin(Math.PI * Math.min(1, (t * NS - 8) / 3.6)) : 0;
          z += k * (0.7 * lum + 0.5 * up - 0.7 * a - 0.45 * b); y -= k * 0.55 * b;
          const pb = Math.min(1, Math.max(0, (t * NS - 6.5) / 1.5)); z += 1.8 * pb * pb * (3 - 2 * pb) * Math.sqrt(Math.min(1, (NS - t * NS) / 0.6)) * (1 - Math.pow(Math.abs(u), 12)); }   // 椅背的泡棉：邊緣一進來就鼓起，比滾邊厚一截                      // 腰部橫車線、坐面後緣的 U 形車線，車線之間的皮面微微鼓起
        pos.push(x * sx, y * sy, z * sz); uv.push(e.x * u / 40, t * 3); } }
    for (let j = 0; j < nt; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e2 = c + 1; out ? idx.push(a, c, b, b, c, e2) : idx.push(a, b, c, b, e2, c); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; };
  add(g, shell(false, 40, 220), F, 0, 0, 0);
  add(g, shell(true, 32, 120), F2, 0, 0, 0);
  // 滾邊：沿著整圈邊緣
  const loop = [], ep = (t, sd) => { const e = cE.getPoint(t); return new V3(sd * e.x * sx, e.y * sy, e.z * sz); };
  for (let i = 0; i <= 90; i++) loop.push(ep(i / 90, 1));
  for (let i = 90; i >= 0; i--) loop.push(ep(i / 90, -1));
  add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true, 'centripetal'), 360, 0.45, 8, true), F2, 0, 0, 0);
  // 背面正中的縫線與拉鍊
  const spine = (t0, t1, r, m, off) => { const pts = []; for (let i = 0; i <= 30; i++) { const c = cO.getPoint((t0 + (t1 - t0) * i / 30) / NS); pts.push(new V3(0, c.y * sy, (c.z - off) * sz)); } add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 6, false), m, 0, 0, 0); };
  spine(6.7, 12.9, 0.14, F2, 0.02); spine(7.25, 10.7, 0.14, Zp, 0.06);
  // 座下方框與四支錐形腳：上粗下細，離地一小段再收細一階，腳底塑膠墊
  const fy = 33.8 * sy, fx = 16.2 * sx, zf = 15.5 * sz, zb = -13.5 * sz, bx = 15.4 * sx;
  B(g, 2 * fx, 1.6, 2.2, 0, fy, zf, M); B(g, 2 * bx, 1.6, 2.2, 0, fy, zb, M);
  for (const sd of [-1, 1]) { const m = B(g, 2.2, 1.6, Math.hypot(zf - zb, fx - bx), sd * (fx + bx) / 2, fy, (zf + zb) / 2, M); m.rotation.y = sd * Math.atan2(fx - bx, zf - zb); }
  B(g, 2 * bx - 2, 1.2, zf - zb, 0, fy + 1.1, (zf + zb) / 2, Zp);                                       // 椅殼底下的底板
  const leg = (a, b) => { const dir = new V3().subVectors(b, a), len = dir.length(), q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir.clone().normalize()), k = Math.min(0.3, 9 / len), mid = a.clone().addScaledVector(dir, k);
    const seg = (p0, p1, r0, r1, m) => { const c = add(g, new THREE.CylinderGeometry(r1, r0, p0.distanceTo(p1), 16), m, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2); c.quaternion.copy(q); };
    seg(a.clone().addScaledVector(dir, 0.6 / len), mid, 0.82, 0.98, M); seg(mid, b, 1.2, 1.6, M); seg(a, a.clone().addScaledVector(dir, 0.6 / len), 0.7, 0.7, Gl); };
  for (const sd of [-1, 1]) { leg(new V3(sd * 18 * sx, 0.25, 19.3 * sz), new V3(sd * fx, fy + 0.6, zf)); leg(new V3(sd * 17.4 * sx, 0.25, -21.3 * sz), new V3(sd * bx, fy + 0.6, zb)); }
  return g;
}
function buildCY127Chair(it) { // CY127 餐椅：厚坐墊（前寬後窄、後緣圓，側邊一圈車線）＋一片往前包的椅背殼。椅背正面是內側皮革，上窄下寬，兩側往前收成尖尖的翼尖；翼尖以下往內勾回去，變成兩支細頸接到坐墊後角，中間留一個拱形的鏤空。背面與側緣是外側皮革，一路往下包住坐墊後角。椅背正中一道雙車線；金屬腳前後外張
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), F2 = fabMat(it, 'color2'), M = surfMat('metal', it.color3 || '#1c1c1e'), Gl = mat('#2a2a2a', 0.7), Zp = mat('#161616', 0.8);
  const sx = w / 43.7, sy = h / 84.25, sz = d / 56.05, sm = q => { q = Math.min(1, Math.max(0, q)); return q * q * (3 - 2 * q); };
  const mesh = (pos, uv, idx, m) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return add(g, geo, m, 0, 0, 0); };
  // 坐墊：外框（前寬後窄、後緣圓）往內縮出側面的輪廓
  const ZC = 3.77, NA = 96, ring = a => { const c = Math.cos(a), s = Math.sin(a), n = s > 0 ? 7 : 3, zr = Math.sign(s) * Math.pow(Math.abs(s), 2 / n); return [22.5 * Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * (1 - 0.07 * (1 - zr)), ZC + 24.25 * zr]; };
  { const prof = [[2.6, 37], [0.7, 37.5], [0.1, 38.8], [0, 42.5], [0.28, 42.85], [0, 43.2], [0.3, 44.3], [1.2, 44.95], [3.5, 45.3], [9, 45.5]], pos = [], uv = [], idx = [];
    prof.forEach(([ins, y]) => { for (let i = 0; i < NA; i++) { const q = ring(i / NA * Math.PI * 2), x = q[0] * (1 - ins / 22.5), z = ZC + (q[1] - ZC) * (1 - ins / 24.25); pos.push(x * sx, y * sy, z * sz); uv.push(x / 40, z / 40); } });
    for (let k = 0; k < prof.length - 1; k++) for (let i = 0; i < NA; i++) { const a = k * NA + i, b = k * NA + (i + 1) % NA; idx.push(a, a + NA, b, b, a + NA, b + NA); }
    const c0 = pos.length / 3; pos.push(0, 45.55 * sy, ZC * sz, 0, 37 * sy, ZC * sz); uv.push(0, ZC / 40, 0, ZC / 40);
    for (let i = 0; i < NA; i++) { idx.push((prof.length - 1) * NA + i, c0, (prof.length - 1) * NA + (i + 1) % NA); idx.push(i, (i + 1) % NA, c0 + 1); }
    mesh(pos, uv, idx, F); }
  const rear = []; for (let i = 0; i <= 120; i++) rear.push(ring(Math.PI * 1.5 + i / 120 * Math.PI / 2));
  const seatRear = x => { x = Math.min(18, Math.abs(x)); let i = 1; while (i < 120 && rear[i][0] < x) i++; const a = rear[i - 1], b = rear[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0] || 1); };
  // 椅背殼：每個 x 位置從下緣到上緣；平面上是往前彎的拋物線，最彎的地方在翼尖的高度
  const XT = 21, YT = 57, top = x => 82.6 + 1.5 * (x / 16) ** 2;
  const yTop = x => { const a = top(x), b = YT + (XT - x) / 5 * (84.1 - YT); return -1.2 * Math.log(Math.exp(-a / 1.2) + Math.exp(-b / 1.2)); };
  const hook = x => 45 + 12 * Math.pow(Math.max(0, x - 16) / 5, 1.6);
  const yBotIn = x => x < 12 ? 45 + 7 * Math.pow(1 - Math.pow(x / 12, 2.5), 0.5) : hook(x);
  const yBotOut = x => x < 11.5 ? yBotIn(x) : x < 18 ? 38.3 : hook(x);
  const zS = (x, y) => { const wv = sm((y - 45) / 9), t = Math.max(0, (y - 45) / 39.5), k = y > YT ? 0.036 - 0.015 * (y - YT) / 27.5 : 0.036; return (seatRear(x) - 0.4) * (1 - wv) + (seatRear(0) - 0.7 - 6.4 * Math.pow(t, 1.15) + k * x * x) * wv; };
  const xs = []; for (let i = 0; i <= 84; i++) xs.push((i / 84 * 2 - 1) * XT); for (const sd of [-1, 1]) for (const q of [11.49, 11.51, 12.01, 17.99, 18.01]) xs.push(sd * q); xs.sort((a, b) => a - b);   // 下緣有落差的地方多切兩刀，邊才會直
  const NX = xs.length - 1, NY = 40, pIn = [], pOut = [];
  for (let i = 0; i <= NX; i++) { const x = xs[i], ax = Math.abs(x), yt = yTop(ax); pIn.push([]); pOut.push([]);
    for (let j = 0; j <= NY; j++) { const v = j / NY;
      for (const out of [0, 1]) { const yb = out ? yBotOut(ax) : yBotIn(ax), y = yb + (yt - yb) * v, de = Math.min(Math.min(v, 1 - v) * (yt - yb), (XT - ax) * 1.2), pl = 1 - (1 - Math.min(1, de / 2.2)) ** 2;
        (out ? pOut : pIn)[i].push(out ? [x * 1.04, y, zS(x * 1.04, y) - 0.5 - 0.6 * pl] : [x, y, zS(x, y) + 0.5 + 2 * pl]); } } }
  const sheet = (P, front, m) => { const pos = [], uv = [], idx = []; for (let i = 0; i <= NX; i++) for (let j = 0; j <= NY; j++) { const q = P[i][j]; pos.push(q[0] * sx, q[1] * sy, q[2] * sz); uv.push(q[0] / 40, q[1] / 40); }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const a = i * (NY + 1) + j, b = a + NY + 1; front ? idx.push(a, b, a + 1, a + 1, b, b + 1) : idx.push(a, a + 1, b, a + 1, b + 1, b); }
    return mesh(pos, uv, idx, m); };
  sheet(pIn, true, F); sheet(pOut, false, F2);
  // 側緣：把正面和背面的邊接起來（外側皮革），正面邊緣再壓一條細滾邊
  const per = []; for (let i = 0; i <= NX; i++) per.push([i, 0]); for (let i = NX - 1; i > 0; i--) per.push([i, NY]);
  for (const fl of [0, 1]) { const pos = [], uv = [], idx = []; per.forEach(([i, j], k) => { for (const q of [pIn[i][j], pOut[i][j]]) { pos.push(q[0] * sx, q[1] * sy, q[2] * sz); uv.push(k / 40, 0); } });
    for (let k = 0; k < per.length; k++) { const a = 2 * k, b = 2 * ((k + 1) % per.length); fl ? idx.push(a, b, a + 1, a + 1, b, b + 1) : idx.push(a, a + 1, b, a + 1, b + 1, b); }
    mesh(pos, uv, idx, F2); }
  add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(per.map(([i, j]) => { const q = pIn[i][j]; return new V3(q[0] * sx, q[1] * sy, (q[2] - 0.1) * sz); }), true, 'centripetal'), 420, 0.3, 6, true), F2, 0, 0, 0);
  // 椅背正中的雙車線
  const St = mat('#' + new THREE.Color(it.color).multiplyScalar(0.8).getHexString(), 0.8);
  for (const sd of [-1, 1]) { const pts = []; for (let k = 0; k <= 24; k++) { const y = 52.6 + (yTop(0) - 0.6 - 52.6) * k / 24; pts.push(new V3(sd * 0.5 * sx, y * sy, (zS(0.5, y) + 2.52) * sz)); } add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.1, 5, false), St, 0, 0, 0); }
  // 座下底板、連桿與四支外張的金屬腳（扁圓管，上粗下細）
  const fy = 36.6 * sy, T = [[14.2 * sx, 18 * sz], [12.7 * sx, -9 * sz]], Ft = [[20 * sx, 26.4 * sz], [19.6 * sx, -26.6 * sz]];
  B(g, 30 * sx, 0.8, 31 * sz, 0, fy + 0.5, 4.5 * sz, Zp);
  for (const [tx, tz] of T) B(g, 2 * tx, 1.6, 2, 0, fy - 0.6, tz, M);
  for (const sd of [-1, 1]) { const m = B(g, 2, 1.6, Math.hypot(T[0][1] - T[1][1], T[0][0] - T[1][0]), sd * (T[0][0] + T[1][0]) / 2, fy - 0.6, (T[0][1] + T[1][1]) / 2, M); m.rotation.y = sd * Math.atan2(T[0][0] - T[1][0], T[0][1] - T[1][1]);
    T.forEach(([tx, tz], k) => { const a = new V3(sd * Ft[k][0], 0.9, Ft[k][1]), b = new V3(sd * tx, fy, tz), dir = new V3().subVectors(b, a), lg = new THREE.CylinderGeometry(2.3, 1.3, dir.length(), 14);
      lg.scale(0.78, 1, 1); lg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir.clone().normalize())); lg.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); add(g, lg, M, 0, 0, 0); C(g, 0.8, 0.8, 0.9, a.x, 0.45, a.z, Gl, 10); }); }
  return g;
}
function buildMiyazakiChair(it) {
  const g = new THREE.Group(), { w, d, h } = it;
  const S = fabMat(it), L = surfMat('wood', it.color2), pad = mat('#2b2b2b', 0.8);
  const seatH = Math.min(46, h * 0.62), fh = 7, ft = 2.4;
  const fx = w / 2 - 3, zf = d / 2 - 3, zb = -d / 2 + 16;           // 座框前後位置
  const fy = seatH - 3 - fh / 2;
  // 座框
  B(g, 2 * fx, fh, ft, 0, fy, zf, L); B(g, 2 * fx, fh, ft, 0, fy, zb, L);
  for (const s of [-1, 1]) B(g, ft, fh, zf - zb, s * fx, fy, (zf + zb) / 2, L);
  // 皮面坐墊（中間微凹，嵌在座框上）
  RB(g, 2 * fx - 1, 5, zf - zb + 1, 2.2, 0, seatH - 1.5, (zf + zb) / 2, S);
  // 前腳：直立、上粗下細，頂端與座框齊平並有圓形端面
  for (const s of [-1, 1]) {
    C(g, 2.3, 1.6, seatH - 3.8, s * fx, 0.8 + (seatH - 3.8) / 2, zf, L, 20);
    C(g, 1.4, 1.4, 0.8, s * fx, 0.4, zf, pad, 12);
  }
  // 後腳：直木件，地面（後）→ 往前上方到扶手前端
  const armY = Math.min(h - 13, 61), foot = -d / 2 + 8, top = -d / 2 + 25;
  // 弧形靠背參數（先算好，扶手末端要收在椅背後緣）
  const bw = 2 * fx + 5, bh = Math.min(26, h - armY + 12), bt2 = 5, cr = bh * 0.46, Rb = 42, tilt = 0.32;
  const cy = h - bh / 2 * Math.cos(tilt) - 0.5, cz = -d / 2 + 3 + Math.sin(tilt) * bh / 2 + 1.5;
  const bendZ = Rb * (1 - Math.cos(fx / Rb));                                  // 椅背在扶手位置向前彎的量
  const backRear = cz + bendZ - Math.sin(tilt) * (armY + 1 - cy) - bt2 / 2;  // 扶手高度處的椅背後緣
  const armEnd = backRear + 0.8;
  for (const s of [-1, 1]) {
    const x = s * fx;
    rod(g, new V3(x, 0.8, foot), new V3(x, armY, top), 2, L);
    C(g, 1.4, 1.4, 0.8, x, 0.4, foot, pad, 12);
    // 扶手：由後腳頂端往後伸，末端加寬貼住椅背側邊，不超出椅背
    const armLen = top - armEnd;
    RB(g, 4, 3.4, armLen, 1.4, x, armY + 1, (top + armEnd) / 2, L);
    RB(g, 5, 5, 4, 1.6, x, armY + 0.8, armEnd + 2, L);
  }
  const bg = new THREE.BoxGeometry(bw, bh, bt2, 64, 8, 1), bp = bg.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    let x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    const ex = Math.abs(x) - (bw / 2 - cr);
    if (ex > 0) { const k = Math.sqrt(Math.max(0, 1 - (ex / cr) ** 2)); y *= k; z *= 0.55 + 0.45 * k; }
    const a = x / Rb;
    bp.setXYZ(i, Rb * Math.sin(a), y, z + Rb * (1 - Math.cos(a)));
  }
  bg.computeVertexNormals();
  const bk = add(g, bg, S, 0, cy, cz); bk.rotation.x = -tilt;
  return g;
}
function buildDanishBench(it) {
  const g = new THREE.Group(), { w, d, h } = it;
  const S = fabMat(it), L = surfMat('wood', it.color2), pad = mat('#3b3632', 0.8);
  const ct = Math.min(6, h * 0.14), ap = 7, frameTop = h - ct, fy = frameTop - ap / 2;
  const lt = 4.4, lb = 3;                                   // 腳頂、腳底寬度
  // 合成皮坐墊
  RB(g, w, ct, d, 1.6, 0, h - ct / 2, 0, S);
  // 木框：外緣與桌腳切齊
  for (const s of [-1, 1]) {
    B(g, w - 2 * lt, ap, 2, 0, fy, s * (d / 2 - 1), L);
    B(g, 2, ap, d - 2 * lt, s * (w / 2 - 1), fy, 0, L);
  }
  // 上粗下細的方腳（外側垂直、內側收細）
  const legH = frameTop - 0.6;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = add(g, new THREE.CylinderGeometry(lt / Math.SQRT2, lb / Math.SQRT2, legH, 4), L, 0, 0, 0);
    leg.rotation.y = Math.PI / 4;
    leg.position.set(sx * (w / 2 - lt / 2), 0.6 + legH / 2, sz * (d / 2 - lt / 2));
    C(g, 1.3, 1.3, 0.6, sx * (w / 2 - lt / 2), 0.3, sz * (d / 2 - lt / 2), pad, 12);
  }
  return g;
}
function buildTawuNight(it) { // 塔烏床頭櫃：圓形陶板桌面坐在黑色的底板上；兩片直立的實木側板（邊緣倒圓）夾著一個無把手抽屜，抽屜上方是開放的置物格
  const g = new THREE.Group(), { w, d, h } = it;
  const T = topMat(it), Wd = surfMat('wood', it.color2), Tr = mat(it.color3 || '#1b1b1c', 0.45, 0.35), Dk = mat('#0e0e0e', 0.9), Gl = mat('#161616', 0.6);
  const tt = Math.min(1, h * 0.03), trH = Math.min(2.4, h * 0.05), cr = Math.min(w, d) / 2 - 0.01;
  roundedTop(g, w, d, tt, h - tt, T, cr);                                  // 陶板桌面
  roundedTop(g, w - 0.5, d - 0.5, 0.45, h - tt - 0.45, Tr, cr - 0.25);     // 底板上緣：和陶板之間一道細溝
  { const c = C(g, 0.5, 0.455, trH, 0, h - tt - 0.45 - trH / 2, 0, Tr, 64); c.scale.set(w - 1.6, 1, d - 1.6); }   // 底板：往下收小的淺盤
  // 側板：左右各一片，前後緣倒圓，底下各兩顆調整腳
  const top = h - tt - 0.45 - trH, gl = 0.8, pt = Math.min(2.6, w * 0.055), px = w * 0.34, pd = d * 0.66;
  for (const sd of [-1, 1]) {
    RB(g, pt, top - gl, pd, 1.1, sd * (px - pt / 2), gl + (top - gl) / 2, 0, Wd);
    for (const z of [-1, 1]) C(g, 1.1, 1.1, gl, sd * (px - pt / 2), gl / 2, z * (pd / 2 - 3.2), Gl, 14);
  }
  // 抽屜櫃：夾在兩片側板中間；櫃頂是置物格的底，正面一整片無把手的抽屜面板（四周留細縫）
  const iw = 2 * (px - pt), by0 = h * 0.365, by1 = h * 0.61, bh = by1 - by0, bd = pd - 1.6;
  B(g, iw, bh, bd - 1.6, 0, by0 + bh / 2, -0.8, Wd);
  B(g, iw, 1.4, bd, 0, by1 - 0.7, 0, Wd);
  B(g, iw - 0.3, bh - 1.6, 0.6, 0, by0 + (bh - 1.4) / 2, bd / 2 - 1.5, Dk);
  RB(g, iw - 0.7, bh - 1.9, 1.5, 0.25, 0, by0 + (bh - 1.4) / 2, bd / 2 - 0.75, Wd);
  return g;
}
function buildLacquerNight(it) { // 烤漆床頭櫃：圓角的烤漆櫃身，檯面一圈凸起的邊框、陶板內嵌在裡面；正面整片是抽屜面板，往兩側繞過前面的圓角（側面、邊框上各一道接縫）；底下是深色實木腳架，四支往下收細的腳
  const g = new THREE.Group(), { w, d, h } = it;
  const T = topMat(it), L = surfMat('lacquer', it.color2), Wd = surfMat('wood', it.color3 || '#3b302b'), Dk = mat('#141414', 0.9);
  const baseH = h * 0.43, railH = Math.min(3.2, baseH * 0.2), gap = 0.9, by0 = baseH, bh = h - by0, rimH = Math.min(0.9, bh * 0.05), rimW = Math.min(2.6, w * 0.05), cr = Math.min(3.2, w * 0.07, d * 0.07);
  const rr = (sh, W, D, r) => { const x0 = -W / 2, y0 = -D / 2; sh.moveTo(x0 + r, y0); sh.lineTo(x0 + W - r, y0); sh.quadraticCurveTo(x0 + W, y0, x0 + W, y0 + r); sh.lineTo(x0 + W, y0 + D - r); sh.quadraticCurveTo(x0 + W, y0 + D, x0 + W - r, y0 + D); sh.lineTo(x0 + r, y0 + D); sh.quadraticCurveTo(x0, y0 + D, x0, y0 + D - r); sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0); return sh; };
  // 櫃身、檯面邊框、內嵌的陶板
  roundedTop(g, w, d, bh - rimH, by0, L, cr);
  { const sh = rr(new THREE.Shape(), w, d, cr); sh.holes.push(rr(new THREE.Path(), w - 2 * rimW, d - 2 * rimW, Math.max(0.6, cr - rimW * 0.6)));
    add(g, new THREE.ExtrudeGeometry(sh, { depth: rimH, bevelEnabled: false, curveSegments: 8 }), L, 0, h - rimH, 0).rotation.x = -Math.PI / 2; }
  roundedTop(g, w - 2 * rimW - 0.5, d - 2 * rimW - 0.5, 0.45, h - rimH - 0.02, T, Math.max(0.5, cr - rimW * 0.6));
  // 抽屜面板的接縫：兩側各一道直縫（面板繞過前面的圓角）、邊框上各一個缺口、底下一道橫縫
  const sz = d / 2 - Math.min(7, d * 0.15);
  for (const sd of [-1, 1]) { B(g, 0.12, bh - 0.6, 0.32, sd * (w / 2 - 0.03), by0 + bh / 2, sz, Dk); B(g, rimW + 0.1, rimH + 0.06, 0.4, sd * (w / 2 - rimW / 2), h - rimH / 2, sz, Dk); }
  // 腳架：櫃身和腳架之間內縮一圈陰影縫；橫桿在腳的上端，腳往下收細
  const fw = w - 2.4, fd = d - 2.4, ft = 3.2, legH = baseH - gap;
  B(g, fw - 3, gap, fd - 3, 0, baseH - gap / 2, 0, Dk);
  for (const sd of [-1, 1]) { RB(g, fw - ft, railH, 2, 0.5, 0, legH - railH / 2, sd * (fd / 2 - 1.2), Wd); RB(g, 2, railH, fd - ft, 0.5, sd * (fw / 2 - 1.2), legH - railH / 2, 0, Wd); }
  const lgeo = new THREE.CylinderGeometry(ft / Math.SQRT2, ft * 0.6 / Math.SQRT2, legH, 4, 1).toNonIndexed(); lgeo.rotateY(Math.PI / 4); lgeo.computeVertexNormals();
  { const P = lgeo.attributes.position; for (let i = 0; i < P.count; i++) { const k = (legH / 2 - P.getY(i)) / legH * ft * 0.2; P.setX(i, P.getX(i) + k); P.setZ(i, P.getZ(i) + k); } lgeo.computeVertexNormals(); }   // 外側兩面保持垂直，只收內側
  for (const sx of [-1, 1]) for (const sz2 of [-1, 1]) add(g, lgeo, Wd, sx * (fw / 2 - ft / 2), legH / 2, sz2 * (fd / 2 - ft / 2)).scale.set(sx, 1, sz2);
  return g;
}
const DESK_SIDE_OPT = { key: 'side', label: '抽屜位置', list: [opt('left', '抽屜在左'), opt('right', '抽屜在右')] };
function buildDaliDesk(it) { // 大理書桌：厚實木桌面；一側吊著三抽的抽屜櫃（木頭櫃身、烤漆抽屜面板、每個抽屜正中一支直立的金屬把手），櫃子底下是一個方管金屬框腳；另一側是到桌面的方管金屬框腳（預設抽屜在右，選左時鏡射）
  const g = new THREE.Group(), { w, d, h } = it;
  const Wd = surfMat('wood', it.color), L = surfMat('lacquer', it.color2), M = surfMat('metal', it.color3 || '#1d1e21'), Dk = mat('#101010', 0.9), Gl = mat('#141414', 0.7);
  const tt = Math.min(5, h * 0.07), top = h - tt, tw = 4.5, tk = 2.5, gl = 0.4;                        // 桌面厚度；方管：寬 4.5、厚 2.5；腳墊高度
  RB(g, w, tt, d, 0.5, 0, top + tt / 2, 0, Wd);
  // 抽屜櫃：吊在桌面下，和桌面之間內縮一道陰影縫
  const cw = Math.min(46, w * 0.31), cd = d - 5, gap = 1.6, cy1 = top - gap, cy0 = Math.max(12, h * 0.25), ch = cy1 - cy0, cx = w / 2 - cw / 2 - 1.5, zf = cd / 2;
  B(g, cw - 2.4, gap, cd - 2.4, cx, top - gap / 2, 0, Dk);
  B(g, cw, ch, cd - 1.9, cx, cy0 + ch / 2, -0.95, Wd);
  const dh = ch / 3;
  for (let i = 0; i < 3; i++) { const y = cy0 + dh * (i + 0.5);
    B(g, cw - 0.2, dh - 0.2, 0.5, cx, y, zf - 1.7, Dk);                                               // 抽屜之間的細縫
    RB(g, cw - 0.5, dh - 0.7, 1.7, 0.3, cx, y, zf - 0.85, L);
    RB(g, tw, dh - 1.6, 1.5, 0.35, cx, y, zf + 0.6, M);                                               // 把手：直立的金屬扁條
  }
  // 方管框腳：一個立著的長方形框（前後各一支立柱、地上一支橫桿、上面一支橫桿）
  const frame = (x, yTop, len) => { const zc = (zf + 1.35 - tk / 2) - len / 2 + 0;
    B(g, tw, tk, len, x, gl + tk / 2, zc, M); B(g, tw, tk, len - 2 * tk, x, yTop - tk / 2, zc, M);
    for (const sd of [-1, 1]) { B(g, tw, yTop - gl, tk, x, gl + (yTop - gl) / 2, zc + sd * (len / 2 - tk / 2), M); C(g, 0.9, 0.9, gl, x, gl / 2, zc + sd * (len / 2 - 3), Gl, 10); }
  };
  frame(cx, cy0, cd - 3);                                                                              // 抽屜櫃底下：前立柱正好接在把手下面
  frame(-(w / 2 - tw / 2 - 2.5), top, cd - 3);
  return mirrorIfLeft(it, g);
}
function buildEggerDesk(it) { // 艾格書桌：厚實木桌面；一側吊著兩抽的抽屜櫃（深色木櫃身、胡桃木抽屜面板上小下大，偏一邊各一支直立的金屬方條把手），細方管金屬腳架：櫃子底下一個矮框、另一側一個到桌面的高框，兩個框之間地上一支橫桿相連（預設抽屜在右，選左時鏡射）
  const g = new THREE.Group(), { w, d, h } = it;
  const Wd = surfMat('wood', it.color), Wf = surfMat('wood', it.color2), M = surfMat('metal', it.color3 || '#1d1e21'), Dk = mat('#0e0e0e', 0.9), Gl = mat('#141414', 0.7);
  const tt = Math.min(5, h * 0.07), top = h - tt, tk = 2.5, gl = 0.5;
  RB(g, w, tt, d, 0.4, 0, top + tt / 2, 0, Wd);
  // 抽屜櫃：貼著桌面下緣；面板蓋在櫃身前面，上小下大
  const cw = Math.min(50, w * 0.33), cd = d - 6, cy0 = Math.max(12, h * 0.265), ch = top - 0.4 - cy0, cx = w / 2 - cw / 2 - 1, zf = cd / 2;
  B(g, cw - 0.6, ch, cd - 2.2, cx, cy0 + ch / 2, -1.1, Wd);
  B(g, cw - 1, ch - 0.6, 0.6, cx, cy0 + ch / 2, zf - 2.1, Dk);
  const h1 = ch * 0.63, h2 = ch - h1, hx = cx - cw / 2 + cw * 0.76;
  for (const [y0, hh] of [[cy0, h1], [cy0 + h1, h2]]) {
    RB(g, cw, hh - 0.6, 1.8, 0.25, cx, y0 + hh / 2, zf - 0.9, Wf);
    RB(g, 3, hh - 0.9, 2.6, 0.4, hx, y0 + hh / 2, zf + 1.3, M);                                       // 把手：直立的金屬方條，和下面的前腳連成一直線
  }
  // 腳架：細方管
  const zF = zf + 1.3, zB = -cd / 2 + 2, len = zF - zB + tk, zc = (zF + zB) / 2, xl = -(w / 2 - Math.min(12, w * 0.08));
  const loop = (x, yTop) => { B(g, tk, tk, len, x, gl + tk / 2, zc, M); B(g, tk, tk, len - 2 * tk, x, yTop - tk / 2, zc, M);
    for (const z of [zF, zB]) { B(g, tk, yTop - gl, tk, x, gl + (yTop - gl) / 2, z, M); C(g, 0.6, 0.6, gl, x, gl / 2, z, Gl, 8); } };
  loop(hx, cy0); loop(xl, top);
  B(g, hx - xl - tk, tk, tk, (hx + xl) / 2, gl + tk / 2, zc, M);                                       // 地上連接兩個框的橫桿
  return mirrorIfLeft(it, g);
}
const VAN_SIDE_OPT = { key: 'side', label: '櫃子位置', list: [opt('left', '櫃子在左'), opt('right', '櫃子在右')] };
const VAN_MIRROR_OPT = { key: 'mir', label: '鏡子', list: [opt('on', '放鏡子'), opt('off', '不放')] };
function buildHemingwayVanity(it) { // 海明威化妝台：烤漆檯面是一顆「膠囊」（兩端半圓，正面兩個抽屜、圓鈕把手），一端疊在圓角的烤漆櫃子上（上小下大兩個抽屜，下抽是鑰匙孔形把手），櫃子底下兩支金色矮框腳；另一端是並排兩個金色方管高框腳；檯面中間靠後立一面金框圓鏡（預設櫃子在右，選左時鏡射；h 含鏡子）
  const g = new THREE.Group(), { w, d, h } = it;
  const L = surfMat('lacquer', it.color), M = surfMat('metal', it.color2 || '#c9a659'), Dk = mat('#1a1a1a', 0.9), Gl = mat('#161616', 0.7);
  const tH = h * 76 / 126, uh = tH * 13 / 76, yb = tH - uh, uw = w * 121 / 140, cwid = w * 48 / 140, kn = 2.9, bd = d - kn, bz = -kn / 2, zf = d / 2 - kn;   // 把手凸出 kn：櫃身往後讓，整體深度才會剛好是 d
  const rrs = (W, H2, r) => { const sh = new THREE.Shape(), x0 = -W / 2, y0 = -H2 / 2; sh.moveTo(x0 + r, y0); sh.lineTo(x0 + W - r, y0); sh.absarc(x0 + W - r, y0 + r, r, -Math.PI / 2, 0); sh.lineTo(x0 + W, y0 + H2 - r); sh.absarc(x0 + W - r, y0 + H2 - r, r, 0, Math.PI / 2); sh.lineTo(x0 + r, y0 + H2); sh.absarc(x0 + r, y0 + H2 - r, r, Math.PI / 2, Math.PI); sh.lineTo(x0, y0 + r); sh.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5); return sh; };
  const slab = (W, H2, r, dep, x, y, z, m) => { const geo = new THREE.ExtrudeGeometry(rrs(W, H2, r), { depth: dep, bevelEnabled: false, curveSegments: 16 }), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 60, uv.getY(i) / 60); geo.translate(0, 0, -dep / 2); return add(g, geo, m, x, y, z); };
  const knob = (x, y, z) => { C(g, 0.5, 0.5, 1.6, x, y, z + 0.8, M, 10).rotation.x = Math.PI / 2; C(g, 1.5, 1.3, 0.9, x, y, z + 2, M, 20).rotation.x = Math.PI / 2; };
  // 檯面：膠囊形的抽屜箱
  const ux = -w / 2 + uw / 2, ur = uh / 2 - 0.01;
  slab(uw, uh, ur, bd, ux, yb + uh / 2, bz, L);
  { const fl = uw - 2 * ur - 1.5, fh = uh - 3.2, fw = (fl - 0.5) / 2;
    B(g, fl + 0.5, fh + 0.5, 0.12, ux, yb + uh / 2, zf + 0.03, Dk);
    for (const sd of [-1, 1]) { RB(g, fw, fh, 0.6, 0.15, ux + sd * (fw / 2 + 0.25), yb + uh / 2, zf + 0.2, L); knob(ux + sd * (fw / 2 + 0.25), yb + uh / 2, zf + 0.5); } }
  // 櫃子：圓角的筒狀櫃身，正面一圈細框，裡面上小下大兩片抽屜面板
  const legc = Math.min(8, tH * 0.11), ch = yb - 0.3 - legc, cx = w / 2 - cwid / 2, cy = legc + ch / 2, cr = Math.min(6.5, cwid * 0.14);
  slab(cwid, ch, cr, bd, cx, cy, bz, L);
  slab(cwid - 1.8, ch - 1.8, cr - 0.9, 0.14, cx, cy, zf + 0.03, Dk);
  { const pw = cwid - 2.6, ph = ch - 2.6, h2 = ph * 0.32, geoF = (y0, y1) => { const sh = rrs(pw, ph, cr - 1.3), geo = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false, curveSegments: 12 }), P = geo.attributes.position; for (let i = 0; i < P.count; i++) P.setY(i, Math.min(y1, Math.max(y0, P.getY(i)))); geo.computeVertexNormals(); return geo; };
    add(g, geoF(ph / 2 - h2 + 0.25, ph / 2), L, cx, cy, zf);  add(g, geoF(-ph / 2, ph / 2 - h2 - 0.25), L, cx, cy, zf);
    knob(cx, cy + ph / 2 - h2 / 2, zf + 0.5);
    const ky = cy - h2 / 2 + 1.5; C(g, 1.6, 1.6, 0.9, cx, ky, zf + 1.4, M, 20).rotation.x = Math.PI / 2; RB(g, 1.3, 4.6, 0.9, 0.4, cx, ky - 2.6, zf + 1.4, M); C(g, 0.5, 0.5, 1, cx, ky, zf + 0.7, M, 8).rotation.x = Math.PI / 2; }   // 鑰匙孔形把手
  // 腳：方管框（前後各一支立柱、地上和上面各一支橫桿）
  const loop = (x, yTop, len, tk) => { const gl = 0.4; B(g, tk, tk, len, x, gl + tk / 2, bz, M); B(g, tk, tk, len - 2 * tk, x, yTop - tk / 2, bz, M);
    for (const sd of [-1, 1]) { B(g, tk, yTop - gl, tk, x, gl + (yTop - gl) / 2, bz + sd * (len / 2 - tk / 2), M); C(g, 0.6, 0.6, gl, x, gl / 2, bz + sd * (len / 2 - 3), Gl, 8); } };
  for (const sd of [-1, 1]) loop(cx + sd * (cwid / 2 - 7), legc, d - 9, 2.6);
  for (const k of [0, 1]) loop(-w / 2 + 9 + k * 4.4, yb + 0.6, d - 12, 2.2);
  // 鏡子：金色底板＋拱形立片夾住一面金框圓鏡
  if (it.mir !== 'off') {
    const sc = Math.max(0.5, (h - tH) / 50), R = 22 * sc, mz = -d / 2 + Math.min(11, d * 0.2), my = tH + 6 * sc + R;
    B(g, 16 * sc, 0.8, 9 * sc, ux, tH + 0.4, mz, M);
    B(g, 7 * sc, 6.5 * sc, 1.2, ux, tH + 0.8 + 3.25 * sc, mz + 1.6, M); C(g, 3.5 * sc, 3.5 * sc, 1.2, ux, tH + 0.8 + 6.5 * sc, mz + 1.6, M, 24).rotation.x = Math.PI / 2;
    B(g, 3 * sc, 6 * sc, 2.2, ux, tH + 0.8 + 3 * sc, mz - 0.4, M);
    C(g, R, R, 2.6, ux, my, mz, M, 64).rotation.x = Math.PI / 2;
    C(g, R - 0.8, R - 0.8, 0.3, ux, my, mz + 1.25, MIRROR, 64).rotation.x = Math.PI / 2;
  }
  return mirrorIfLeft(it, g);
}
function buildPuffStool(it) { // 泡芙化妝椅：圓筒形的布面椅身坐在深色圓底座上，圓坐墊跳色、邊緣一圈滾邊；矮椅背從椅身後面一路包上來，越往上越寬、往後仰，內側跳色有三道直車線，外側正中一道交叉縫線
  const g = new THREE.Group(), { w, d, h } = it;
  const F = fabMat(it), F2 = fabMat(it, 'color2'), Bs = mat(it.color3 || '#4a3f3a', 0.55, 0.3), Gl = mat('#161616', 0.7), St = mat('#6b2f33', 0.8);
  const R = Math.min(w / 2 - 1.5, d * 0.43), zc = d / 2 - R, st = Math.min(45, h * 0.7), pb = Math.min(4, h * 0.06);
  // 底座、圓筒椅身、坐墊
  C(g, R - 2.6, R - 2.6, pb, 0, 0.5 + pb / 2, zc, Bs, 48); for (let i = 0; i < 4; i++) C(g, 0.9, 0.9, 0.5, (R - 6) * Math.cos(i * Math.PI / 2 + 0.6), 0.25, zc + (R - 6) * Math.sin(i * Math.PI / 2 + 0.6), Gl, 8);
  const lathe = (pts, m) => add(g, new THREE.LatheGeometry(pts.map(q => new THREE.Vector2(q[0], q[1])), 64), m, 0, 0, zc);
  lathe([[R - 2.6, pb + 0.3], [R - 0.9, pb + 0.7], [R - 0.15, pb + 2], [R, pb + 4.5], [R, st - 3.2], [R - 0.3, st - 1.8], [R - 1.2, st - 1.2], [0, st - 1.2]], F);
  lathe([[R - 0.8, st - 1.6], [R - 0.7, st - 1.1], [R - 1.4, st - 0.35], [R - 3, st], [0, st]], F2);
  add(g, new THREE.TorusGeometry(R - 0.45, 0.48, 8, 72), F, 0, st - 1.45, zc).rotation.x = Math.PI / 2;      // 坐墊邊的滾邊
  // 椅背：角度 u（-1～1）× 高度 v（0＝底座上緣、1＝頂）的曲面
  const y0 = pb + 0.8, rB = R + 1.1, rT = d / 2 + zc, aT = Math.asin(Math.min(0.98, (w / 2 - 0.7) / rT)), e = t => t * t * (3 - 2 * t);
  const Hu = u => h - 0.8 - Math.min(6, h * 0.09) * Math.pow(Math.abs(u), 5);
  const shape = (u, v) => { const y = y0 + v * (Hu(u) - y0), t = Math.max(0, (y - st) / (Hu(u) - st)), A = y < st ? 0.6 + 0.42 * Math.pow((y - y0) / (st - y0), 1.4) : 1.02 + (aT - 1.02) * e(Math.min(1, t)); return { y, a: u * A, r: rB + (rT - rB) * Math.pow(Math.min(1, t), 1.25), t }; };
  const grid = (nu, nv, fn, flip) => { const pos = [], uv = [], idx = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const q = fn(i / nu * 2 - 1, j / nv); pos.push(q[0], q[1], q[2]); uv.push(q[0] / 40, q[1] / 40); }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e2 = c + 1; flip ? idx.push(a, c, b, b, c, e2) : idx.push(a, b, c, b, e2, c); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; };
  const P = (a, y, r) => [r * Math.sin(a), y, zc - r * Math.cos(a)];
  add(g, grid(48, 28, (u, v) => { const q = shape(u, v); return P(q.a, q.y, q.r); }, true), F, 0, 0, 0);                      // 外側
  const v0 = (st - 2 - y0) / (h - y0);
  add(g, grid(72, 20, (u, v) => { const q = shape(u, v0 + v * (1 - v0)), th = 3.4 * (1 - Math.pow(Math.abs(u), 6)) * Math.min(1, (1 - v) * 9 + 0.12) + 0.5;
    let gr = 0; for (const su of [-0.5, 0, 0.5]) gr += Math.exp(-(((u - su) * q.r * 0.9 / 0.55) ** 2)); return P(q.a, q.y, q.r - th + 0.55 * gr); }, false), F2, 0, 0, 0);   // 內側（跳色、三道車線）
  const edge = []; for (let i = 0; i <= 26; i++) { const q = shape(-1, i / 26); edge.push(new V3(...P(q.a, q.y, q.r - 0.25))); }
  for (let i = 1; i <= 40; i++) { const q = shape(-1 + i / 20, 1); edge.push(new V3(...P(q.a, q.y, q.r - 0.25))); }
  for (let i = 25; i >= 0; i--) { const q = shape(1, i / 26); edge.push(new V3(...P(q.a, q.y, q.r - 0.25))); }
  add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 160, 0.62, 8, false), F, 0, 0, 0);                           // 椅背邊緣的滾邊
  const sp = []; for (let i = 0; i <= 20; i++) { const q = shape(0, i / 20 * 0.985); sp.push(new V3(...P(0, q.y, q.r + 0.12))); }
  add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 40, 0.22, 6, false), St, 0, 0, 0);                             // 背後正中的交叉縫線
  return g;
}
function buildHeartTable(it) { // 愛心腳餐桌：酒桶形的陶板桌面（長邊微微外鼓、圓角）貼在黑色底板上，底下一圈金屬橫框；桌腳是兩片金屬帶從地上的底板兩端彎上來、在半空交叉（正面看像愛心），帶子在地面是整個深度寬，越往上越窄、一前一後錯開
  const g = new THREE.Group(), { w, d, h } = it;
  const T = topMat(it), M = surfMat('metal', it.color2), Bk = mat(it.color3 || '#1b1b1c', 0.5, 0.2);
  const tt = 1, ut = 1.7, ah = Math.min(5.5, h * 0.08), yU = h - tt - ut, yA = yU - ah;
  // 桌面：圓角長方形再把四邊往外鼓
  const slab = (W, D, th, y, m) => { const r = Math.min(9, D * 0.09), sh0 = new THREE.Shape(), x0 = -W / 2, z0 = -D / 2;
    sh0.moveTo(x0 + r, z0); sh0.lineTo(-x0 - r, z0); sh0.absarc(-x0 - r, z0 + r, r, -Math.PI / 2, 0); sh0.lineTo(-x0, -z0 - r); sh0.absarc(-x0 - r, -z0 - r, r, 0, Math.PI / 2); sh0.lineTo(x0 + r, -z0); sh0.absarc(x0 + r, -z0 - r, r, Math.PI / 2, Math.PI); sh0.lineTo(x0, z0 + r); sh0.absarc(x0 + r, z0 + r, r, Math.PI, Math.PI * 1.5);
    const pts = sh0.getSpacedPoints(160).map(q => new THREE.Vector2(q.x * (1 - 0.012 * (q.y / (D / 2)) ** 2), q.y * (1 - 0.085 * (q.x / (W / 2)) ** 2)));
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: th, bevelEnabled: false }), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + W / 2) / W, (uv.getY(i) + D / 2) / D);
    const mesh = add(g, geo, m, 0, y, 0); mesh.rotation.x = -Math.PI / 2; return mesh; };
  slab(w, d, tt, h - tt, T);
  slab(w - 0.8, d - 0.8, 0.5, h - tt - 0.5, Bk); slab(w - 2.6, d - 2.6, ut - 0.5, yU, Bk);        // 底板：上緣和陶板齊、往下內收一階
  // 橫框
  const aw = w * 0.71, ad = d * 0.5;
  for (const sd of [-1, 1]) { B(g, aw, ah, 2.2, 0, yA + ah / 2, sd * (ad / 2 - 1.1), M); B(g, 2.2, ah, ad - 4.4, sd * (aw / 2 - 1.1), yA + ah / 2, 0, M); }
  B(g, aw - 4, 1, ad - 4, 0, yU - 0.5, 0, Bk);
  // 桌腳：一片扭轉的金屬帶（四個面各自平滑、稜線銳利）
  const bx = Math.min(47, w * 0.2), zs = Math.min(22, d * 0.21), th = 2.6, tm = 1.22, A = (bx + bx * 0.74) / (1 - Math.cos(tm)), Y = yA / Math.sin(tm), N = 44;
  const ribbon = sg => { const ring = [];
    for (let i = 0; i <= N; i++) { const t = i / N, q = t * tm, x = -bx + A * (1 - Math.cos(q)), y = Y * Math.sin(q), tx = A * Math.sin(q), ty = Y * Math.cos(q), tl = Math.hypot(tx, ty), nx = -ty / tl, ny = tx / tl;
      const u = Math.min(1, Math.max(0, (t - 0.12) / 0.5)), e = u * u * (3 - 2 * u), za = -zs + (zs + 1.2) * e, zb = zs - 1.5 * e, k = th / 2 * (1 - 0.25 * t);
      ring.push([[x + nx * k, y + ny * k, za], [x + nx * k, y + ny * k, zb], [x - nx * k, y - ny * k, zb], [x - nx * k, y - ny * k, za]].map(([X, Yy, Z]) => [sg * X, Math.min(yA, Math.max(0, Yy)), sg * Z])); }
    const pos = [], idx = [];
    for (let f = 0; f < 4; f++) { const o = pos.length / 3; for (let i = 0; i <= N; i++) pos.push(...ring[i][f], ...ring[i][(f + 1) % 4]); for (let i = 0; i < N; i++) { const a = o + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    for (const [i, fl] of [[0, 0], [N, 1]]) { const o = pos.length / 3; for (const q of ring[i]) pos.push(...q); fl ? idx.push(o, o + 1, o + 2, o, o + 2, o + 3) : idx.push(o, o + 2, o + 1, o, o + 3, o + 2); }
    let vol = 0; for (let i = 0; i < idx.length; i += 3) { const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3; vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]); }
    if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const q = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = q; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
    add(g, geo, M, 0, 0, 0);
    const xe = sg * (-bx + A * (1 - Math.cos(tm))); B(g, 20, 1.2, zs - 1, xe - sg * 7, yA - 0.6, sg * (zs / 2 + 0.5), M);       // 接橫框的托片
  };
  ribbon(1); ribbon(-1);
  RB(g, 2 * bx + 1, 1.8, 2 * zs, 0.6, 0, 0.9, 0, M);                                                 // 地上的底板
  for (const sd of [-1, 1]) { const f = B(g, 9, 1.4, 2 * zs - 1, sd * (bx - 5), 2.6, 0, M); f.rotation.z = sd * 0.5; }   // 底板兩端往上翹、接到帶子上
  return g;
}
function buildOvalSideTable(it) {
  const g = new THREE.Group(), { w, d, h } = it;
  const T = topMat(it), M = surfMat('metal', it.color2), edge = mat('#6a6a6c', 0.6);
  const tt = 1.2, cr = Math.min(w, d) / 2 - 0.01;
  roundedTop(g, w, d, tt, h - tt, T, cr);                          // 陶板桌面
  roundedTop(g, w - 1, d - 1, 0.7, h - tt - 0.7, edge, cr - 0.5);  // 桌面下緣灰邊
  roundedTop(g, w * 0.95, d * 0.92, 1, 0, M, Math.min(w * 0.95, d * 0.92) / 2 - 0.01); // 金屬底板
  // 扁鐵立柱：在一端，底部彎折成平貼底板的腳
  const bw = 6, bt = 1.6, zc = -d / 2 + 9, top = h - tt - 0.7;
  B(g, bw, top - 1, bt, 0, 1 + (top - 1) / 2, zc, M);
  B(g, bw, bt, 14, 0, 1 + bt / 2, zc + 7 - bt / 2, M);
  const bend = C(g, bt * 1.2, bt * 1.2, bw, 0, 1 + bt * 1.2, zc + bt * 0.2, M, 12); bend.rotation.z = Math.PI / 2;
  B(g, bw + 4, 0.8, 12, 0, top - 0.4, zc + 5, M);                 // 桌面下的固定片
  return g;
}
function sqLeg(g, top, bot, t1, t2, m) { // 上粗下細的方腳，由 top 斜到 bot
  const dir = new V3().subVectors(top, bot), len = dir.length();
  const geo = new THREE.CylinderGeometry(t1 / Math.SQRT2, t2 / Math.SQRT2, len, 4); geo.rotateY(Math.PI / 4);
  const mesh = add(g, geo, m, (top.x + bot.x) / 2, (top.y + bot.y) / 2, (top.z + bot.z) / 2);
  mesh.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.normalize());
  return mesh;
}
function buildAshTable(it) {
  const g = new THREE.Group(), { w, d, h } = it, big = it.type === 'ownAshBig';
  const Wd = surfMat('wood', it.color), Cer = surfMat('slate', it.color2), glide = mat('#9a9a9c', 0.5);
  const R = w / 2, tt = 4.2, rim = big ? 2.2 : 2.6, Rin = R - rim, ez = d / w;
  // 木框：外緣上段垂直、下段往內斜切（旋轉輪廓）
  const prof = [[Rin, h - 1.4], [Rin, h], [R - 0.7, h], [R, h - 0.7], [R, h - 2.2], [R - 2.2, h - tt], [Rin - 3, h - tt], [Rin - 3, h - 1.4]].map(([r, y]) => new THREE.Vector2(r, y));
  const rimM = Wd.clone(); rimM.side = THREE.DoubleSide; rimM.userData.own = true;
  add(g, new THREE.LatheGeometry(prof, 64), rimM, 0, 0, 0).scale.z = ez;
  C(g, Rin - 2.9, Rin - 2.9, tt - 1.4, 0, h - tt + (tt - 1.4) / 2, 0, Wd, 48).scale.z = ez;       // 桌面底板
  C(g, Rin, Rin, 1.1, 0, h - 0.3 - 0.55, 0, Cer, 64).scale.z = ez;                                  // 內崁陶板（略低於木框）
  const legTopY = h - tt;
  if (big) {
    // 圓筒抽屜櫃：弧形抽屜面板位在前方兩支腳之間，四周留細縫、無外露把手
    const Ra = R * 0.55, ab = Math.min(11, h * 0.3), seam = mat('#3a3028', 0.8);
    C(g, Ra, Ra, ab, 0, legTopY - ab / 2, 0, Wd, 48).scale.z = ez;
    const dc = 0.70, dl = 1.92, dh = ab - 1.4, dy = legTopY - ab / 2;          // 抽屜中心角、弧長、高度
    const front = add(g, new THREE.CylinderGeometry(Ra + 0.5, Ra + 0.5, dh, 40, 1, false, dc - dl / 2, dl), Wd, 0, dy, 0); front.scale.z = ez;
    for (const a of [dc - dl / 2, dc + dl / 2]) B(g, 0.35, dh, 0.35, Math.sin(a) * (Ra + 0.55), dy, Math.cos(a) * (Ra + 0.55) * ez, seam);
    for (const yy of [dy - dh / 2, dy + dh / 2]) add(g, new THREE.CylinderGeometry(Ra + 0.56, Ra + 0.56, 0.3, 40, 1, true, dc - dl / 2, dl), seam, 0, yy, 0).scale.z = ez;
    // 3 支腳，每 120° 一支，上端接裙圍外側、往外斜到接近桌緣
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 + 0.35 + k * Math.PI * 2 / 3, cx = Math.cos(a), cz = Math.sin(a) * ez;
      const top = new V3(cx * (Ra + 1), legTopY - 0.5, cz * (Ra + 1)), bot = new V3(cx * R * 0.9, 0.8, cz * R * 0.9);
      sqLeg(g, top, bot, 4.6, 3, Wd);
      C(g, 1.3, 1.3, 0.8, bot.x, 0.4, bot.z, glide, 12);
    }
  } else {
    // 桌面下的細圓框，4 支腳斜伸
    const Ra = R * 0.5;
    C(g, Ra + 1, Ra + 1, 4, 0, legTopY - 2, 0, Wd, 40).scale.z = ez;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k * Math.PI / 2, cx = Math.cos(a), cz = Math.sin(a) * ez;
      const top = new V3(cx * Ra, legTopY - 0.5, cz * Ra), bot = new V3(cx * R * 0.84, 0.8, cz * R * 0.84);
      sqLeg(g, top, bot, 4.4, 2.8, Wd);
      C(g, 1.3, 1.3, 0.8, bot.x, 0.4, bot.z, glide, 12);
    }
  }
  return g;
}
function blobPlate(g, pts, sx, sz, y, t, m) { // 以平滑閉合曲線做不規則板（pts 為 100×96 基準的 x,z）
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new V3(x * sx, 0, z * sz)), true, 'centripetal');
  const sh = new THREE.Shape(curve.getPoints(96).map(p => new THREE.Vector2(p.x, -p.z)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 1 });
  geo.computeBoundingBox();
  const bb = geo.boundingBox, uv = geo.attributes.uv, bw = bb.max.x - bb.min.x, bd = bb.max.y - bb.min.y;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - bb.min.x) / bw, (uv.getY(i) - bb.min.y) / bd);
  const mesh = add(g, geo, m, 0, y, 0); mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
function buildDornTable(it) {
  const g = new THREE.Group(), { w, d, h } = it, sx = w / 100, sz = d / 96;
  const Cer = topMat(it), Mt = surfMat('metal', it.color2);
  // 兩片桌面大小相近：陶板在左前、金屬板往右後延伸
  const cer = [[-49, 2], [-38, -24], [-8, -34], [18, -26], [30, 4], [24, 34], [2, 47], [-26, 36]];
  const met = [[-22, -36], [8, -47], [36, -42], [50, -18], [49, 10], [36, 30], [14, 26], [-6, 2]];
  const tc = 1.2, tu = 0.5, tm = 0.8;
  blobPlate(g, met, sx, sz, h - tc - tu - tm - 0.1, tm, Mt);            // 下層金屬板（略低）
  blobPlate(g, cer, sx, sz, h - tc - tu, tu, Mt);                        // 陶板底下的金屬薄片
  blobPlate(g, cer, sx, sz, h - tc, tc, Cer);                            // 上層陶板
  // 大圓柱金屬腳：直徑約桌寬一半，位於中央偏右
  const r = Math.min(w, d) * 0.27;
  C(g, r, r, h - tc - tu - tm - 0.1, 3 * sx, (h - tc - tu - tm - 0.1) / 2, 2 * sz, Mt, 64);
  return g;
}
const BODYMAT_OPT = { key: 'bodymat', label: '櫃體材質', list: [opt('wood', '木頭'), opt('lacquer', '烤漆'), opt('glass', '玻璃')] };
const FABRIC_OPT = { key: 'fabric', label: '面料', list: [opt('fabric', '布料'), opt('leather', '皮革'), opt('velvet', '絨布')] };
const FRAMEMAT_OPT = { key: 'framemat', label: '床架材質', list: [opt('wood', '木頭'), opt('lacquer', '烤漆'), opt('fabric', '布料'), opt('leather', '皮革')] };
const LEGMAT_OPT = { key: 'legmat', label: '腳材質', list: LEGMATS };
const POT_OPT = { key: 'potmat', label: '盆器材質', list: [opt('ceramic', '陶瓷'), opt('cement', '水泥'), opt('rattan', '藤編')] };
const CAB_TOP = { key: 'topmat', label: '檯面材質', list: TOPMAT_LIST, c3: '檯面顏色' };
const EXTRA_OPTS = {
  ownRecliner: [FABRIC_OPT], ownDanSofa: [FABRIC_OPT], ownLetItBe: [FABRIC_OPT], ownRoundChaise: [FABRIC_OPT], own171: [FABRIC_OPT], ownAthena: [FABRIC_OPT], own120: [FABRIC_OPT], own120Ott: [FABRIC_OPT], ownFloatL: [FABRIC_OPT], ownAmis: [FABRIC_OPT], ownMila: [FABRIC_OPT], ownEmma: [FABRIC_OPT], ownVChair: [FABRIC_OPT], ownMiyazaki: [FABRIC_OPT], ownDoll: [FABRIC_OPT], ownCY127: [FABRIC_OPT], ownDanishBench: [FABRIC_OPT], armchair: [FABRIC_OPT], sofa2: [FABRIC_OPT], sofa: [FABRIC_OPT], lsofa: [FABRIC_OPT], baysofa: [FABRIC_OPT],
  lounge: [FABRIC_OPT], shellchair: [FABRIC_OPT], wingchair: [FABRIC_OPT], woodchair: [FABRIC_OPT], pouf: [FABRIC_OPT], bench: [FABRIC_OPT],
  chair: [FABRIC_OPT, LEGMAT_OPT], barstool: [FABRIC_OPT], barstoolBack: [FABRIC_OPT], barstoolWood: [FABRIC_OPT], barstoolSwivel: [FABRIC_OPT], barisland: [BODYMAT_OPT, CAB_TOP], vstool: [FABRIC_OPT], ownPuff: [FABRIC_OPT], office: [FABRIC_OPT], desk: [LEGMAT_OPT], plant: [POT_OPT],
  bed: [FRAMEMAT_OPT], queen: [FRAMEMAT_OPT], single: [FRAMEMAT_OPT],
  tvcab: [BODYMAT_OPT, CAB_TOP], cabinet: [BODYMAT_OPT, CAB_TOP], night: [BODYMAT_OPT, CAB_TOP],
  wardrobe: [BODYMAT_OPT], slidewardrobe: [BODYMAT_OPT], bookshelf: [BODYMAT_OPT], kitchen: [BODYMAT_OPT], sideboard: [BODYMAT_OPT], vanity: [BODYMAT_OPT],
};
const EXTRA_DEF = { // 白色系櫃體預設烤漆，木色系預設木頭；檯面顏色預設同櫃體
  own171: { fabric: 'leather' }, ownAthena: { fabric: 'leather' }, barstool: { fabric: 'leather' }, barstoolBack: { fabric: 'fabric' }, barstoolWood: { fabric: 'leather' }, barstoolSwivel: { fabric: 'leather' }, barisland: { bodymat: 'lacquer', topmat: 'slate' },
  ownVChair: { fabric: 'leather' }, ownMiyazaki: { fabric: 'leather' }, ownDoll: { fabric: 'leather' }, ownCY127: { fabric: 'leather' }, ownDanishBench: { fabric: 'leather' },
  tvcab: { bodymat: 'lacquer' }, cabinet: { bodymat: 'lacquer' }, wardrobe: { bodymat: 'lacquer' }, slidewardrobe: { bodymat: 'lacquer' },
  kitchen: { bodymat: 'lacquer' }, vanity: { bodymat: 'lacquer' },
};
function hslOf(hex) { const h = {}; new THREE.Color(hex || '#ffffff').getHSL(h, THREE.SRGBColorSpace); return h; }
function puffPanelGeo(len, hgt, t, o = {}) {
  const geo = new THREE.BoxGeometry(1, 1, 1, 22, 18, 4), P = geo.attributes.position;
  const lean = Math.tan(o.lean || 0), flare = o.flare || 0, bulge = o.bulge == null ? 2 : o.bulge, rr = t * 0.55, curl = o.curl || 0, cup = o.cup || 0, droop = o.droop || 0, tip = o.tip == null ? 0.12 : o.tip, ear = o.ear == null ? 0.02 : o.ear, rnd = o.round || 0;   // tip：邊緣最薄剩幾成厚（越大越圓鈍）；ear：兩個上角翹起多少；round：兩個上角削圓多少（0＝方角）   // droop：彎出去的同時頂端垂下來多少
  const ease = x => Math.sign(x) * (1 - Math.pow(1 - Math.abs(x), 1.7));   // 把格線往邊緣集中，圓角才圓
  const round = dist => dist >= rr ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow(1 - dist / rr, 2)));
  for (let i = 0; i < P.count; i++) {
    const u = ease(P.getX(i) * 2), v = 1 - Math.pow(1 - (P.getY(i) + 0.5), 1.7), q = P.getZ(i) * 2;
    const wl = len * (1 + flare * v), side = round((1 - Math.abs(u)) * wl / 2), top = round((1 - v) * hgt);
    const half = t / 2 * (0.82 + 0.18 * v) * (tip + (1 - tip) * side) * (tip + (1 - tip) * top);
    const y = hgt * v * (1 + ear * u * u * v) * (1 - rnd * v * v * Math.pow(Math.abs(u), 4)) - droop * v * v * v;
    P.setXYZ(i, u * wl / 2 * (1 - rnd * 0.35 * Math.pow(v, 6)), y, q * half + Math.sign(q) * (Math.abs(q) > 0.9 ? bulge * Math.sin(Math.PI * Math.min(1, v * 1.15)) * Math.cos(u * Math.PI / 2) : 0) - lean * y - curl * v * v + cup * u * u * (0.35 + 0.65 * v));
  }
  P.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
}
function insetPoly(pts, dists) {
  const n = pts.length; let area = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = area > 0 ? 1 : -1, lines = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * sg, nz = dx / l * sg;
    lines.push([a[0] + nx * dists[i], a[1] + nz * dists[i], dx, dz]);
  }
  return lines.map((L, i) => {
    const K = lines[(i + n - 1) % n], den = K[2] * L[3] - K[3] * L[2];
    if (Math.abs(den) < 1e-6) return [L[0], L[1]];
    const s = ((L[0] - K[0]) * L[3] - (L[1] - K[1]) * L[2]) / den;
    return [K[0] + K[2] * s, K[1] + K[3] * s];
  });
}
function polySlabGeo(pts, r, y, ht, bv) {
  const sh = new THREE.Shape(), n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]), rr = Math.min(r, la * 0.45, lb * 0.45);
    const p0 = [p[0] + (a[0] - p[0]) / la * rr, p[1] + (a[1] - p[1]) / la * rr], p1 = [p[0] + (b[0] - p[0]) / lb * rr, p[1] + (b[1] - p[1]) / lb * rr];
    if (i === 0) sh.moveTo(p0[0], -p0[1]); else sh.lineTo(p0[0], -p0[1]);
    sh.quadraticCurveTo(p[0], -p[1], p1[0], -p1[1]);
  }
  sh.closePath();
  bv = Math.min(bv, ht / 2 - 0.05);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: ht - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelOffset: -bv, bevelSegments: 5, curveSegments: 8 }), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 60, uv.getY(i) / 60);
  geo.rotateX(-Math.PI / 2); geo.translate(0, y + bv, 0); return geo;
}
const DAMBO_SIDE_OPT = { key: 'side', label: '五角座位置', list: [opt('right', '五角座在右'), opt('left', '五角座在左')] };
const DAMBO_BEND_OPT = { key: 'bk', label: '靠背', list: [opt('open', '往外翻開'), opt('up', '立起來')] };
const DAMBO_PIL_OPT = { key: 'rp', label: '抱枕', list: [opt('on', '放抱枕'), opt('off', '不放')] };
const DAMBO = {
  pentaW: 170,       // 五角座的寬（沿著背牆量）；一字座的寬＝總寬－這個
  rectDepth: 95,     // 一字座的深度；五角座最深的地方＝家具的「深」
  seatH: 39.5,       // 座面高度
  legH: 13,          // 金屬腳的高度
  baseT: 0,          // 座墊底下不另外做底板：座墊就是一層，直接架在腳上
  backT: 29,         // 靠背、扶手軟墊的厚度
  // 靠背、扶手可以像花瓣一樣凹：open＝往外翻開、up＝立起來。每一組是 [直背, 斜邊那片（耳朵）, 扶手] 的 { lean 傾斜角（弧度）, curl 頂端多彎出去多少 cm }
  bend: {
    open: [{ lean: 0.15, curl: 21, droop: 9 }, { lean: 0.25, curl: 34, droop: 20 }, { lean: 0.23, curl: 32, droop: 18 }],   // 花瓣綻放：背靠也往後翻開，兩端那兩片翻得最開、頂端垂下來
    up: [{ lean: 0.03, curl: 1.5 }, { lean: 0.04, curl: 2 }, { lean: 0.03, curl: 1.5 }],
  },
  cup: 3,            // 每一片兩側往內包多少（花瓣的弧度）
  tip: 0.12,         // 花瓣邊緣最薄的地方剩幾成厚：越大末端越圓鈍（使用者試過 0.5 覺得醜，維持原本的 0.12）
  round: 0,          // 每一片花瓣的兩個上角削圓多少（使用者試過覺得醜，維持 0＝不削）
  flare: 0.05,       // 靠背頂部比底部寬的比例
  // 五角座的平面輪廓，以原廠 178 × 156 的比例寫（x＝從交界往外、z＝從背面往前），會照實際的寬、深等比縮放
  penta: { backEnd: 100, sideZ: 75, tipX: 85, frontZ: 112 },
  pillow: [50, 50, 17],   // 抱枕：寬、高、厚
};
function buildDamboSofa(it) { // Dambo 款：五角座＋一字座的組合（薄底座、細金屬片腳、厚座墊、往外翻的軟靠背）；預設五角座在右，選左時鏡射
  const g = new THREE.Group(), { w, d, h } = it, P = DAMBO;
  const F = fabMat(it), F2 = fabMat(it, 'color2'), Mt = mat('#aeb1b5', 0.32, 0.9);
  const yB = P.legH, yS = yB + P.baseT, seatTop = Math.min(P.seatH, h * 0.6), t = P.backT, y0 = yB + 1.5, ph = h - y0;
  // 靠背往外翻會超出底座：先把超出的量扣掉，家具的寬、深才是含靠背的外尺寸
  const out = b => Math.max(0, Math.tan(b.lean) * ph + b.curl - t * 0.35), [bO, eO, aO] = P.bend.open, [bB, eB, aB] = P.bend[it.bk === 'up' ? 'up' : 'open'];
  const oB = Math.max(out(bO), out(eO) * 0.72 - 4), oR = out(aO), oL = out(eO) * 0.69 + 2;   // 底座的大小一律照「翻開」時算：立起來時底座不變，整體會比較窄
  const xL = -w / 2 + oL, xR = w / 2 - oR, zb = -d / 2 + oB, dd = d - oB;
  const wp = Math.min(P.pentaW, w * 0.6) - oL, xJ = xL + wp, rd = Math.min(P.rectDepth - oB, dd * 0.8), zf = zb + rd;   // 五角座在 -X 這邊（最後整組鏡射成預設的右邊）
  const kx = wp / 178, kz = dd / 156, pe = P.penta;
  const A = [xJ, zb], Bp = [xJ - pe.backEnd * kx, zb], Cp = [xL, zb + pe.sideZ * kz], Dp = [xJ - pe.tipX * kx, zb + dd], Ep = [xJ, Math.max(zf, zb + pe.frontZ * kz)];
  // 座墊：五角座一大塊、一字座兩塊
  const cz = t - 5;                                                          // 座墊往靠背底下塞進去一點
  add(g, polySlabGeo(insetPoly([A, Bp, Cp, Dp, Ep], [cz, cz, cz, -2.5, 0.6]), 14, yS, seatTop - yS, 9), F2, 0, 0, 0);
  const rx0 = xJ + 0.6, rx1 = xR - cz, cw = (rx1 - rx0 - 1) / 2;
  for (const i of [0, 1]) { const x0 = rx0 + i * (cw + 1); add(g, polySlabGeo([[x0, zb + cz], [x0 + cw, zb + cz], [x0 + cw, zf + 2.5], [x0, zf + 2.5]], 10, yS, seatTop - yS, 9), F2, 0, 0, 0); }
  // 靠背、扶手：一片一片的軟墊立在底座外緣，往外翻
  const panel = (a, b, lean, o = {}) => {                                    // a → b 是底座的外緣（從沙發外面看由左到右都可以），軟墊靠內側放
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    let nx = -dz / len, nz = dx / len; if (nx * (o.cx - mx) + nz * (o.cz - mz) < 0) { nx = -nx; nz = -nz; }   // 內側＝朝向座位中心
    const m = add(g, puffPanelGeo(len - (o.trim || 0), ph * (o.hk || 1), t, { lean: lean.lean, curl: lean.curl, droop: lean.droop, cup: P.cup, flare: P.flare, bulge: 3.5, tip: P.tip, round: P.round }), F, mx + nx * t * 0.5, y0, mz + nz * t * 0.5);
    m.rotation.y = Math.atan2(nx, nz);
  };
  const pc = { cx: (A[0] + Cp[0] + Dp[0]) / 3, cz: (A[1] + Cp[1] + Dp[1]) / 3 }, rc = { cx: (xJ + xR) / 2, cz: (zb + zf) / 2 }, hw = (xR - xJ) / 2;
  panel(Bp, Cp, eB, { ...pc, trim: 4 });
  panel(Cp, [Cp[0] + (Dp[0] - Cp[0]) * 0.68, Cp[1] + (Dp[1] - Cp[1]) * 0.68], aB, { ...pc, trim: 3, hk: 0.92 });                                     // 五角座外側也有一片扶手（兩邊都有扶手）
  panel(A, Bp, bB, { ...pc, trim: 1 });
  panel([xJ, zb], [xJ + hw, zb], bB, { ...rc, trim: 1 });
  panel([xJ + hw, zb], [xR, zb], bB, { ...rc, trim: 1 });
  panel([xR, zb + 3], [xR, zf], aB, { ...rc, trim: 2, hk: 0.97 });
  // 細金屬片腳
  const leg = (x, z, ry) => { const m = B(g, 1.2, P.legH + 1, 7.5, x, (P.legH + 1) / 2, z, Mt); m.rotation.y = ry || 0; };
  const inw = (p, c, k) => [p[0] + (c.cx - p[0]) * k, p[1] + (c.cz - p[1]) * k];
  for (const p of [Bp, Cp, Dp, Ep]) { const q = inw(p, pc, 0.4); leg(q[0], q[1], Math.PI / 4); }   // 腳都收在座墊底下
  for (const [x, z] of [[xJ + 16, zb + cz + 8], [xR - cz - 10, zb + cz + 8], [xR - cz - 10, zf - 12], [(xJ + xR) / 2, zf - 12]]) leg(x, z, 0);
  // 抱枕：斜靠在靠背上（五角座三顆、一字座兩顆），最前面那顆用 color4（預設米白）
  if (it.rp !== 'off') {
    const P3 = surfMat(it.fabric || 'fabric', it.color3 || '#232b45'), P4 = surfMat(it.fabric || 'fabric', it.color4 || '#ece9e3'), [pw, pph, pt] = P.pillow;
    const lean = (m, x, z, ry, ln, rz, s = 1) => {
      const geo = softPillowGeo(pw * s, pph * s, pt); geo.userData.pilName = '抱枕';
      const o = new THREE.Group(), hh = pph * s; o.position.set(x, seatTop - 1.5, z); o.rotation.y = ry;
      const q = add(o, geo, m, 0, hh / 2 * Math.cos(ln), Math.sin(ln) * hh / 2); q.rotation.x = -ln; q.rotation.z = rz || 0; g.add(o);
    };
    const dA = Math.atan2(Cp[1] - Bp[1], Bp[0] - Cp[0]), bz = zb + t + 4;   // 斜邊那片靠背的方向
    lean(P3, Bp[0] + 4, bz + 6, dA * 0.45, 0.3, 0.03, 1.05);
    lean(P3, (Bp[0] + Cp[0]) / 2 + 20, (Bp[1] + Cp[1]) / 2 + 16, dA, 0.34, -0.04);
    lean(P4, (Bp[0] + Cp[0]) / 2 + 42, (Bp[1] + Cp[1]) / 2 + 30, dA * 0.8, 0.5, 0.06, 0.95);
    lean(P3, xR - t - 52, bz + 2, -0.12, 0.3, -0.03, 1.05);
    lean(P3, xR - t - 16, bz + 14, -0.75, 0.36, 0.05);
  }
  return mirrorIfLeft({ side: it.side === 'left' ? 'right' : 'left' }, g);
}
const GETBACK_SIDE_OPT = { key: 'side', label: '轉角座位置', list: [opt('right', '轉角座在右'), opt('left', '轉角座在左')] };
const GETBACK_PIL_OPT = { key: 'rp', label: '抱枕', list: [opt('on', '放抱枕'), opt('off', '不放')] };
const GETBACK = {
  seatH: 45,         // 座面高度
  armH: 62,          // 皮革扶手、矮背的高度
  baseY: 19,         // 底座離地多高（下面是細金屬腳）
  baseT: 8,          // 皮革底座的厚度
  straightD: 91,     // 一字座的深度；轉角座最深的地方＝家具的「深」
  shellT: 7,         // 皮革矮背的厚度
  armT: 24,          // 皮革扶手的厚度（胖胖的）
  armBend: { lean: 0.03, curl: 1 },    // 扶手直立：傾斜角（弧度）、頂端多彎出去多少（要外翻就把這兩個數字加大）
  backBend: { lean: 0.1, curl: 4 },    // 矮背往後仰
  cushT: 24,         // 靠背墊的厚度
  cushLean: 0.14,    // 靠背墊往後靠的角度
  // 平面輪廓，以原廠 381 × 163 的比例寫（x＝從扶手那端往轉角、z＝從背面往前），會照實際的寬、深等比縮放
  plan: { joint: 212, backEnd: 300, sideZ: 75, tipX: 296 },
  pillow: [46, 46, 15],   // 抱枕：寬、高、厚
};
function buildGetBackSofa(it) { // GET BACK：皮革外殼（底座＋矮背＋外翻的扶手）托著布面的座墊和大靠背墊；一字座＋斜 45 度的轉角座，細金屬腳（預設轉角座在右，選左時鏡射）
  const g = new THREE.Group(), { w, d, h } = it, P = GETBACK;
  const L = surfMat('leather', it.color), F2 = fabMat(it, 'color2'), Mt = mat('#4a4c50', 0.35, 0.85);
  const yB = P.baseY, yS = yB + P.baseT, seatTop = Math.min(P.seatH, h * 0.6), shH = Math.min(P.armH, h - 8) - yB;
  // 扶手、矮背往外翻會超出底座：先扣掉，家具的寬、深才是含扶手的外尺寸
  const out = (b, t) => Math.max(0, Math.tan(b.lean) * shH + b.curl - t * 0.35), oL = out(P.armBend, P.armT), oB = out(P.backBend, P.shellT), oR = oB * 0.7;
  const xL = -w / 2 + oL, xR = w / 2 - oR, zb = -d / 2 + oB, dd = d - oB, kx = (xR - xL) / 381, kz = dd / 163, pl = P.plan;
  const xJ = xL + pl.joint * kx, zf = zb + Math.min(P.straightD - oB, dd * 0.7);
  const Jb = [xJ, zb], K = [xL + pl.backEnd * kx, zb], R = [xR, zb + pl.sideZ * kz], T = [xL + pl.tipX * kx, zb + dd], Jf = [xJ, zf];
  // 皮革底座：整片薄托盤
  add(g, polySlabGeo([[xL, zb], K, R, T, Jf, [xL, zf]], 9, yB, P.baseT, 3), L, 0, 0, 0);
  // 布面座墊：一字座兩塊、轉角座一大塊（前緣比底座多出去一點）
  const bi = P.shellT + 2, sx0 = xL + P.armT * 0.85, cw = (xJ - 0.6 - sx0 - 1) / 2;
  for (const i of [0, 1]) { const x0 = sx0 + i * (cw + 1); add(g, polySlabGeo([[x0, zb + bi], [x0 + cw, zb + bi], [x0 + cw, zf + 3], [x0, zf + 3]], 10, yS, seatTop - yS, 7), F2, 0, 0, 0); }
  add(g, polySlabGeo(insetPoly([Jb, K, R, T, Jf], [bi, bi, P.armT * 0.7, -3, 0.6]), 16, yS, seatTop - yS, 7), F2, 0, 0, 0);
  // 一片一片立在底座外緣：皮革矮背／扶手（薄、往外翻），布面靠背墊（厚、放在座墊上靠著矮背）
  const sc = { cx: (xL + xJ) / 2, cz: (zb + zf) / 2 }, tc = { cx: (Jb[0] + R[0] + T[0]) / 3, cz: (Jb[1] + R[1] + T[1]) / 3 };
  const panel = (a, b, o) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    let nx = -dz / len, nz = dx / len; if (nx * (o.cx - mx) + nz * (o.cz - mz) < 0) { nx = -nx; nz = -nz; }
    const off = (o.off || 0) + o.t * 0.5;
    const m = add(g, puffPanelGeo(len - (o.trim || 0), o.hgt, o.t, { lean: o.lean, curl: o.curl, cup: o.cup, flare: o.flare || 0, bulge: o.bulge }), o.m, mx + nx * off, o.y0, mz + nz * off);
    m.rotation.y = Math.atan2(nx, nz);
  };
  const shell = { t: P.shellT, y0: yB + 1, hgt: shH - 1, m: L, bulge: 0.8, cup: 2, ...P.backBend }, mid = (xL + xJ) / 2;
  panel([xL, zb], [mid, zb], { ...shell, ...sc });
  panel([mid, zb], [xJ, zb], { ...shell, ...sc });
  panel(Jb, K, { ...shell, ...tc });
  panel(K, R, { ...shell, ...tc, trim: 3 });
  const Rm = [R[0] + (T[0] - R[0]) * 0.55, R[1] + (T[1] - R[1]) * 0.55];
  panel(R, Rm, { ...shell, ...tc, t: P.armT, bulge: 3, cup: 1, ...P.armBend, trim: 2 });   // 轉角座尾端的扶手：跟另一邊一樣直立、胖胖的
  panel([xL, zf + 1], [xL, zb + 2], { ...shell, ...sc, t: P.armT, bulge: 3, cup: 1, ...P.armBend });   // 直立的胖扶手
  const cu = { t: P.cushT, y0: seatTop - 3, hgt: h - seatTop + 3, m: F2, lean: P.cushLean, curl: 2, cup: 1.5, bulge: 4, off: P.shellT - 1, flare: 0.02 };
  panel([sx0, zb], [sx0 + cw, zb], { ...cu, ...sc, trim: 2 });
  panel([sx0 + cw + 1, zb], [xJ, zb], { ...cu, ...sc, trim: 2 });
  panel(Jb, K, { ...cu, ...tc, trim: 4 });
  panel(K, R, { ...cu, ...tc, trim: 22 });
  // 細金屬腳
  const inw = (p, c, k) => [p[0] + (c.cx - p[0]) * k, p[1] + (c.cz - p[1]) * k];
  for (const p of [[xL + 14, zb + 12], [xL + 14, zf - 12], [xJ - 10, zf - 12], [xJ - 10, zb + 12], inw(K, tc, 0.22), inw(R, tc, 0.22), inw(T, tc, 0.22)]) C(g, 1.3, 1, yB + 1, p[0], (yB + 1) / 2, p[1], Mt, 10);
  // 抱枕：斜靠在靠背墊上（color3 兩顆、最右邊一顆跟座墊同色）
  if (it.rp !== 'off') {
    const P3 = surfMat(it.fabric || 'fabric', it.color3 || '#9a4a2a'), [pw, pph, pt] = P.pillow;
    const lean = (m, x, z, ry, ln, rz, s = 1) => {
      const geo = softPillowGeo(pw * s, pph * s, pt); geo.userData.pilName = '抱枕';
      const o = new THREE.Group(), hh = pph * s; o.position.set(x, seatTop - 1.5, z); o.rotation.y = ry;
      const q = add(o, geo, m, 0, hh / 2 * Math.cos(ln), Math.sin(ln) * hh / 2); q.rotation.x = -ln; q.rotation.z = rz || 0; g.add(o);
    };
    const bz = zb + P.shellT + P.cushT + 4, dA = Math.atan2(K[1] - R[1], R[0] - K[0]);   // 斜邊靠背朝向座位的方向
    lean(P3, sx0 + cw * 0.38, bz, 0.06, 0.32, 0.03);
    lean(P3, xJ + (K[0] - xJ) * 0.35, bz + 1, -0.1, 0.34, -0.04);
    lean(F2, (K[0] + R[0]) / 2 - 26, (K[1] + R[1]) / 2 + 24, dA * 0.9, 0.4, 0.05, 1.05);
  }
  return mirrorIfLeft(it, g);
}
const GERMAIN_SIDE_OPT = { key: 'side', label: '轉折位置', list: [opt('left', '轉折在左'), opt('right', '轉折在右')] };
const GERMAIN_PIL_OPT = { key: 'rp', label: '抱枕', list: [opt('on', '放抱枕'), opt('off', '不放')] };
const GERMAIN = {
  bendAt: 0.37,      // 從轉折那一端量，總寬的幾成處開始轉折
  wingLen: 0.37,     // 轉折那一段（沿著背面量）佔總寬的幾成
  angle: 0.54,       // 轉折的角度（弧度，約 31 度）
  straightD: 100,    // 直的那一段的深度；轉折段最前端＝家具的「深」
  seatH: 41,         // 座面高度
  baseH: 22,         // 下層底座的頂面高度（上面是座墊）
  armT: 28,          // 兩端圓扶手的厚度
  backT: 12,         // 中間矮背的厚度
  armLen: 84,        // 扶手從背面往前伸多長
  cornerR: 30,       // 背面轉到扶手的圓角半徑
  cushion: [72, 37, 20],   // 靠背墊：寬、高（露出座面以上）、厚
  cushLean: 0.2,     // 靠背墊往後靠的角度
  pillow: [46, 46, 15],    // 抱枕：寬、高、厚
};
function buildGermainSofa(it) { // 聖日耳曼：迴力鏢形的一體沙發——矮背順著背面彎過去，兩端收成胖胖的圓扶手；下層底座＋上層座墊，三塊靠背墊（預設轉折在左，選右時鏡射）
  const g = new THREE.Group(), { w, d, h } = it, P = GERMAIN;
  const F = fabMat(it), Dk = mat('#2a2a2a', 0.7), fab = it.fabric || 'fabric';
  const Fs = surfMat(fab, it.color4 || it.color), Fb = surfMat(fab, it.color5 || it.color);   // 上層座墊（含靠背墊）、下層底座可以各自一個顏色；沒指定就跟扶手同色
  const xL = -w / 2, xR = w / 2, zb = -d / 2, th = P.angle, cs = Math.cos(th), sn = Math.sin(th);
  const xb = xL + w * P.bendAt, Lw = Math.max(w * P.wingLen, (w * P.bendAt - 3) / cs), ud = [-cs, sn], vd = [sn, cs];   // 轉折點；轉折段沿背面的方向 ud、朝前的方向 vd
  const wp = (u, v) => [xb + ud[0] * u + vd[0] * v, zb + ud[1] * u + vd[1] * v];       // 轉折段上的點：沿背面 u、往前 v
  const aT = P.armT, bT = P.backT, rc = P.cornerR, seatTop = Math.min(P.seatH, h * 0.7), D0 = Math.min(P.straightD, d * 0.75);
  const Dw = Math.max(D0 * 0.9, (d - 4 - (Lw - aT + 4) * sn) / cs);                    // 轉折段的深度：讓最前端剛好到家具的「深」
  // 矮背＋兩端扶手：一整片厚殼，從右扶手前端 → 右後轉角 → 背面 → 轉折 → 左後轉角 → 左扶手前端
  const line = (Q, a, b) => { const m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4)); for (let i = 1; i <= m; i++) Q.push([a[0] + (b[0] - a[0]) * i / m, a[1] + (b[1] - a[1]) * i / m]); };
  const fillet = (Q, a, c, b, r) => {                                         // 從 a 走到轉角 c 再往 b：轉角用半徑 r 的圓弧帶過
    const d1 = [a[0] - c[0], a[1] - c[1]], d2 = [b[0] - c[0], b[1] - c[1]], l1 = Math.hypot(...d1), l2 = Math.hypot(...d2);
    const u1 = [d1[0] / l1, d1[1] / l1], u2 = [d2[0] / l2, d2[1] / l2], half = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))) / 2, tl = Math.min(r / Math.tan(half), l1 * 0.45, l2 * 0.45);
    const p1 = [c[0] + u1[0] * tl, c[1] + u1[1] * tl], p2 = [c[0] + u2[0] * tl, c[1] + u2[1] * tl];
    line(Q, Q[Q.length - 1], p1);
    for (let i = 1; i <= 10; i++) { const k = i / 10, m = 1 - k; Q.push([m * m * p1[0] + 2 * m * k * c[0] + k * k * p2[0], m * m * p1[1] + 2 * m * k * c[1] + k * k * p2[1]]); }
  };
  const A0 = [xR, zb + P.armLen], A1 = [xR, zb], B = [xb, zb], Cw = wp(Lw, 0), Dw2 = wp(Lw, P.armLen), path = [A0];
  fillet(path, A0, A1, B, rc); fillet(path, A1, B, Cw, 45); fillet(path, B, Cw, Dw2, rc); line(path, path[path.length - 1], Dw2);
  const armS = P.armLen + rc * 0.4, sm = x => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
  add(g, sweepShellGeo(path, 1, 4, (s, L) => bT + (aT - bT) * Math.max(1 - sm((s - armS + 22) / 30), sm((s - (L - armS) - 8) / 30)), () => h, aT * 0.5, aT * 0.5, { bulge: 4, taper: 0.05 }), F, 0, 0, 0);
  // 座體：下層底座、上層座墊，都照迴力鏢的平面形狀
  const hit = (p, dp, q, dq) => { const den = dp[0] * dq[1] - dp[1] * dq[0], t = ((q[0] - p[0]) * dq[1] - (q[1] - p[1]) * dq[0]) / den; return [p[0] + dp[0] * t, p[1] + dp[1] * t]; };
  const seat = (back, side, fr) => {                                          // back＝離背面外緣多少、side＝離兩端外緣多少、fr＝前緣多出去多少
    const x1 = xR - side, f1 = [x1, zb + D0 - 4 + fr], f2 = [xb + 20, zb + D0 + 6 + fr];   // 直段的前緣微微往轉折那邊變深
    const X = hit(f1, [f2[0] - f1[0], f2[1] - f1[1]], wp(0, Dw + fr), ud), bk = hit([0, zb + back], [1, 0], wp(0, back), ud);
    return [[x1, zb + back], f1, X, wp(Lw - side, Dw + fr), wp(Lw - side, back), bk];
  };
  add(g, polySlabGeo(seat(bT - 2, aT - 6, -3), 14, 4, P.baseH - 4, 4), Fb, 0, 0, 0);
  add(g, polySlabGeo(seat(bT - 3, aT - 8, 1), 18, P.baseH, seatTop - P.baseH, 7.5), Fs, 0, 0, 0);
  // 小腳
  for (const p of [[xR - aT - 14, zb + 14], [xR - aT - 14, zb + D0 - 18], [xb + 10, zb + 14], [xb + 20, zb + D0 - 14], wp(Lw - aT - 12, 16), wp(Lw - aT - 12, Dw - 22), wp(Lw * 0.45, Dw - 18)]) C(g, 3, 3, 4, p[0], 2, p[1], Dk, 12);
  // 靠背墊：直段兩塊、轉折段一塊，放在座墊上靠著矮背
  const [cw, ch, ct] = P.cushion, cushion = (cx, cz, ry) => { const m = add(g, puffPanelGeo(cw, ch + 2, ct, { lean: P.cushLean, curl: 2, cup: 1, bulge: 3.5 }), Fs, cx, seatTop - 2, cz); m.rotation.y = ry; };
  const sx0 = xb + 16, sx1 = xR - aT - 2, off = bT + ct * 0.5 + 1;
  for (const k of [0.25, 0.76]) cushion(sx0 + (sx1 - sx0) * k, zb + off, 0);
  const wc = wp(Lw * 0.5, off); cushion(wc[0], wc[1], th);
  // 抱枕：color2 兩顆、color3 一顆
  if (it.rp !== 'off') {
    const P2 = surfMat(it.fabric || 'fabric', it.color2 || '#232325'), P3 = surfMat(it.fabric || 'fabric', it.color3 || '#9a9790'), [pw, pph, pt] = P.pillow;
    const lean = (m, x, z, ry, ln, rz, s = 1) => {
      const geo = softPillowGeo(pw * s, pph * s, pt); geo.userData.pilName = '抱枕';
      const o = new THREE.Group(), hh = pph * s; o.position.set(x, seatTop - 1.5, z); o.rotation.y = ry;
      const q = add(o, geo, m, 0, hh / 2 * Math.cos(ln), Math.sin(ln) * hh / 2); q.rotation.x = -ln; q.rotation.z = rz || 0; g.add(o);
    };
    const a = wp(Lw - aT - 16, bT + ct + 6), b = wp(Lw * 0.62, bT + ct + 20);
    lean(P2, a[0], a[1], th + 0.5, 0.3, 0.04, 1.05);
    lean(P3, b[0], b[1], th + 0.15, 0.42, -0.05);
    lean(P2, sx0 + (sx1 - sx0) * 0.5, zb + bT + ct + 8, -0.05, 0.3, 0.02);
  }
  return mirrorIfLeft({ side: it.side === 'right' ? 'left' : 'right' }, g);
}
TYPES = {
  ownRecliner: { sub: '沙發', name: '131型沙發', w: 276, d: 105, h: 105, color: '#b9bcc2', color2: '#86aecb', c1: '布料顏色', c2: '抱枕顏色', build: buildReclinerSofa, opts: [SEATS_OPT], def: { seats: '3' }, wall: true, own: true },
  ownDanSofa: { sub: '沙發', name: '丹麥沙發', w: 210, d: 90, h: 90, color: '#cfc8b8', color2: '#d9b382', c1: '布料顏色', c2: '木腳顏色', build: buildDanishSofa, opts: [SEATS_OPT], def: { seats: '2' }, wall: true, own: true },
  ownLetItBe: { sub: '沙發', name: 'Let it be沙發', w: 368, d: 267, h: 80, color: '#e3e1dc', color2: '#9a6038', c1: '布料顏色', c2: '底框皮革顏色', build: buildLetItBeSofa, opts: [SEATS_OPT_L, SIDE_OPT], def: { seats: '3', side: 'left' }, wall: true, own: true },
  ownRoundChaise: { sub: '沙發', name: '雷內沙發', w: 308, d: 150, h: 73, color: '#dedad4', color2: '#6d6f73', color3: '#d49a2e', c1: '主座布料', c2: '貴妃布料', c3: '圓抱枕顏色', build: buildRoundChaiseSofa, opts: [SIDE_OPT, RCH_PIL_OPT], def: { side: 'left', rp: 'on' }, wall: true, own: true },
  own171: { sub: '沙發', name: '171型沙發', w: 285, d: 185, h: 90, color: '#8f9291', color2: '#b5b1b2', color3: '#232325', c1: '牛皮顏色', c2: '腰枕顏色', c3: '鐵腳顏色', build: build171Sofa, opts: [SEATS_OPT_L, SIDE_OPT], def: { seats: '2', side: 'right' }, wall: true, own: true },
  own120: { sub: '沙發', name: '120型沙發', w: 250, d: 90, h: 102, color: '#d3d2cf', color2: '#67666a', color3: '#55524f', c1: '布料顏色', c2: '合成皮顏色', c3: '金屬腳顏色', build: build120Sofa, opts: [SEATS_OPT], def: { seats: '3' }, wall: true, own: true },
  own120Ott: { sub: '沙發', name: '120型腳椅', w: 85, d: 90, h: 58, color: '#d3d2cf', color2: '#67666a', color3: '#55524f', c1: '布料顏色', c2: '合成皮顏色', c3: '金屬腳顏色', build: build120Ottoman, opts: [{ key: 'side', label: '扶手位置', list: [opt('right', '扶手在右'), opt('left', '扶手在左')] }], def: { side: 'right' }, own: true },
  ownAthena: { sub: '沙發', name: '雅典娜沙發', w: 392, d: 271, h: 87, color: '#969896', color2: '#7a4a2b', color3: '#4d4a48', c1: '牛皮顏色', c2: '扶手實木顏色', c3: '金屬腳顏色', build: buildAthenaSofa, opts: [SEATS_OPT_L, SIDE_OPT], def: { seats: '3', side: 'left' }, wall: true, own: true },
  ownFloatL: { sub: '沙發', name: '103型沙發', w: 306, d: 180, h: 95,  color: '#dcd6cf', color2: '#8e7472', color3: '#d9bd94', c1: '坐墊布料', c2: '底座布料', c3: '邊几木色', build: buildFloatLSofa, opts: [SEATS_OPT_L, SIDE_OPT], def: { seats: '2', side: 'left' }, wall: true, own: true },
  ownAmis: { sub: '床台', name: '阿美族床台', w: 170, d: 206, h: 100, color: '#8d8c8a', color2: '#e6e1d4', color3: '#c9ccd0', c1: '床架布料', c2: '床頭靠墊布料', c3: '金屬腳顏色', build: buildAmisBed, opts: [BED_MATT_OPT], def: { matt: 'on' }, wall: true, own: true },
  ownMila: { sub: '床台', name: '米拉床台', w: 163, d: 210, h: 110, color: '#c5cad2', color2: '#565a60', color3: '#b9b6b0', c1: '床頭皮革顏色', c2: '床架皮革顏色', c3: '不鏽鋼腳顏色', build: buildMilaBed, opts: [BED_MATT_OPT], def: { matt: 'on', fabric: 'leather' }, wall: true, own: true },
  ownEmma: { sub: '床台', name: 'Emma床台', w: 154, d: 200, h: 107, color: '#8f9394', color2: '#1f1c1b', c1: '布料顏色', c2: '木腳顏色', build: buildEmmaBed, opts: [BED_MATT_OPT], def: { matt: 'on' }, wall: true, own: true },
  ownDanish: { sub: '餐桌', name: '丹麥餐桌', w: 180, d: 90, h: 75, color: '#f2f0ec', color2: '#dcc39c', c1: '桌面顏色', c2: '木腳顏色', build: buildDanishTable, opts: [TOPMAT_OPT], def: { topmat: 'slate' }, own: true },
  ownPencil: { sub: '餐桌', name: '鉛筆腳餐桌', w: 150, d: 85, h: 75, color: '#f2f0ec', color2: '#1f1f1f', c1: '桌面顏色', c2: '鐵件顏色', build: buildPencilTable, opts: [TOPMAT_OPT], def: { topmat: 'slate' }, own: true },
  ownHeart: { sub: '餐桌', name: '愛心腳餐桌', w: 240, d: 105, h: 75, color: '#6f6862', color2: '#3d322d', color3: '#1b1b1c', c1: '陶板顏色', c2: '金屬顏色', c3: '底板顏色', build: buildHeartTable, opts: [TOPMAT_OPT], def: { topmat: 'slate' }, own: true },
  ownVChair: { sub: '餐椅', name: 'V型餐椅', w: 46, d: 62, h: 84, color: '#b8aa9e', color2: '#dcc39c', c1: '皮面顏色', c2: '木腳顏色', build: buildVChair, own: true },
  ownMiyazaki: { sub: '餐椅', name: '宮崎餐椅', w: 50, d: 56, h: 74, color: '#a9a39c', color2: '#e6cfa6', c1: '皮面顏色', c2: '木腳顏色', build: buildMiyazakiChair, own: true },
  ownDoll: { sub: '餐椅', name: '娃娃餐椅', w: 50, d: 49.5, h: 84, color: '#8a7868', color2: '#8a7868', color3: '#1e1e20', c1: '內側皮革（坐面與椅背正面）', c2: '外側皮革（椅背背面與椅底）', c3: '金屬腳顏色', build: buildDollChair, own: true },
  ownCY127: { sub: '餐椅', name: 'CY127餐椅', w: 45, d: 57, h: 84.5, color: '#9c8a68', color2: '#4f4944', color3: '#1c1c1e', c1: '內側皮革（坐墊與椅背正面）', c2: '外側皮革（椅背背面）', c3: '金屬腳顏色', build: buildCY127Chair, own: true },
  ownDanishBench: { sub: '長凳', name: '丹麥長凳', w: 150, d: 38, h: 45, color: '#a9a39c', color2: '#dcb98c', c1: '皮面顏色', c2: '木腳顏色', build: buildDanishBench, own: true },
  ownOvalSide: { sub: '邊几', name: '橢圓陶板邊几', w: 34, d: 56, h: 52, color: '#1f1f21', color2: '#1f1f1f', c1: '桌面顏色', c2: '金屬顏色', build: buildOvalSideTable, opts: [TOPMAT_OPT], def: { topmat: 'slate' }, own: true },
  ownDali: { sub: '書桌', name: '大理書桌', w: 150, d: 70, h: 75, color: '#2f2b2a', color2: '#c9c8cc', color3: '#1d1e21', c1: '桌面木頭顏色', c2: '抽屜烤漆顏色', c3: '金屬顏色（把手與腳座）', build: buildDaliDesk, opts: [DESK_SIDE_OPT], def: { side: 'left' }, wall: true, own: true },
  ownEgger: { sub: '書桌', name: '艾格書桌', w: 150, d: 70, h: 75, color: '#2a2625', color2: '#6b4a38', color3: '#1d1e21', c1: '桌面木頭顏色', c2: '抽屜木頭顏色', c3: '金屬顏色（把手與腳座）', build: buildEggerDesk, opts: [DESK_SIDE_OPT], def: { side: 'right' }, wall: true, own: true },
  ownHemingway: { sub: '化妝桌椅', name: '海明威化妝台', w: 140, d: 55, h: 126, color: '#77726f', color2: '#c9a659', c1: '烤漆顏色', c2: '金屬顏色（把手、腳座、鏡框）', build: buildHemingwayVanity, opts: [VAN_SIDE_OPT, VAN_MIRROR_OPT], def: { side: 'left', mir: 'on' }, wall: true, own: true },
  ownPuff: { sub: '化妝桌椅', name: '泡芙化妝椅', w: 47, d: 52, h: 65, color: '#ecd2c0', color2: '#b98289', color3: '#4a3f3a', c1: '椅身布料', c2: '坐墊與椅背布料', c3: '底座顏色', build: buildPuffStool, own: true },
  ownTawu: { sub: '床頭櫃', name: '塔烏床頭櫃', w: 50, d: 50, h: 51, color: '#f2f0ec', color2: '#1c1b1a', color3: '#1b1b1c', c1: '陶板顏色', c2: '木頭顏色', c3: '底板顏色', build: buildTawuNight, opts: [TOPMAT_OPT], def: { topmat: 'slate' }, own: true },
  ownTawuBox: { sub: '床頭櫃', name: '哈克床頭櫃', w: 52, d: 46, h: 50, color: '#f2f0ec', color2: '#c9c5bf', color3: '#3b302b', c1: '陶板顏色', c2: '烤漆顏色', c3: '木腳顏色', build: buildLacquerNight, opts: [TOPMAT_OPT], def: { topmat: 'slate' }, own: true },
  ownDorn: { sub: '茶几', name: '多恩茶几', w: 100, d: 96, h: 35, color: '#cbc2b6', color2: '#2f2b28', c1: '陶板顏色', c2: '金屬顏色', build: buildDornTable, opts: [TOPMAT_OPT], def: { topmat: 'slate' }, own: true },
  ownAshBig: { sub: '茶几', name: 'Ash陶板大茶几', w: 90, d: 90, h: 36, color: '#d6b98a', color2: '#eeece8', c1: '木頭顏色（桌框與桌腳）', c2: '陶板顏色', build: buildAshTable, own: true },
  ownAshSmall: { sub: '茶几', name: 'Ash陶板小茶几', w: 52, d: 52, h: 52, color: '#2e2724', color2: '#3b3b3d', c1: '木頭顏色（桌框與桌腳）', c2: '陶板顏色', build: buildAshTable, own: true },
  kitchen: { sub: '廚具', generic: true, name: '廚具流理台', w: 240, d: 60,  h: 86,  color: '#f4f2ee', color2: '#4a4d52', c1: '門板',     c2: '檯面',     build: it => buildCabinet(it, { counter: true, doorW: 45 }), opts: KITCHEN_OPTS, def: { topmat: 'slate' }, wall: true },
  barisland: { sub: '中島', generic: true, name: '中島吧檯',   w: 180, d: 75,  h: 95,  color: '#f2f0ec', color2: '#4a4d52', color3: '#3a3c40', c1: '櫃體', c2: null, build: it => buildBarTable(it, 'island') },
  fridge: { sub: '廚房家電', generic: true, name: '冰箱',       w: 70,  d: 70,  h: 180, color: '#d9dcdf', color2: '#8a8f98', c1: '機身',     c2: '把手',     build: buildFridge, wall: true },
  dishwasher: { sub: '廚房家電', generic: true, name: '洗碗機',    w: 60,  d: 60,  h: 85,  color: '#c9cdd1', color2: '#8e9099', c1: '門板', c2: '把手', build: buildDishwasher, wall: true },
  microwave: { sub: '小家電', generic: true, name: '微波爐',     w: 50,  d: 40,  h: 30,  color: '#f4f4f2', color2: '#4a4d52', c1: '機身', c2: '面板', build: buildMicrowave, noHit: true },
  ricecooker: { sub: '小家電', generic: true, name: '電鍋',      w: 32,  d: 32,  h: 30,  color: '#9fb3c8', color2: '#2b2b2b', c1: '鍋身', c2: '把手', build: buildRiceCooker, noHit: true },
  coffeemaker: { sub: '小家電', generic: true, name: '咖啡機',   w: 25,  d: 40,  h: 36,  color: '#b8bcc0', color2: '#2b2b2b', c1: '機身', c2: '底座', build: buildCoffeeMaker, noHit: true },
  oven: { sub: '小家電', generic: true, name: '烤箱',       w: 50,  d: 40,  h: 32,  color: '#2b2b2b', color2: '#b8bcc0', c1: '機身', c2: '把手旋鈕', build: buildOven, noHit: true, on: ['kitchen', 'sideboard', 'cabinet'] },
  sideboard: { sub: '餐櫃', generic: true, name: '餐櫃',       w: 160, d: 45,  h: 85,  color: '#f2f0ec', color2: '#5a3a28', c1: '檯面', c2: '櫃體', build: buildSideboard, opts: SIDEBOARD_OPTS, def: { topmat: 'marble' }, wall: true },
  bartable: { sub: '吧檯桌', generic: true, name: '長型吧檯桌', w: 140, d: 50,  h: 105, color: '#c49a6c', color2: '#222222', c1: '桌面', c2: '桌腳', build: it => buildBarTable(it, 'long'), opts: [BAR_BASES, BAR_LEGMAT, TOPMAT_OPT] },
  barwall: { sub: '吧檯桌', generic: true, name: '靠牆吧檯',   w: 120, d: 38,  h: 105, color: '#c49a6c', color2: '#222222', c1: '檯面', c2: '支架', build: it => buildBarTable(it, 'wall'), opts: [TOPMAT_OPT], wall: true },
  barround: { sub: '吧檯桌', generic: true, name: '圓形高腳桌', w: 60,  d: 60,  h: 105, color: '#f1ebe1', color2: '#222222', c1: '桌面', c2: '桌腳', build: it => buildBarTable(it, 'round'), opts: [BARROUND_BASES, BAR_LEGMAT, TOPMAT_OPT], def: { topmat: 'marble' } },
  barstool: { sub: '吧檯椅', generic: true, name: '圓凳吧檯椅', w: 36,  d: 36,  h: 75,  color: '#8b5a3c', color2: '#222222', c1: '椅面', c2: '椅腳', build: it => buildBarStool(it, 'round'), opts: [BAR_LEGMAT] },
  barstoolBack: { sub: '吧檯椅', generic: true, name: '低背吧檯椅', w: 42, d: 46, h: 95, color: '#b9b4ad', color2: '#222222', c1: '椅面', c2: '椅腳', build: it => buildBarStool(it, 'back'), opts: [BAR_LEGMAT] },
  barstoolWood: { sub: '吧檯椅', generic: true, name: '實木吧檯椅', w: 42, d: 44, h: 102, color: '#3d3a38', color2: '#c49a6c', c1: '椅面', c2: '椅架', build: it => buildBarStool(it, 'wood'), opts: [BAR_LEGMAT], def: { legmat: 'wood' } },
  barstoolSwivel: { sub: '吧檯椅', generic: true, name: '升降旋轉吧椅', w: 42, d: 42, h: 95, color: '#2f2f31', color2: '#c9cdd1', c1: '椅面', c2: '金屬', build: it => buildBarStool(it, 'swivel') },
  ownDambo: { sub: '沙發', name: '花瓣沙發', w: 360, d: 156, h: 83.5, color: '#b8a797', color2: '#c4b6a7', color3: '#232b45', c1: '靠背／底座布料', c2: '座墊布料', c3: '抱枕顏色', build: buildDamboSofa, opts: [DAMBO_SIDE_OPT, DAMBO_BEND_OPT, DAMBO_PIL_OPT], def: { side: 'left', bk: 'open', rp: 'on' }, wall: true, own: true },
  ownGetBack: { sub: '沙發', name: 'GET BACK 沙發', w: 381, d: 163, h: 87, color: '#a5623c', color2: '#cfcbc4', color3: '#9a4a2a', c1: '皮革外殼', c2: '座墊／靠背布料', c3: '抱枕顏色', build: buildGetBackSofa, opts: [GETBACK_SIDE_OPT, GETBACK_PIL_OPT], def: { side: 'right', rp: 'on' }, wall: true, own: true },
  ownGermain: { sub: '沙發', name: '聖日耳曼沙發', w: 320, d: 153.5, h: 65, color: '#d9cdb8', color2: '#232325', color3: '#9a9790', c1: '沙發布料', c2: '抱枕顏色', c3: '點綴抱枕', build: buildGermainSofa, opts: [GERMAIN_SIDE_OPT, GERMAIN_PIL_OPT], def: { side: 'left', rp: 'on' }, wall: true, own: true }
};
// 原版的額外選項（面料、櫃體材質、檯面材質）
for (const [k, list] of Object.entries(EXTRA_OPTS)) {
  const T = TYPES[k]; if (!T) continue;
  T.opts = [...(T.opts || []), ...list];
  T.def = { ...(T.def || {}), ...(EXTRA_DEF[k] || {}) };
  if (list.includes(CAB_TOP)) { T.c3 = T.c3 || '檯面顏色'; if (!T.color3) T.color3 = T.color; }
}
// 小家電可以放在這些家具的檯面上
export const ON_TOP = ['kitchen', 'sideboard', 'barisland', 'barwall', 'bartable'];
for (const k of ['microwave', 'ricecooker', 'coffeemaker', 'oven']) if (TYPES[k]) TYPES[k].on = ON_TOP;
const triSize = it => Math.max(18, Math.min(90, Math.round(Math.max(it.w || 0, it.d || 0, it.h || 0) * 0.3 / 6) * 6));
export const PRODUCTS = TYPES;
export const SUBS = ['沙發', '茶几', '邊几', '餐桌', '餐椅', '長凳', '餐櫃', '廚具', '中島', '吧檯桌', '吧檯椅', '廚房家電', '小家電', '床台', '床頭櫃', '化妝桌椅', '書桌'];
export function optsOf(T) { return T.opts || []; }
export function withDefaults(it) {
  const T = TYPES[it.type];
  for (const g of optsOf(T)) if (!it[g.key] || !g.list.some(x => x.id === it[g.key])) it[g.key] = (T.def && T.def[g.key]) || g.list[0].id;
  if (T.def) for (const [k, v] of Object.entries(T.def)) if (it[k] == null) it[k] = v;
  for (const k of ['w', 'd', 'h', 'color', 'color2', 'color3']) if (it[k] == null && T[k] != null) it[k] = T[k];
  return it;
}
export function buildModel(it) {
  TRI_CUR = triSize(it); TRI_MAX = Math.max(it.w || 0, it.d || 0);
  try { return TYPES[it.type].build(it); } finally { TRI_CUR = TRI_MAX = 0; }
}
