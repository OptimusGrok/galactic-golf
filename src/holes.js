// Nine themed neon rooms. Static meshes are merged per material to keep draw calls low.
import { BALL_R } from './physics.js?v=5';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js?v=5';

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

function holeStrike(THREE) {
  const H = baseRoom(THREE, { neon: ORANGE, name: 'Strike', num: 1, par: 3, w: 5.2, l: 10 });
  // (starfield white dots removed — looked like extra golf balls)
  // Recognisable little fighter ships (top-down arrow / X-wing silhouette)
  const hull = glow(THREE, 0x6aa8ff, 0.85);
  const wing = glow(THREE, 0xff4040, 1.0);
  const cockpit = glow(THREE, CYAN, 1.8);
  const engine = glow(THREE, 0xffa040, 1.6);
  const ships = [[-1.3, -2.0, 0.4], [1.4, -0.6, -0.5], [-1.0, 1.0, 1.1], [1.2, 2.4, 0.2], [0.1, 0.4, -1.2], [-1.5, 3.2, 0.8]];
  ships.forEach(([x, z, rot]) => {
    const s = new THREE.Group();
    // Fuselage pointing +Z
    addMesh(s, new THREE.BoxGeometry(0.22, 0.12, 0.55), hull, 0, 0.16, 0);
    addMesh(s, new THREE.ConeGeometry(0.12, 0.28, 6), hull, 0, 0.16, 0.38, Math.PI / 2, 0, 0);
    // Wings
    addMesh(s, new THREE.BoxGeometry(0.85, 0.04, 0.22), wing, 0, 0.14, -0.05);
    addMesh(s, new THREE.BoxGeometry(0.12, 0.04, 0.35), wing, -0.36, 0.14, 0.05);
    addMesh(s, new THREE.BoxGeometry(0.12, 0.04, 0.35), wing, 0.36, 0.14, 0.05);
    addMesh(s, new THREE.SphereGeometry(0.07, 8, 8), cockpit, 0, 0.24, 0.1);
    addMesh(s, new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), engine, -0.12, 0.14, -0.3, Math.PI / 2, 0, 0);
    addMesh(s, new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), engine, 0.12, 0.14, -0.3, Math.PI / 2, 0, 0);
    s.position.set(x, 0.05, z); s.rotation.y = rot; H.group.add(s);
    H.colliders.push(circleAt(x, z, 0.38));
  });
  return H;
}

function holeGhost(THREE) {
  const H = baseRoom(THREE, { neon: MAG, name: 'Ghost 256', num: 2, par: 3, w: 5.5, l: 10 });
  const wall = glow(THREE, 0x1a3aee, 1.1);
  const wallTop = glow(THREE, 0x40a0ff, 1.4);
  const walls = [
    [-1.6, -2.2, 0.18, 2.8], [1.6, -2.2, 0.18, 2.8],
    [-0.5, -0.2, 2.0, 0.18], [0.5, 1.6, 2.0, 0.18],
    [-1.6, 2.6, 0.18, 2.2], [1.6, 2.6, 0.18, 2.2],
    [0, -3.5, 2.4, 0.18], [0, 0.7, 0.18, 1.0],
    [-2.2, 0.7, 0.18, 1.4], [2.2, 0.7, 0.18, 1.4],
  ];
  walls.forEach(([x, z, hw, hd]) => {
    addMesh(H.group, new THREE.BoxGeometry(hw * 2, 0.55, hd * 2), wall, x, 0.32, z);
    // Pixel-ish glowing top lip
    addMesh(H.group, new THREE.BoxGeometry(hw * 2 + 0.04, 0.06, hd * 2 + 0.04), wallTop, x, 0.62, z);
    H.colliders.push(aabbAround(x, z, hw, hd));
  });
  // (scattered pellet spheres removed — looked like small balls on the green)
  // Pink ghost — patrol open corridors only (waypoints clear of maze AABBs)
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
  // Patrol only open south corridors (never crosses maze AABBs)
  // Center lane x=0, z=-2.85..-0.55; right pocket x=0.9 south of mid wall; left pocket x=-0.9
  // Stay in the open south pocket — clear of every maze AABB (margin ≥ 0.45)
  const gPath = [
    [0.0, -2.7], [0.7, -2.7], [0.7, -1.4], [0.0, -1.4],
    [-0.7, -1.4], [-0.7, -2.7], [0.0, -2.7],
  ];
  ghost.position.set(gPath[0][0], 0, gPath[0][1]); H.group.add(ghost);
  const gCol = circleAt(gPath[0][0], gPath[0][1], 0.20); H.colliders.push(gCol);
  // Maze blocks only (skip room boundary AABBs which are huge)
  const mazeWalls = H.colliders.filter(c => c.type === 'aabb' && (c.maxX - c.minX) < 6 && (c.maxZ - c.minZ) < 8);
  H.movers.push({
    kind: 'ghost', mesh: ghost, col: gCol, t: 0, path: gPath, seg: 0, _d: 0,
    update(dt) {
      this.t += dt;
      const speed = 1.0;
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
      // Push out of maze walls so the ghost never clips
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
