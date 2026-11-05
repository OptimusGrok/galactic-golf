// Nine themed neon rooms. Static meshes are merged per material to keep draw calls low.
import { BALL_R } from './physics.js?v=7';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js?v=7';
import { STRIKE_ICON_DATAURL } from './strikeArt.js?v=7';

let T = null; // set per buildHole
const GREEN = 0x0e6a30;
const MAG = 0xff2bd6;
const CYAN = 0x2de8ff;
const ORANGE = 0xff7a1a;

function hexCss(n) { return '#' + n.toString(16).padStart(6, '0'); }

const _matCache = new Map();
const _glowCache = new Map();
const _basicCache = new Map();
function mat(THREE, color, opts = {}) {
  // Only cache plain colour mats (no maps / special opts beyond roughness/metalness/emissive)
  const keys = Object.keys(opts).sort();
  const cacheable = keys.every(k => ['roughness','metalness','emissive','emissiveIntensity','envMapIntensity','side'].includes(k));
  const key = cacheable ? (color + '|' + JSON.stringify(opts)) : null;
  if (key && _matCache.has(key)) return _matCache.get(key);
  const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7, metalness: 0.05 }, opts));
  if (key) _matCache.set(key, m);
  return m;
}
function glow(THREE, color, intensity = 1.2) {
  const key = color + '|' + intensity;
  if (_glowCache.has(key)) return _glowCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: intensity, roughness: 0.35, metalness: 0.2
  });
  _glowCache.set(key, m);
  return m;
}
function basicGlow(THREE, color) {
  if (_basicCache.has(color)) return _basicCache.get(color);
  const m = new THREE.MeshBasicMaterial({ color });
  _basicCache.set(color, m);
  return m;
}

function canvasTex(THREE, w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function feltTex(THREE) {
  return canvasTex(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = '#0c5a28'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(8,60,24,0.45)' : 'rgba(40,140,70,0.22)';
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    g.strokeStyle = 'rgba(0,60,20,0.15)'; g.lineWidth = 1;
    for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}

function floorTex(THREE) {
  return canvasTex(THREE, 512, 512, (g, w, h) => {
    g.fillStyle = '#05050a'; g.fillRect(0, 0, w, h);
    // Hex grid
    g.strokeStyle = 'rgba(140,60,220,0.45)'; g.lineWidth = 2;
    const s = 36;
    for (let y = -s; y < h + s; y += s) {
      for (let x = -s; x < w + s; x += s) {
        g.beginPath();
        g.moveTo(x + s * 0.5, y); g.lineTo(x + s, y + s * 0.25);
        g.lineTo(x + s, y + s * 0.75); g.lineTo(x + s * 0.5, y + s);
        g.lineTo(x, y + s * 0.75); g.lineTo(x, y + s * 0.25); g.closePath(); g.stroke();
      }
    }
    // Fake neon reflections / gloss streaks
    for (let i = 0; i < 18; i++) {
      const grad = g.createLinearGradient(0, Math.random()*h, w, Math.random()*h);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, i % 2 ? 'rgba(255,45,214,0.08)' : 'rgba(45,232,255,0.07)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, Math.random()*h, w, 8 + Math.random()*18);
    }
    // Spec highlights
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (0.04 + Math.random()*0.08) + ')';
      g.beginPath(); g.ellipse(Math.random()*w, Math.random()*h, 20+Math.random()*40, 3+Math.random()*6, Math.random(), 0, Math.PI*2); g.fill();
    }
  });
}

function addMesh(parent, geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new T.Mesh(geo, material);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  parent.add(m); return m;
}

function makeSign(THREE, text, color) {
  const tex = canvasTex(THREE, 512, 128, (g, w, h) => {
    g.fillStyle = '#0a0614'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    g.font = 'bold 46px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 22; g.fillStyle = color; g.fillText(text, w / 2, h / 2);
  });
  return new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 0.75),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
}

function makeFlag(THREE, num, color) {
  const g = new THREE.Group();
  addMesh(g, new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), glow(THREE, 0xe8e8f0, 0.4), 0, 0.42, 0);
  const tex = canvasTex(THREE, 128, 96, (ctx) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 96);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 70px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(num), 64, 50);
  });
  // Two planes facing opposite ways so the number is never mirrored
  const matF = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide, transparent: true });
  const matB = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide, transparent: true });
  const f1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), matF);
  f1.position.set(0.28, 0.72, 0); g.add(f1);
  const f2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), matB);
  f2.position.set(0.28, 0.72, 0); f2.rotation.y = Math.PI; g.add(f2);
  return g;
}

/** Merge direct-child static meshes that share a material. Skips noMerge/dynamic. */
function mergeStatic(THREE, root) {
  root.updateMatrixWorld(true);
  const toMerge = [];
  for (const o of [...root.children]) {
    if (!o.isMesh || o.userData.noMerge || o.userData.dynamic) continue;
    toMerge.push(o);
  }
  const buckets = new Map();
  for (const o of toMerge) {
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [] });
    o.updateMatrixWorld(true);
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    buckets.get(key).geos.push(g);
    root.remove(o);
    o.geometry.dispose();
  }
  for (const { mat, geos } of buckets.values()) {
    if (geos.length < 1) continue;
    if (geos.length === 1) {
      const m = new THREE.Mesh(geos[0], mat); root.add(m); continue;
    }
    const merged = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!merged) continue;
    root.add(new THREE.Mesh(merged, mat));
  }
}

function baseRoom(THREE, opts) {
  const { w = 5.4, l = 10, neon = MAG, name = '', num = 1, par = 3 } = opts;
  const group = new THREE.Group(); group.name = 'hole' + num;
  const halfW = w / 2, halfL = l / 2;
  const colliders = [];
  const ramps = [];
  const movers = [];
  const css = hexCss(neon);

  const feltMap = feltTex(THREE);
  feltMap.wrapS = feltMap.wrapT = THREE.RepeatWrapping; feltMap.repeat.set(4, 7);
  const floorMap = floorTex(THREE);
  floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping; floorMap.repeat.set(6, 10);

  const wallPad = 0.22; // room walls sit just outside neon rails
  // Room hugs the green: no empty floor border. Gloss underlay matches course footprint.
  const roomMargin = 0.08; // tiny under-rail strip only
  const roomFloor = addMesh(group,
    new THREE.PlaneGeometry(w + wallPad * 2 + roomMargin, l + wallPad * 2 + roomMargin),
    mat(THREE, 0x07070e, { map: floorMap, roughness: 0.18, metalness: 0.92, envMapIntensity: 1.05 }),
    0, 0, 0, -Math.PI / 2, 0, 0);

  // Green felt fills the room floor wall-to-wall (rails sit on its edges)
  const green = addMesh(group,
    new THREE.BoxGeometry(w, 0.08, l),
    mat(THREE, GREEN, { map: feltMap, roughness: 0.9, metalness: 0.02 }),
    0, 0.04, 0);

  // Neon edge rails = room perimeter
  const railMat = glow(THREE, neon, 3.4);
  const wallH = 0.22, wallT = 0.14;
  addMesh(group, new THREE.BoxGeometry(wallT, wallH, l + wallT * 2), railMat, -halfW - wallT / 2, wallH / 2, 0);
  addMesh(group, new THREE.BoxGeometry(wallT, wallH, l + wallT * 2), railMat, halfW + wallT / 2, wallH / 2, 0);
  addMesh(group, new THREE.BoxGeometry(w + wallT * 2, wallH, wallT), railMat, 0, wallH / 2, -halfL - wallT / 2);
  addMesh(group, new THREE.BoxGeometry(w + wallT * 2, wallH, wallT), railMat, 0, wallH / 2, halfL + wallT / 2);
  // Soft outer glow along rails near cup
  const soft = glow(THREE, neon, 1.0);
  addMesh(group, new THREE.BoxGeometry(0.05, 0.05, 2.0), soft, -halfW - wallT - 0.02, 0.04, halfL - 1.5);
  addMesh(group, new THREE.BoxGeometry(0.05, 0.05, 2.0), soft, halfW + wallT + 0.02, 0.04, halfL - 1.5);

  // Wall colliders (play bounds = green edges)
  colliders.push({ type: 'aabb', minX: -halfW - 1, maxX: -halfW, minZ: -halfL - 1, maxZ: halfL + 1 });
  colliders.push({ type: 'aabb', minX: halfW, maxX: halfW + 1, minZ: -halfL - 1, maxZ: halfL + 1 });
  colliders.push({ type: 'aabb', minX: -halfW - 1, maxX: halfW + 1, minZ: -halfL - 1, maxZ: -halfL });
  colliders.push({ type: 'aabb', minX: -halfW - 1, maxX: halfW + 1, minZ: halfL, maxZ: halfL + 1 });

  // Room walls hug the rails (green runs wall to wall)
  const wallMat = mat(THREE, 0x080810, { roughness: 0.75, metalness: 0.35, envMapIntensity: 0.6 });
  const roomH = 3.4;
  const wallX = halfW + wallPad;      // just outside rails
  const wallFarZ = halfL + wallPad;
  const wallNearZ = -halfL - wallPad;
  const wallThick = 0.16;
  // Far wall (behind cup) — holds sign
  addMesh(group, new THREE.BoxGeometry(w + wallPad * 2 + wallThick * 2, roomH, wallThick), wallMat, 0, roomH / 2, wallFarZ + wallThick / 2);
  // NO full near wall: camera sits south of the tee and a solid near wall blacked out
  // the whole lower half of the phone view. Open south end; short kickboard only.
  const kickH = 0.28;
  addMesh(group, new THREE.BoxGeometry(w + wallPad * 2 + wallThick * 2, kickH, wallThick), wallMat, 0, kickH / 2, wallNearZ - wallThick / 2);
  // Side walls: stop at the near rail so they never sit between camera and green.
  // Open south end; length covers green + far pad only.
  // side segment: from z=-halfL (near rail) to past far wall — open south for camera
  const sideMidZ = (-halfL + wallFarZ + wallThick) / 2;
  const sideDepth = (wallFarZ + wallThick) - (-halfL);
  addMesh(group, new THREE.BoxGeometry(wallThick, roomH, sideDepth), wallMat, -wallX - wallThick / 2, roomH / 2, sideMidZ);
  addMesh(group, new THREE.BoxGeometry(wallThick, roomH, sideDepth), wallMat, wallX + wallThick / 2, roomH / 2, sideMidZ);
  // Corner neon pillars: full height at far; short kickboard pillars at near (open end)
  const pillar = glow(THREE, neon, 1.2);
  const cx = wallX + wallThick / 2, czF = wallFarZ + wallThick / 2, czN = wallNearZ - wallThick / 2;
  addMesh(group, new THREE.BoxGeometry(0.14, roomH, 0.14), pillar, -cx, roomH / 2, czF);
  addMesh(group, new THREE.BoxGeometry(0.14, roomH, 0.14), pillar, cx, roomH / 2, czF);
  addMesh(group, new THREE.BoxGeometry(0.14, kickH + 0.08, 0.14), pillar, -cx, (kickH + 0.08) / 2, czN);
  addMesh(group, new THREE.BoxGeometry(0.14, kickH + 0.08, 0.14), pillar, cx, (kickH + 0.08) / 2, czN);
  // Neon accents on far wall only (never across the green)
  const stripA = glow(THREE, neon, 2.2);
  const stripB = glow(THREE, neon === MAG ? CYAN : neon === CYAN ? MAG : CYAN, 1.8);
  const farFace = wallFarZ - 0.01;
  addMesh(group, new THREE.BoxGeometry(w * 0.95, 0.07, 0.07), stripA, 0, 0.35, farFace);
  addMesh(group, new THREE.BoxGeometry(w * 0.55, 0.06, 0.06), stripB, 0, 0.55, farFace);
  addMesh(group, new THREE.BoxGeometry(0.08, 2.0, 0.08), stripA, -halfW + 0.15, 1.3, farFace);
  addMesh(group, new THREE.BoxGeometry(0.08, 2.0, 0.08), stripB, halfW - 0.15, 1.3, farFace);
  // Wall panels on far + side walls (flush)
  const panelA = glow(THREE, neon, 0.35);
  const panelB = glow(THREE, neon === MAG ? CYAN : neon === CYAN ? ORANGE : MAG, 0.28);
  addMesh(group, new THREE.BoxGeometry(Math.min(1.5, w * 0.35), 1.0, 0.04), panelA, -w * 0.28, 1.7, farFace);
  addMesh(group, new THREE.BoxGeometry(Math.min(1.5, w * 0.35), 1.0, 0.04), panelB, w * 0.28, 1.7, farFace);
  const sideFaceL = -wallX + 0.01, sideFaceR = wallX - 0.01;
  addMesh(group, new THREE.BoxGeometry(0.04, 1.2, Math.min(2.0, l * 0.28)), panelA, sideFaceL, 1.5, -l * 0.2);
  addMesh(group, new THREE.BoxGeometry(0.04, 1.2, Math.min(2.0, l * 0.28)), panelB, sideFaceR, 1.5, -l * 0.2);
  addMesh(group, new THREE.BoxGeometry(0.04, 1.2, Math.min(2.0, l * 0.28)), panelB, sideFaceL, 1.5, l * 0.2);
  addMesh(group, new THREE.BoxGeometry(0.04, 1.2, Math.min(2.0, l * 0.28)), panelA, sideFaceR, 1.5, l * 0.2);

  // Cup with glowing ring
  const cupZ = halfL - 0.95;
  const cupX = 0;
  const cupR = 0.11;
  addMesh(group, new THREE.CylinderGeometry(cupR, cupR, 0.05, 20), mat(THREE, 0x0a0a0a), cupX, 0.06, cupZ);
  const cupRing = addMesh(group, new THREE.TorusGeometry(cupR + 0.04, 0.025, 8, 24),
    glow(THREE, neon, 2.0), cupX, 0.09, cupZ, Math.PI / 2, 0, 0);
  cupRing.userData.noMerge = true;
  const flag = makeFlag(THREE, num, css);
  flag.position.set(cupX, 0.08, cupZ); flag.userData.noMerge = true; group.add(flag);

  // Neon sign mounted on far wall (hugged to course)
  const sign = makeSign(THREE, num + '. ' + name.toUpperCase(), css);
  sign.position.set(0, 2.55, halfL + wallPad - 0.02); sign.rotation.y = Math.PI;
  sign.userData.noMerge = true; group.add(sign);

  // Exit teleporter beyond cup (hidden until sink)
  const door = new THREE.Group(); door.name = 'exitDoor'; door.visible = false;
  door.userData.noMerge = true;
  const portalMat = glow(THREE, CYAN, 2.2);
  const portalMat2 = glow(THREE, MAG, 1.6);
  addMesh(door, new THREE.TorusGeometry(0.7, 0.07, 10, 32), portalMat, 0, 1.25, 0);
  addMesh(door, new THREE.TorusGeometry(0.55, 0.04, 8, 28), portalMat2, 0, 1.25, 0);
  const disc = addMesh(door, new THREE.CircleGeometry(0.5, 24),
    new THREE.MeshBasicMaterial({ color: 0x66f0ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    0, 1.25, 0);
  door.position.set(0, 0, halfL + wallPad + 0.55); group.add(door);

  // Lights local to room
  const pl = new THREE.PointLight(neon, 2.4, 16, 2); pl.position.set(0, 3.2, 0); group.add(pl);
  const pl2 = new THREE.PointLight(0xfff5e8, 1.1, 14, 2); pl2.position.set(0, 2.8, -halfL * 0.4); group.add(pl2);
  const pl3 = new THREE.PointLight(CYAN, 1.0, 12, 2); pl3.position.set(0, 2.6, halfL * 0.45); group.add(pl3);

  const tee = { x: 0, z: -halfL + 1.15 };
  const cup = { x: cupX, z: cupZ, r: cupR };
  const bounds = { minX: -halfW - 0.5, maxX: halfW + 0.5, minZ: -halfL - 0.5, maxZ: halfL + 0.5 };
  addMesh(group, new THREE.CylinderGeometry(0.08, 0.08, 0.015, 16), glow(THREE, 0xffffff, 1.2), tee.x, 0.09, tee.z);

  return { group, colliders, ramps, movers, tee, cup, par, bounds, name, neon, w, l, halfW, halfL, door };
}

function aabbAround(x, z, hw, hd) {
  return { type: 'aabb', minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd };
}
function circleAt(x, z, r) { return { type: 'circle', x, z, r }; }

export function buildHole(THREE, index) {
  T = THREE;
  const builders = [holeStrike, holeGhost, holeMonkey, holeBerserker, holeOrc, holeCyber, holeBlaster, holePip, holeBurrow];
  const H = builders[index](THREE);
  flattenStaticGroups(H.group);
  mergeStatic(THREE, H.group);
  return H;
}

/** Pull meshes out of static groups onto root so they can merge. Keep dynamic groups intact. */
function flattenStaticGroups(root) {
  const groups = root.children.filter(c => c.isGroup && !c.userData.dynamic && !c.userData.noMerge);
  for (const g of groups) {
    const meshes = [];
    g.updateMatrixWorld(true);
    g.traverse(o => { if (o.isMesh) meshes.push(o); });
    for (const m of meshes) {
      m.updateMatrixWorld(true);
      const pos = new T.Vector3(), quat = new T.Quaternion(), scl = new T.Vector3();
      m.matrixWorld.decompose(pos, quat, scl);
      g.remove(m);
      root.add(m);
      m.position.copy(pos); m.quaternion.copy(quat); m.scale.copy(scl);
    }
    root.remove(g);
  }
}


/* ---- Strike shmup art (ported from /workspace/strike/src/gfx.js DRAW + PAL, read-only) ---- */
const STRIKE_PAL = {
  mil: { a: '#8c9a6e', b: '#56653f', c: '#e8603a', d: '#2b3424', g: '#ffd65a', e: '#c9d2a0' },
  steel: { a: '#9aa4b6', b: '#5d677c', c: '#ff8a2a', d: '#2a3042', g: '#7af0ff', e: '#d8deea' },
  navy: { a: '#6a80c0', b: '#3a4a86', c: '#ff4a86', d: '#1a2046', g: '#8affd8', e: '#b8c8f0' },
  elite: { a: '#d0404e', b: '#801c2c', c: '#ffd83a', d: '#2a0812', g: '#ffffff', e: '#ffa8a8' },
};
function _poly(x, pts, col) {
  x.fillStyle = col; x.beginPath(); x.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
  x.closePath(); x.fill();
}
function _mirPoly(x, w, pts, col) {
  _poly(x, pts, col);
  const m = pts.slice();
  for (let i = 0; i < m.length; i += 2) m[i] = w - m[i];
  _poly(x, m, col);
}
function _rect(x, a, b, ww, hh, col) { x.fillStyle = col; x.fillRect(a, b, ww, hh); }
function makeStrikeCanvas(kind) {
  const c = document.createElement('canvas');
  const p = STRIKE_PAL.mil;
  if (kind === 'player') {
    c.width = 60; c.height = 68; const x = c.getContext('2d'); const w = 60;
    const S = 2; // 2x Strike 30x34
    const M = (pts, col) => _mirPoly(x, w, pts.map((v, i) => v * S), col);
    const P = (pts, col) => _poly(x, pts.map((v, i) => v * S), col);
    const R = (a, b, ww, hh, col) => _rect(x, a * S, b * S, ww * S, hh * S, col);
    M([15, 1, 17, 6, 18, 14, 18, 28, 15, 31], '#e6edf8');
    M([17, 12, 28, 21, 29, 25, 18, 24], '#aebcd6');
    M([18, 16, 26, 21, 26, 22.5, 18, 19.5], '#2f6cff');
    M([27, 18, 29, 19, 29, 26, 27, 25], '#ff4a4a');
    M([24, 14, 25, 14, 25, 20, 24, 20], '#6a7a9a');
    M([18, 23, 23, 28, 23, 32, 18, 29], '#8494b4');
    M([17, 22, 20, 22, 20, 31, 17, 31], '#39425e');
    M([17.5, 29, 19.5, 29, 19.5, 32, 17.5, 32], '#ff9040');
    x.fillStyle = '#1a60d0'; x.beginPath(); x.ellipse(15 * S, 11 * S, 2.4 * S, 4 * S, 0, 0, Math.PI * 2); x.fill();
    R(14, 8, 1, 4, '#c8f8ff'); R(14, 17, 2, 9, '#2f6cff');
  } else if (kind === 'fighter') {
    c.width = 36; c.height = 36; const x = c.getContext('2d'); const w = 36; const S = 2;
    const M = (pts, col) => _mirPoly(x, w, pts.map(v => v * S), col);
    M([9, 17, 11, 12, 11, 4, 9, 1], p.a); M([10, 4, 17, 1, 17, 5, 11, 11], p.b);
    M([16, 1, 17, 1, 17, 6, 16, 6], p.c); _rect(x, 8 * S, 10 * S, 2 * S, 3 * S, p.g);
  } else if (kind === 'bomber') {
    c.width = 56; c.height = 48; const x = c.getContext('2d'); const w = 56; const S = 2;
    const M = (pts, col) => _mirPoly(x, w, pts.map(v => v * S), col);
    M([14, 23, 17, 18, 17, 2, 14, 0], p.a); M([16, 7, 27, 10, 27, 14, 16, 15], p.b);
    M([16, 1, 20, 0, 20, 3, 16, 5], p.b);
    _rect(x, 19 * S, 5 * S, 3 * S, 12 * S, p.d); _rect(x, 25 * S, 10 * S, 2 * S, 4 * S, p.c);
    _rect(x, 13 * S, 15 * S, 2 * S, 4 * S, p.g);
  } else if (kind === 'gunship') {
    c.width = 76; c.height = 64; const x = c.getContext('2d'); const w = 76; const S = 2;
    const M = (pts, col) => _mirPoly(x, w, pts.map(v => v * S), col);
    const pp = STRIKE_PAL.steel;
    M([19, 31, 24, 26, 25, 6, 19, 1], pp.a); M([23, 9, 36, 13, 36, 22, 24, 24], pp.b);
    M([30, 20, 33, 20, 33, 29, 30, 29], pp.d);
    _rect(x, 33 * S, 13 * S, 3 * S, 4 * S, pp.c); _rect(x, 16 * S, 20 * S, 6 * S, 5 * S, pp.g);
  } else if (kind === 'title') {
    c.width = 512; c.height = 160; const x = c.getContext('2d');
    x.fillStyle = '#0a0614'; x.fillRect(0, 0, 512, 160);
    x.strokeStyle = '#ff7a1a'; x.lineWidth = 6; x.strokeRect(10, 10, 492, 140);
    x.fillStyle = '#ff7a1a'; x.font = 'bold 72px monospace'; x.textAlign = 'center';
    x.fillText('STRIKE', 256, 88);
    x.fillStyle = '#2de8ff'; x.font = 'bold 22px monospace';
    x.fillText('ARCADE SHMUP', 256, 124);
  } else if (kind === 'boss') {
    c.width = 128; c.height = 160; const x = c.getContext('2d');
    const pp = STRIKE_PAL.elite;
    // destroyer-ish silhouette
    x.fillStyle = pp.d; x.beginPath();
    x.moveTo(64, 8); x.lineTo(96, 28); x.lineTo(108, 90); x.lineTo(96, 140); x.lineTo(64, 152);
    x.lineTo(32, 140); x.lineTo(20, 90); x.lineTo(32, 28); x.closePath(); x.fill();
    x.fillStyle = pp.a; x.beginPath();
    x.moveTo(64, 16); x.lineTo(88, 34); x.lineTo(96, 88); x.lineTo(88, 130); x.lineTo(64, 140);
    x.lineTo(40, 130); x.lineTo(32, 88); x.lineTo(40, 34); x.closePath(); x.fill();
    x.fillStyle = pp.c; x.fillRect(58, 50, 12, 40); x.fillStyle = pp.g; x.beginPath(); x.arc(64, 70, 10, 0, Math.PI * 2); x.fill();
  }
  return c;
}
function strikeTex(THREE, kind) {
  const c = makeStrikeCanvas(kind);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}
function strikeIconTex(THREE) {
  const img = new Image();
  img.src = STRIKE_ICON_DATAURL;
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.SRGBColorSpace;
  img.onload = () => { t.needsUpdate = true; };
  t.needsUpdate = true;
  return t;
}
function makeStrikeShip3D(THREE, kind) {
  // Low-poly top-down ships using Strike palette colours
  const g = new THREE.Group(); g.userData.noMerge = true; g.userData.dynamic = true;
  const mk = (geo, col, em, ei, x, y, z, sx, sy, sz) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: col, emissive: em || col, emissiveIntensity: ei || 0.35, roughness: 0.45, metalness: 0.35,
    }));
    m.position.set(x, y, z); if (sx) m.scale.set(sx, sy || sx, sz || sx); g.add(m); return m;
  };
  if (kind === 'player') {
    mk(new THREE.BoxGeometry(0.18, 0.1, 0.55), 0xe6edf8, 0xa0b8e0, 0.25, 0, 0.14, 0);
    mk(new THREE.ConeGeometry(0.1, 0.22, 6), 0xe6edf8, 0xa0b8e0, 0.25, 0, 0.14, 0.36).rotation.x = Math.PI / 2;
    mk(new THREE.BoxGeometry(0.78, 0.04, 0.2), 0xaebcd6, 0x2f6cff, 0.45, 0, 0.12, -0.02);
    mk(new THREE.BoxGeometry(0.5, 0.03, 0.1), 0x2f6cff, 0x2f6cff, 0.9, 0, 0.13, 0.02);
    mk(new THREE.BoxGeometry(0.1, 0.04, 0.16), 0xff4a4a, 0xff4a4a, 1.0, -0.38, 0.12, -0.02);
    mk(new THREE.BoxGeometry(0.1, 0.04, 0.16), 0xff4a4a, 0xff4a4a, 1.0, 0.38, 0.12, -0.02);
    mk(new THREE.CylinderGeometry(0.04, 0.05, 0.1, 6), 0xff9040, 0xff9040, 1.4, -0.08, 0.12, -0.3).rotation.x = Math.PI / 2;
    mk(new THREE.CylinderGeometry(0.04, 0.05, 0.1, 6), 0xff9040, 0xff9040, 1.4, 0.08, 0.12, -0.3).rotation.x = Math.PI / 2;
    mk(new THREE.SphereGeometry(0.055, 8, 8), 0x1a60d0, 0xc8f8ff, 1.2, 0, 0.2, 0.08);
  } else if (kind === 'fighter') {
    const pa = 0x8c9a6e, pb = 0x56653f, pc = 0xe8603a;
    mk(new THREE.BoxGeometry(0.14, 0.08, 0.42), pa, pa, 0.3, 0, 0.12, 0);
    mk(new THREE.ConeGeometry(0.08, 0.18, 5), pa, pa, 0.3, 0, 0.12, 0.28).rotation.x = Math.PI / 2;
    mk(new THREE.BoxGeometry(0.55, 0.03, 0.16), pb, pc, 0.5, 0, 0.11, -0.02);
    mk(new THREE.BoxGeometry(0.08, 0.03, 0.12), pc, pc, 1.0, -0.26, 0.11, 0.05);
    mk(new THREE.BoxGeometry(0.08, 0.03, 0.12), pc, pc, 1.0, 0.26, 0.11, 0.05);
  } else if (kind === 'bomber') {
    const pa = 0x8c9a6e, pb = 0x56653f, pc = 0xe8603a;
    mk(new THREE.BoxGeometry(0.22, 0.12, 0.7), pa, pa, 0.25, 0, 0.14, 0);
    mk(new THREE.BoxGeometry(0.95, 0.05, 0.28), pb, pb, 0.3, 0, 0.12, -0.05);
    mk(new THREE.BoxGeometry(0.12, 0.08, 0.2), pc, pc, 0.8, -0.4, 0.14, 0.1);
    mk(new THREE.BoxGeometry(0.12, 0.08, 0.2), pc, pc, 0.8, 0.4, 0.14, 0.1);
  } else { // gunship
    const pa = 0x9aa4b6, pb = 0x5d677c, pc = 0xff8a2a;
    mk(new THREE.BoxGeometry(0.26, 0.14, 0.85), pa, pa, 0.25, 0, 0.16, 0);
    mk(new THREE.BoxGeometry(1.1, 0.06, 0.35), pb, pb, 0.3, 0, 0.13, -0.05);
    mk(new THREE.BoxGeometry(0.14, 0.1, 0.35), pc, pc, 0.9, -0.45, 0.16, 0.15);
    mk(new THREE.BoxGeometry(0.14, 0.1, 0.35), pc, pc, 0.9, 0.45, 0.16, 0.15);
    mk(new THREE.BoxGeometry(0.2, 0.08, 0.2), 0x7af0ff, 0x7af0ff, 1.0, 0, 0.22, 0.1);
  }
  return g;
}

function holeStrike(THREE) {
  const H = baseRoom(THREE, { neon: ORANGE, name: 'Strike', num: 1, par: 3, w: 5.2, l: 10 });
  // Strike-themed fleet (colours/shapes from Strike gfx.js DRAW.player/fighter/bomber/gunship)
  const fleet = [
    ['player', 0, -2.2, 0, 0.36],
    ['fighter', -1.45, -0.8, 0.6, 0.32],
    ['fighter', 1.5, -1.4, -0.4, 0.32],
    ['fighter', -1.2, 1.3, 1.0, 0.32],
    ['bomber', 1.15, 0.7, 0.3, 0.42],
    ['fighter', 0.2, 2.2, -0.9, 0.32],
    ['gunship', -1.35, 3.0, 0.5, 0.48],
    ['fighter', 1.4, 3.3, -0.2, 0.32],
  ];
  fleet.forEach(([kind, x, z, rot, rad]) => {
    const s = makeStrikeShip3D(THREE, kind);
    s.position.set(x, 0.05, z); s.rotation.y = rot; H.group.add(s);
    H.colliders.push(circleAt(x, z, rad));
  });

  // Flat bullet-trail decals on the green (Strike player cyan + enemy orange) — NOT spheres
  const trailCyan = new THREE.MeshBasicMaterial({ color: 0x2f6cff, transparent: true, opacity: 0.55, depthWrite: false });
  const trailHot = new THREE.MeshBasicMaterial({ color: 0xffe23a, transparent: true, opacity: 0.5, depthWrite: false });
  const trailRed = new THREE.MeshBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0.45, depthWrite: false });
  [[0.35, -1.5, 0.04, 0.55, trailCyan], [-0.6, 0.2, 0.035, 0.7, trailHot],
   [0.9, 1.6, 0.04, 0.5, trailCyan], [-0.3, 2.6, 0.03, 0.65, trailRed],
   [1.1, -2.5, 0.035, 0.4, trailHot], [-1.0, -2.8, 0.03, 0.45, trailCyan],
   [0.5, 0.9, 0.03, 0.35, trailRed], [-1.2, 2.0, 0.035, 0.5, trailHot]].forEach(([x, z, w, l, mat]) => {
    const d = addMesh(H.group, new THREE.BoxGeometry(w, 0.012, l), mat, x, 0.095, z);
    d.userData.noMerge = true;
  });

  // Wall posters: Strike title + icon + enemy sprite panels + boss silhouette + laser beams
  const halfW = H.halfW, halfL = H.halfL;
  const wallPad = 0.22;
  const farZ = halfL + wallPad - 0.03;
  const sideL = -halfW - wallPad + 0.03;
  const sideR = halfW + wallPad - 0.03;

  const titleTex = strikeTex(THREE, 'title');
  const titleMat = new THREE.MeshBasicMaterial({ map: titleTex, transparent: true });
  // Sit just in front of baseRoom wall panels (farFace) so art faces camera
  const artZ = farZ - 0.04;
  const title = addMesh(H.group, new THREE.PlaneGeometry(2.6, 0.85), titleMat, -1.0, 2.05, artZ);
  title.rotation.y = Math.PI; title.userData.noMerge = true;

  const iconTex = strikeIconTex(THREE);
  const iconMat = new THREE.MeshBasicMaterial({ map: iconTex, transparent: true });
  const icon = addMesh(H.group, new THREE.PlaneGeometry(0.95, 0.95), iconMat, 1.4, 2.1, artZ);
  icon.rotation.y = Math.PI; icon.userData.noMerge = true;

  const bossTex = strikeTex(THREE, 'boss');
  const bossMat = new THREE.MeshBasicMaterial({ map: bossTex, transparent: true, opacity: 0.95 });
  const boss = addMesh(H.group, new THREE.PlaneGeometry(1.25, 1.5), bossMat, 0.2, 1.2, artZ);
  boss.rotation.y = Math.PI; boss.userData.noMerge = true;

  // Orange laser beams painted on far wall (Strike big-enemy lasers)
  const laserMat = glow(THREE, 0xff8a1a, 2.4);
  addMesh(H.group, new THREE.BoxGeometry(2.8, 0.06, 0.04), laserMat, -0.3, 0.85, farZ);
  addMesh(H.group, new THREE.BoxGeometry(2.2, 0.045, 0.04), laserMat, 0.5, 1.05, farZ);
  const laserHot = glow(THREE, 0xfff0c0, 2.0);
  addMesh(H.group, new THREE.BoxGeometry(2.8, 0.02, 0.03), laserHot, -0.3, 0.85, farZ - 0.01);

  // Side-wall enemy sprite posters
  [['fighter', sideL, -1.5, Math.PI / 2], ['bomber', sideL, 1.2, Math.PI / 2],
   ['gunship', sideR, -0.8, -Math.PI / 2], ['player', sideR, 1.8, -Math.PI / 2]].forEach(([kind, x, z, ry]) => {
    const tex = strikeTex(THREE, kind);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const pl = addMesh(H.group, new THREE.PlaneGeometry(0.7, 0.7), mat, x, 1.55, z);
    pl.rotation.y = ry; pl.userData.noMerge = true;
  });

  // Flag hole 1 as wanting a rich Strike sky (game.js boosts star density/scroll)
  H.spaceSky = 'strike';
  return H;
}

function holeGhost(THREE) {
  const H = baseRoom(THREE, { neon: MAG, name: 'Ghost 256', num: 2, par: 3, w: 5.5, l: 10 });
  const wall = glow(THREE, 0x1a3aee, 1.1);
  const wallTop = glow(THREE, 0x40a0ff, 1.4);
  // Fair Pac-maze: tee → right-gap bar → left-gap bar → cup. Gaps ≥ 1.5wu (~16 ball diameters).
  // No vertical sealed into the south rail (that trapped the tee on the old layout).
  const walls = [
    // Bar A (south): opens RIGHT. x∈[-2.2, 1.0] → right gap 1.0..2.75 = 1.75
    [-0.6, -1.6, 1.6, 0.16],
    // Decorative side stubs (leave corridors open)
    [-2.05, -0.2, 0.14, 0.9],
    [2.05, 0.4, 0.14, 0.9],
    // Bar B (north): opens LEFT. x∈[-1.0, 2.2] → left gap -2.75..-1.0 = 1.75
    [0.6, 1.5, 1.6, 0.16],
    // Cup approach posts (wide center lane)
    [-1.35, 3.1, 0.14, 0.7],
    [1.35, 3.1, 0.14, 0.7],
  ];
  walls.forEach(([x, z, hw, hd]) => {
    addMesh(H.group, new THREE.BoxGeometry(hw * 2, 0.55, hd * 2), wall, x, 0.32, z);
    addMesh(H.group, new THREE.BoxGeometry(hw * 2 + 0.04, 0.06, hd * 2 + 0.04), wallTop, x, 0.62, z);
    H.colliders.push(aabbAround(x, z, hw, hd));
  });
  // Pink ghost — LEFT alley only (never seals the right-hand Bar A gap)
  const ghost = new THREE.Group(); ghost.userData.dynamic = true; ghost.userData.noMerge = true;
  const gMat = glow(THREE, MAG, 1.7);
  addMesh(ghost, new THREE.SphereGeometry(0.22, 14, 12), gMat, 0, 0.30, 0);
  addMesh(ghost, new THREE.CylinderGeometry(0.22, 0.22, 0.22, 12), gMat, 0, 0.14, 0);
  for (let i = 0; i < 4; i++) {
    addMesh(ghost, new THREE.SphereGeometry(0.08, 8, 8), gMat, -0.18 + i * 0.12, 0.02, 0);
  }
  addMesh(ghost, new THREE.SphereGeometry(0.06, 8, 8), mat(THREE, 0xffffff), -0.08, 0.38, 0.2);
  addMesh(ghost, new THREE.SphereGeometry(0.06, 8, 8), mat(THREE, 0xffffff), 0.08, 0.38, 0.2);
  addMesh(ghost, new THREE.SphereGeometry(0.03, 6, 6), mat(THREE, 0x111111), -0.08, 0.38, 0.26);
  addMesh(ghost, new THREE.SphereGeometry(0.03, 6, 6), mat(THREE, 0x111111), 0.08, 0.38, 0.26);
  const gPath = [
    [-2.15, -3.0], [-2.15, -0.8], [-2.15, 0.6], [-2.15, -1.5], [-2.15, -3.0],
  ];
  ghost.position.set(gPath[0][0], 0, gPath[0][1]); H.group.add(ghost);
  const gCol = circleAt(gPath[0][0], gPath[0][1], 0.18); H.colliders.push(gCol);
  const mazeWalls = H.colliders.filter(c => c.type === 'aabb' && (c.maxX - c.minX) < 6 && (c.maxZ - c.minZ) < 8);
  H.movers.push({
    kind: 'ghost', mesh: ghost, col: gCol, t: 0, path: gPath, seg: 0, _d: 0,
    update(dt) {
      this.t += dt;
      const speed = 0.9;
      if (this._d == null) this._d = 0;
      const a = this.path[this.seg];
      const b = this.path[(this.seg + 1) % this.path.length];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz) || 1;
      this._d += speed * dt;
      while (this._d >= len) {
        this._d -= len;
        this.seg = (this.seg + 1) % this.path.length;
        break;
      }
      const a2 = this.path[this.seg];
      const b2 = this.path[(this.seg + 1) % this.path.length];
      const dx2 = b2[0] - a2[0], dz2 = b2[1] - a2[1];
      const len2 = Math.hypot(dx2, dz2) || 1;
      const u = Math.min(1, this._d / len2);
      let x = a2[0] + dx2 * u, z = a2[1] + dz2 * u;
      const gr = gCol.r + 0.08;
      for (const w of mazeWalls) {
        const cx = Math.max(w.minX, Math.min(x, w.maxX));
        const cz = Math.max(w.minZ, Math.min(z, w.maxZ));
        let ox = x - cx, oz = z - cz;
        let d = Math.hypot(ox, oz);
        if (d < gr) {
          if (d < 1e-6) { ox = 1; oz = 0; d = 1; }
          const pen = gr - d;
          x += (ox / d) * pen; z += (oz / d) * pen;
        }
      }
      ghost.position.x = x; ghost.position.z = z; gCol.x = x; gCol.z = z;
    }
  });
  return H;
}

function holeMonkey(THREE) {
  const H = baseRoom(THREE, { neon: CYAN, name: 'Monkey Crossing', num: 3, par: 3, w: 5.3, l: 10 });
  addMesh(H.group, new THREE.BoxGeometry(4.8, 0.03, 3.4), mat(THREE, 0x2a2a34, { roughness: 0.95 }), 0, 0.09, 0.3);
  const lane = glow(THREE, 0xfff2a0, 0.7);
  for (let z = -1.1; z <= 1.7; z += 0.65) {
    addMesh(H.group, new THREE.BoxGeometry(0.18, 0.02, 0.38), lane, 0, 0.11, z);
  }
  const carCols = [0x2b7bff, 0xff3030, 0xffc81e, 0x2fae3a];
  carCols.forEach((col, i) => {
    const car = new THREE.Group(); car.userData.dynamic = true; car.userData.noMerge = true;
    addMesh(car, new THREE.BoxGeometry(0.75, 0.3, 0.42), glow(THREE, col, 0.5), 0, 0.22, 0);
    addMesh(car, new THREE.BoxGeometry(0.48, 0.2, 0.38), mat(THREE, 0x1a1a28), 0, 0.4, 0);
    addMesh(car, new THREE.BoxGeometry(0.2, 0.08, 0.08), glow(THREE, 0xffffaa, 1.5), 0.38, 0.2, 0.12);
    addMesh(car, new THREE.BoxGeometry(0.2, 0.08, 0.08), glow(THREE, 0xffffaa, 1.5), 0.38, 0.2, -0.12);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      addMesh(car, new THREE.CylinderGeometry(0.09, 0.09, 0.08, 10), mat(THREE, 0x111111), 0.28 * sx, 0.1, 0.2 * sz, 0, 0, Math.PI / 2);
    }
    const laneZ = -0.95 + i * 0.75;
    car.position.set(-2.6, 0, laneZ); H.group.add(car);
    const colider = aabbAround(-2.6, laneZ, 0.42, 0.28); H.colliders.push(colider);
    const dir = i % 2 === 0 ? 1 : -1;
    const speed = 1.7 + i * 0.3;
    H.movers.push({
      kind: 'car', mesh: car, col: colider, t: i * 1.1, dir, speed, lane: laneZ,
      update(dt) {
        this.t += dt;
        let x = ((this.t * this.speed * this.dir) % 6.2) - 3.1;
        if (this.dir < 0) x = -x;
        car.position.x = x; car.position.z = this.lane;
        colider.minX = x - 0.42; colider.maxX = x + 0.42;
        colider.minZ = this.lane - 0.28; colider.maxZ = this.lane + 0.28;
      }
    });
  });
  // Cartoon monkey statue (pink cap + hoodie so it reads from camera)
  const mk = new THREE.Group();
  const fur = mat(THREE, 0x5a3218, { roughness: 0.9 });
  const skin = mat(THREE, 0xe0b080, { roughness: 0.7 });
  const hoodie = glow(THREE, 0x2a3a9a, 0.35);
  const cap = glow(THREE, 0xff4f9e, 0.9);
  addMesh(mk, new THREE.CylinderGeometry(0.16, 0.18, 0.38, 10), hoodie, 0, 0.28, 0);
  addMesh(mk, new THREE.SphereGeometry(0.2, 12, 12), fur, 0, 0.62, 0);
  addMesh(mk, new THREE.SphereGeometry(0.13, 10, 10), skin, 0, 0.55, 0.14);
  addMesh(mk, new THREE.CylinderGeometry(0.21, 0.22, 0.1, 12), cap, 0, 0.78, 0);
  addMesh(mk, new THREE.BoxGeometry(0.28, 0.05, 0.22), cap, 0, 0.74, 0.12);
  addMesh(mk, new THREE.SphereGeometry(0.045, 6, 6), mat(THREE, 0x111111), -0.07, 0.65, 0.16);
  addMesh(mk, new THREE.SphereGeometry(0.045, 6, 6), mat(THREE, 0x111111), 0.07, 0.65, 0.16);
  mk.position.set(1.7, 0, H.halfL - 1.7); H.group.add(mk);
  H.colliders.push(circleAt(1.7, H.halfL - 1.7, 0.24));
  return H;
}

function holeBerserker(THREE) {
  const H = baseRoom(THREE, { neon: CYAN, name: 'Berserker', num: 4, par: 4, w: 5.5, l: 10.5 });
  const wood = mat(THREE, 0x7a4520, { roughness: 0.85 });
  const darkWood = mat(THREE, 0x4a2810, { roughness: 0.9 });
  const ship = new THREE.Group();
  addMesh(ship, new THREE.BoxGeometry(1.5, 0.3, 3.4), wood, 0, 0.25, 0);
  addMesh(ship, new THREE.BoxGeometry(0.16, 0.55, 3.2), wood, -0.72, 0.4, 0);
  addMesh(ship, new THREE.BoxGeometry(0.16, 0.55, 3.2), wood, 0.72, 0.4, 0);
  addMesh(ship, new THREE.BoxGeometry(0.35, 0.35, 0.7), darkWood, 0, 0.6, -1.8);
  addMesh(ship, new THREE.ConeGeometry(0.12, 0.9, 6), glow(THREE, 0x8a2a1a, 0.5), 0, 1.1, -2.05);
  // Shields along side
  for (let i = 0; i < 5; i++) {
    addMesh(ship, new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10), glow(THREE, 0xc45a2a, 0.4), -0.78, 0.55, -1.2 + i * 0.55, 0, 0, Math.PI / 2);
  }
  ship.position.set(0, 0, -0.4); H.group.add(ship);
  H.ramps.push({ minX: -0.65, maxX: 0.65, minZ: -2.0, maxZ: 1.1, y0: 0.4, y1: 0.05 });
  H.colliders.push(aabbAround(-0.8, -0.4, 0.14, 1.6));
  H.colliders.push(aabbAround(0.8, -0.4, 0.14, 1.6));
  // Wooden huts
  [[-1.9, 2.4], [1.9, 2.6], [-1.85, -3.0], [1.85, -2.6]].forEach(([x, z]) => {
    addMesh(H.group, new THREE.BoxGeometry(0.9, 0.7, 0.8), wood, x, 0.4, z);
    addMesh(H.group, new THREE.ConeGeometry(0.7, 0.5, 4), darkWood, x, 0.95, z, 0, Math.PI / 4, 0);
    H.colliders.push(aabbAround(x, z, 0.5, 0.45));
  });
  return H;
}

function holeOrc(THREE) {
  const H = baseRoom(THREE, { neon: MAG, name: 'Orc Attack', num: 5, par: 4, w: 5.3, l: 10 });
  const stone = mat(THREE, 0x6a6a74, { roughness: 0.92 });
  const darkStone = mat(THREE, 0x3a3a44, { roughness: 0.9 });
  addMesh(H.group, new THREE.BoxGeometry(1.6, 1.4, 0.45), stone, -1.75, 0.75, 0.4);
  addMesh(H.group, new THREE.BoxGeometry(1.6, 1.4, 0.45), stone, 1.75, 0.75, 0.4);
  H.colliders.push(aabbAround(-1.75, 0.4, 0.85, 0.28));
  H.colliders.push(aabbAround(1.75, 0.4, 0.85, 0.28));
  [[-2.25, 0.4], [2.25, 0.4]].forEach(([x, z]) => {
    addMesh(H.group, new THREE.CylinderGeometry(0.38, 0.42, 1.9, 12), stone, x, 1.0, z);
    addMesh(H.group, new THREE.CylinderGeometry(0.48, 0.48, 0.25, 12), darkStone, x, 2.0, z);
    // battlements
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      addMesh(H.group, new THREE.BoxGeometry(0.15, 0.25, 0.15), stone, x + Math.cos(a) * 0.4, 2.2, z + Math.sin(a) * 0.4);
    }
    H.colliders.push(circleAt(x, z, 0.42));
  });
  const bridge = addMesh(H.group, new THREE.BoxGeometry(1.5, 0.14, 1.7), mat(THREE, 0x6b3a1a), 0, 0.12, 0.5);
  bridge.userData.dynamic = true; bridge.userData.noMerge = true;
  const gate = { type: 'gate', minX: -0.75, maxX: 0.75, minZ: 0.05, maxZ: 0.95, open: true };
  H.colliders.push(gate);
  H.movers.push({
    kind: 'bridge', mesh: bridge, gate, t: 0,
    update(dt) {
      this.t += dt;
      const open = Math.sin(this.t * 0.7) > -0.2;
      this.gate.open = open;
      bridge.rotation.x = open ? 0 : -1.15;
      bridge.position.y = open ? 0.12 : 0.75;
      bridge.position.z = open ? 0.5 : 0.05;
    }
  });
  [[-1.1, 2.6], [1.0, 2.9], [0.15, 3.5], [-0.4, 2.2]].forEach(([x, z]) => {
    const o = new THREE.Group();
    addMesh(o, new THREE.CylinderGeometry(0.14, 0.16, 0.4, 8), glow(THREE, 0x3a9a2a, 0.55), 0, 0.25, 0);
    addMesh(o, new THREE.SphereGeometry(0.16, 10, 10), glow(THREE, 0x3a9a2a, 0.65), 0, 0.52, 0);
    addMesh(o, new THREE.ConeGeometry(0.05, 0.12, 6), mat(THREE, 0xf0f0f0), -0.08, 0.58, 0.1);
    addMesh(o, new THREE.ConeGeometry(0.05, 0.12, 6), mat(THREE, 0xf0f0f0), 0.08, 0.58, 0.1);
    o.position.set(x, 0, z); H.group.add(o);
    H.colliders.push(circleAt(x, z, 0.22));
  });
  return H;
}

function holeCyber(THREE) {
  const H = baseRoom(THREE, { neon: MAG, name: 'Cybercity', num: 6, par: 3, w: 5.3, l: 10 });
  const buildings = [
    [-1.85, -1.8, 0.75, 2.0, 0x7a2bff], [1.75, -2.2, 0.65, 2.4, 0x2b62e8],
    [-1.7, 1.3, 0.85, 1.7, 0xff2bd6], [1.85, 1.6, 0.6, 2.8, 0x2de8ff],
    [-0.15, -0.4, 0.5, 1.3, 0x6a2bff], [0.2, 3.0, 0.45, 1.5, 0x3a8cff],
  ];
  buildings.forEach(([x, z, hw, h, col]) => {
    addMesh(H.group, new THREE.BoxGeometry(hw * 2, h, hw * 2), glow(THREE, col, 0.65), x, h / 2, z);
    const win = glow(THREE, 0xaaf0ff, 1.6);
    for (let wy = 0.35; wy < h - 0.25; wy += 0.38) {
      addMesh(H.group, new THREE.BoxGeometry(hw * 1.5, 0.1, 0.04), win, x, wy, z + hw + 0.02);
    }
    H.colliders.push(aabbAround(x, z, hw, hw));
  });
  const plat = addMesh(H.group, new THREE.BoxGeometry(1.3, 0.14, 0.85), glow(THREE, CYAN, 1.0), 0, 0.12, 2.3);
  plat.userData.dynamic = true; plat.userData.noMerge = true;
  const pCol = aabbAround(0, 2.3, 0.7, 0.48); H.colliders.push(pCol);
  H.movers.push({
    kind: 'platform', mesh: plat, col: pCol, t: 0,
    update(dt) {
      this.t += dt;
      const x = Math.sin(this.t * 0.85) * 1.55;
      plat.position.x = x;
      pCol.minX = x - 0.7; pCol.maxX = x + 0.7;
    }
  });
  return H;
}

function holeBlaster(THREE) {
  const H = baseRoom(THREE, { neon: MAG, name: 'Blaster', num: 7, par: 3, w: 5.5, l: 10 });
  addMesh(H.group, new THREE.BoxGeometry(5.2, 0.025, 9.6), mat(THREE, 0x4a4a54, { roughness: 1 }), 0, 0.09, 0);
  const rock = mat(THREE, 0x7a7a84, { roughness: 0.95 });
  const rocks = [[-1.55, -2.2, 0.32], [1.45, -1.3, 0.28], [-0.9, 0.2, 0.36], [1.25, 1.4, 0.3], [-1.65, 2.5, 0.34], [0.35, -0.6, 0.22], [1.7, 3.1, 0.26], [-0.2, 3.4, 0.2]];
  rocks.forEach(([x, z, r]) => {
    addMesh(H.group, new THREE.DodecahedronGeometry(r, 0), rock, x, r * 0.75, z);
    H.colliders.push(circleAt(x, z, r * 0.95));
  });
  [[-1.85, 0.7], [1.85, 0.7], [0, 2.7]].forEach(([x, z]) => {
    addMesh(H.group, new THREE.CylinderGeometry(0.22, 0.3, 0.4, 10), glow(THREE, 0xff3030, 0.7), x, 0.25, z);
    addMesh(H.group, new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8), glow(THREE, ORANGE, 1.8), x, 0.55, z);
    addMesh(H.group, new THREE.SphereGeometry(0.1, 8, 8), glow(THREE, 0xfff0a0, 2), x, 0.78, z);
    H.colliders.push(circleAt(x, z, 0.32));
  });
  return H;
}

function holePip(THREE) {
  const H = baseRoom(THREE, { neon: ORANGE, name: 'Super Pip Quest', num: 8, par: 3, w: 5.3, l: 10 });
  const brick = glow(THREE, 0xc45a2a, 0.45);
  const qBlock = glow(THREE, 0xffc81e, 0.9);
  const pipe = glow(THREE, 0x2fae3a, 0.7);
  const pipeLip = glow(THREE, 0x3fd85a, 0.9);
  [[-1.55, -1.6], [1.55, -1.6], [-1.55, 1.1], [1.55, 1.1]].forEach(([x, z]) => {
    addMesh(H.group, new THREE.BoxGeometry(0.75, 0.5, 0.75), brick, x, 0.32, z);
    H.colliders.push(aabbAround(x, z, 0.4, 0.4));
  });
  // ? blocks
  [[0, -0.2], [-0.8, 2.0], [0.8, 2.0]].forEach(([x, z]) => {
    addMesh(H.group, new THREE.BoxGeometry(0.55, 0.55, 0.55), qBlock, x, 0.7, z);
    H.colliders.push(aabbAround(x, z, 0.32, 0.32));
  });
  [[-1.85, 2.9], [1.85, 2.9], [0, 3.4]].forEach(([x, z], i) => {
    const h = 0.75 + i * 0.15;
    addMesh(H.group, new THREE.CylinderGeometry(0.38, 0.38, h, 16), pipe, x, h / 2, z);
    addMesh(H.group, new THREE.CylinderGeometry(0.46, 0.46, 0.18, 16), pipeLip, x, h + 0.05, z);
    H.colliders.push(circleAt(x, z, 0.4));
  });
  // Spinning coins as movers
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const coin = addMesh(H.group, new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14),
      glow(THREE, 0xffd21a, 1.6), Math.cos(a) * 1.3, 0.45, Math.sin(a) * 1.3 - 0.3, Math.PI / 2, 0, 0);
    coin.userData.dynamic = true; coin.userData.noMerge = true;
    H.movers.push({
      kind: 'coin', mesh: coin, t: i * 0.4,
      update(dt) { this.t += dt; coin.rotation.y += dt * 2.5; coin.position.y = 0.45 + Math.sin(this.t * 3) * 0.06; }
    });
  }
  return H;
}

function holeBurrow(THREE) {
  const H = baseRoom(THREE, { neon: ORANGE, name: 'Burrow Buster', num: 9, par: 3, w: 5.3, l: 10 });
  const dirt = mat(THREE, 0x6a4020, { roughness: 1 });
  const moles = [[-1.45, -2.0], [1.35, -1.0], [-1.25, 0.5], [1.45, 1.7], [0.1, 2.7], [-0.55, -3.0], [0.9, -2.6]];
  moles.forEach(([x, z], i) => {
    addMesh(H.group, new THREE.CylinderGeometry(0.5, 0.6, 0.22, 12), dirt, x, 0.1, z);
    const mole = new THREE.Group(); mole.userData.dynamic = true; mole.userData.noMerge = true;
    addMesh(mole, new THREE.SphereGeometry(0.2, 12, 12), glow(THREE, 0x8a5a30, 0.35), 0, 0.2, 0);
    addMesh(mole, new THREE.SphereGeometry(0.055, 6, 6), mat(THREE, 0x111111), -0.07, 0.28, 0.15);
    addMesh(mole, new THREE.SphereGeometry(0.055, 6, 6), mat(THREE, 0x111111), 0.07, 0.28, 0.15);
    addMesh(mole, new THREE.SphereGeometry(0.05, 6, 6), mat(THREE, 0xe8b888), 0, 0.16, 0.2);
    // paws
    addMesh(mole, new THREE.SphereGeometry(0.06, 6, 6), mat(THREE, 0x6a4a2a), -0.14, 0.05, 0.1);
    addMesh(mole, new THREE.SphereGeometry(0.06, 6, 6), mat(THREE, 0x6a4a2a), 0.14, 0.05, 0.1);
    mole.position.set(x, 0.12, z); H.group.add(mole);
    const col = circleAt(x, z, 0.24); H.colliders.push(col);
    H.movers.push({
      kind: 'mole', mesh: mole, col, t: i * 0.7, x, z,
      update(dt) {
        this.t += dt;
        const up = Math.sin(this.t * 1.6) > 0.1;
        mole.visible = up;
        mole.position.y = up ? 0.18 + Math.sin(this.t * 1.6) * 0.1 : -0.5;
        col.r = up ? 0.24 : 0.01;
      }
    });
  });
  return H;
}

export const HOLE_META = [
  { name: 'Strike', par: 3 },
  { name: 'Ghost 256', par: 3 },
  { name: 'Monkey Crossing', par: 3 },
  { name: 'Berserker', par: 4 },
  { name: 'Orc Attack', par: 4 },
  { name: 'Cybercity', par: 3 },
  { name: 'Blaster', par: 3 },
  { name: 'Super Pip Quest', par: 3 },
  { name: 'Burrow Buster', par: 3 },
];
