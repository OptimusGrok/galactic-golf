import * as THREE from '../vendor/three.module.js?v=5';
import { makeMonkey } from './monkey.js?v=5';
import { buildHole, HOLE_META } from './holes.js?v=5';
import { makeBall, putt, stepBall, inBounds, BALL_R, STROKE_CAP, STOP_SPEED } from './physics.js?v=5';
import { createAudio } from './sfx.js?v=5';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js?v=5';

const BEST_KEY = 'galacticgolf.best';
const $=id=>document.getElementById(id);

const audio = createAudio();
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.domElement.style.touchAction = 'none';
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05050c);
scene.fog = new THREE.Fog(0x05050c, 20, 42);

const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 70);
const amb = new THREE.AmbientLight(0x8899cc, 0.55); scene.add(amb);
const hemi = new THREE.HemisphereLight(0xc8d0ff, 0x1a1030, 0.85); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff0dd, 1.15); key.position.set(2.5, 9, -4); scene.add(key);
const fillDir = new THREE.DirectionalLight(0x88aadd, 0.4); fillDir.position.set(-5, 5, 3); scene.add(fillDir);
// Soft neon environment so MeshStandard materials (monkey + glossy floor) pick up colour
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envSc = new THREE.Scene();
  envSc.add(new THREE.AmbientLight(0xffffff, 0.28));
  const eH = new THREE.HemisphereLight(0xffe8ff, 0x102060, 0.7); envSc.add(eH);
  [[0xff2bd6, 4, 2, -2], [0x2de8ff, -4, 3, 2], [0xfff0c0, 1, 5, -4], [0xff7a1a, -2, 2, 5]].forEach(([c,x,y,z]) => {
    const L = new THREE.PointLight(c, 2.5, 0, 2); L.position.set(x,y,z); envSc.add(L);
  });
  scene.environment = pmrem.fromScene(envSc, 0.04).texture;
  pmrem.dispose();
}


// Bright glowing ball + ground ring
const BALL_VIS = BALL_R * 1.55;
const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_VIS, 22, 18),
  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.15, metalness: 0.05 })
);
scene.add(ballMesh);
const ballGlow = new THREE.Mesh(
  new THREE.TorusGeometry(BALL_VIS * 1.7, 0.022, 8, 28),
  new THREE.MeshBasicMaterial({ color: 0xaaf0ff, transparent: true, opacity: 0.9 })
);
ballGlow.rotation.x = Math.PI / 2; scene.add(ballGlow);

// Aim line: thick glowing ribbon + arrowhead, drawn on top so felt/props never hide it
const aimLine = new THREE.Group();
const aimMat = new THREE.MeshBasicMaterial({ color: 0x2de8ff, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
const aimGlowMat = new THREE.MeshBasicMaterial({ color: 0x2de8ff, transparent: true, opacity: 0.35, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
const ribGeo = new THREE.PlaneGeometry(1, 1); ribGeo.rotateX(-Math.PI / 2); ribGeo.translate(0, 0, 0.5);
const aimRib = new THREE.Mesh(ribGeo, aimMat); aimRib.scale.set(0.11, 1, 1);
const aimGlow = new THREE.Mesh(ribGeo, aimGlowMat); aimGlow.scale.set(0.32, 1, 1);
const headShape = new THREE.Shape(); headShape.moveTo(-0.24, 0); headShape.lineTo(0.24, 0); headShape.lineTo(0, 0.42); headShape.closePath();
const headGeo = new THREE.ShapeGeometry(headShape); headGeo.rotateX(Math.PI / 2);
const aimHead = new THREE.Mesh(headGeo, aimMat);
aimLine.add(aimGlow, aimRib, aimHead);
aimLine.traverse(o => { o.renderOrder = 999; o.frustumCulled = false; });
aimLine.position.y = 0.12;
function setAim(angle, power) {
  const len = 0.5 + power * 3.2;
  aimLine.position.x = ball.x; aimLine.position.z = ball.z; aimLine.rotation.y = angle;
  aimRib.scale.z = len; aimGlow.scale.z = len; aimHead.position.z = len;
  const c = new THREE.Color(0x2de8ff).lerp(new THREE.Color(0xff3df0), power);
  aimMat.color.copy(c); aimGlowMat.color.copy(c);
}
aimLine.visible = false; scene.add(aimLine);

// Power meter DOM is in HTML

function mergeMonkeyStatic(root) {
  const armRoots = new Set();
  (root.userData.arms || []).forEach(a => { if (a && a.sh) armRoots.add(a.sh); });
  const underArm = (obj) => { let p = obj; while (p) { if (armRoots.has(p)) return true; p = p.parent; } return false; };
  root.updateMatrixWorld(true);
  const items = [];
  root.traverse(o => {
    if (!o.isMesh || underArm(o)) return;
    items.push({ mesh: o, mat: o.material, geo: o.geometry, mw: o.matrixWorld.clone() });
  });
  const buckets = new Map();
  for (const it of items) {
    const key = it.mat.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat: it.mat, geos: [] });
    const g = it.geo.clone(); g.applyMatrix4(it.mw); buckets.get(key).geos.push(g);
    if (it.mesh.parent) it.mesh.parent.remove(it.mesh);
    it.geo.dispose();
  }
  for (const { mat, geos } of buckets.values()) {
    if (!geos.length) continue;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (geos.length > 1) geos.forEach(g => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.frustumCulled = false;
    root.add(m);
  }
}

const monkey = makeMonkey(THREE);
monkey.scale.setScalar(0.7);
scene.add(monkey);
monkey.traverse(o => {
  if (!o.isMesh || !o.material) return;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  mats.forEach(m => {
    if (!m.isMeshStandardMaterial) return;
    if (m.userData && m.userData._boosted) return;
    m.userData._boosted = true;
    const c = m.color ? m.color.getHex() : 0;
    if (c === 0x1d2452 || c === 0x141a3a) { m.emissive = new THREE.Color(0x2a3a8a); m.emissiveIntensity = 0.35; }
    else if (c === 0x4e2a14 || c === 0x4a2c1a) { m.emissive = new THREE.Color(0x2a1508); m.emissiveIntensity = 0.25; }
    else if (c === 0xd9a779 || c === 0xb78a68) { m.emissive = new THREE.Color(0x3a2810); m.emissiveIntensity = 0.2; }
    else if (c === 0xff4f9e || c === 0xd93a82) { m.emissive = new THREE.Color(0xff4f9e); m.emissiveIntensity = 0.25; }
    m.needsUpdate = true;
  });
});
mergeMonkeyStatic(monkey);
const monkeyFill = new THREE.PointLight(0xffb0e8, 3.4, 7.5, 1.0); scene.add(monkeyFill);
const monkeyRim = new THREE.PointLight(0x80f0ff, 3.6, 7.5, 1.0); scene.add(monkeyRim);
const monkeyKey = new THREE.PointLight(0xfff8e8, 2.6, 6.5, 1.05); scene.add(monkeyKey);

// Neon putter in right hand
(function attachPutter() {
  const u = monkey.userData;
  if (!u || !u.arms || !u.arms[1]) return;
  const putter = new THREE.Group(); putter.name = 'putter';
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.58, 8),
    new THREE.MeshStandardMaterial({ color: 0x2de8ff, emissive: 0x2de8ff, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 }));
  shaft.position.set(0, -0.3, 0); putter.add(shaft);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xff2bd6, emissive: 0xff2bd6, emissiveIntensity: 0.7, metalness: 0.7, roughness: 0.35 }));
  head.position.set(0, -0.6, 0.03); putter.add(head);
  putter.userData.tipLocal = new THREE.Vector3(0, -0.6, 0.03);
  // Parent near the hand so the shaft hangs to the ball
  u.arms[1].el.add(putter);
  putter.position.set(0.0, -0.4, 0.02);
  putter.rotation.set(0.2, 0.05, 0.08);
  u.putter = putter;
})();

let holeIndex = 0;
let hole = null;
let ball = makeBall(0, 0);
let strokes = 0;
let scores = [];
let phase = 'aim'; // aim | rolling | scored | final | transition
let swingT = 0;
const CAM_DIST_DEFAULT = 9.5;
const CAM_DIST_MIN = 4.0;   // zoomed in — still above the floor
const CAM_DIST_MAX = 14.0;  // zoomed out — whole hole visible
let camYaw = 0.04, camPitch = 0.68, camDist = CAM_DIST_DEFAULT;
let aiming = false, aimAngle = 0, aimPower = 0;
let pointerId = null, dragStart = null;
let lastBounceT = 0;
let holeGroup = null;

function loadBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) || 'null'); } catch (e) { return null; }
}
function saveBest(total) {
  const prev = loadBest();
  if (prev == null || total < prev) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(total)); } catch (e) {}
    return true;
  }
  return false;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

function clearHole() {
  if (holeGroup) { scene.remove(holeGroup); holeGroup.traverse(o => {
    if (o.geometry) o.geometry.dispose();
  }); holeGroup = null; }
  hole = null;
}

function startHole(i) {
  clearHole();
  holeIndex = i;
  hole = buildHole(THREE, i);
  holeGroup = hole.group; scene.add(holeGroup);
  strokes = 0;
  ball = makeBall(hole.tee.x, hole.tee.z);
  ballMesh.visible = true; ballMesh.position.set(ball.x, BALL_VIS, ball.z);
  phase = 'aim';
  placeMonkey();
  camYaw = 0.04; camPitch = 0.68; camDist = CAM_DIST_DEFAULT;
  updateHUD();
  $('scorecard').classList.remove('on');
  $('final').classList.remove('on');
  if (hole.door) hole.door.visible = false;
  // snap camera behind tee
  const horiz = Math.cos(camPitch);
  camera.position.set(ball.x + Math.sin(camYaw) * camDist * horiz, 1.1 + Math.sin(camPitch) * camDist, ball.z - Math.cos(camYaw) * camDist * horiz - 0.6);
  camera.lookAt(ball.x * 0.15, 0.2, hole ? (ball.z * 0.25 + hole.cup.z * 0.75) : ball.z + 3);
}

function placeMonkey() {
  // Stand behind the ball (away from cup), slightly to the left, facing the cup
  const cupX = hole ? hole.cup.x : ball.x;
  const cupZ = hole ? hole.cup.z : ball.z + 2;
  const faceY = Math.atan2(cupX - ball.x, cupZ - ball.z);
  // Offset in local monkey frame: left and back from ball
  const back = 0.38, left = 0.32;
  monkey.position.set(
    ball.x - Math.sin(faceY) * back - Math.cos(faceY) * left,
    0,
    ball.z - Math.cos(faceY) * back + Math.sin(faceY) * left
  );
  monkey.rotation.y = faceY;
  // Putting address: NEGATIVE shoulder.x swings -Y arm bone toward +Z (the ball / cup)
  const u = monkey.userData;
  if (u && u.arms) {
    // Modest forward pitch keeps hands low; |z| pulls them to the centerline over the ball
    u.arms[1].sh.rotation.set(-0.55, 0.2, -0.75);
    u.arms[1].el.rotation.set(0.28, 0.05, 0.12);
    if (u.arms[1].hand) u.arms[1].hand.rotation.set(0.1, 0, 0);
    u.arms[0].sh.rotation.set(-0.5, -0.15, 0.8);
    u.arms[0].el.rotation.set(0.25, -0.05, -0.1);
    if (u.arms[0].hand) u.arms[0].hand.rotation.set(0.1, 0, 0);
    if (u.putter) {
      // Parent near hand end of elbow; aim shaft so head sits by the ball
      u.putter.position.set(0.0, -0.34, 0.02);
      monkey.updateMatrixWorld(true);
      const el = u.arms[1].el;
      el.updateWorldMatrix(true, true);
      // Elbow-local vector from putter origin toward ball
      const inv = el.matrixWorld.clone().invert();
      const localBall = new THREE.Vector3(ball.x, 0.06, ball.z).applyMatrix4(inv);
      const origin = new THREE.Vector3(0.0, -0.34, 0.02);
      const dir = localBall.sub(origin).normalize();
      // Putter shaft is modeled along -Y; rotate -Y onto dir
      const from = new THREE.Vector3(0, -1, 0);
      if (dir.lengthSq() > 1e-6) {
        const q = new THREE.Quaternion().setFromUnitVectors(from, dir.normalize());
        u.putter.quaternion.copy(q);
      }
    }
  }
}

function updateHUD() {
  const meta = HOLE_META[holeIndex];
  $('hudHole').textContent = (holeIndex + 1) + ' · ' + meta.name;
  $('hudPar').textContent = 'Par ' + meta.par;
  $('hudStrokes').textContent = 'Strokes ' + strokes;
  const best = loadBest();
  $('hudBest').textContent = best != null ? 'Best ' + best : 'Best —';
  const tot = scores.reduce((a, s) => a + s, 0) + (phase === 'aim' || phase === 'rolling' ? strokes : 0);
  $('hudTotal').textContent = 'Tot ' + tot;
}

function showScorecard(last) {
  phase = 'scored';
  const meta = HOLE_META[holeIndex];
  const diff = last - meta.par;
  const label = last === 1 ? 'Hole in one!' : diff <= -2 ? 'Eagle!' : diff === -1 ? 'Birdie!' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : '+' + diff;
  $('scTitle').textContent = 'Hole ' + (holeIndex + 1) + ' · ' + meta.name;
  $('scBody').textContent = last + ' stroke' + (last === 1 ? '' : 's') + '  ·  Par ' + meta.par + '  ·  ' + label;
  $('scorecard').classList.add('on');
  if (hole.door) hole.door.visible = true;
  audio.cheer();
}

function showFinal() {
  phase = 'final';
  const total = scores.reduce((a, b) => a + b, 0);
  const totalPar = HOLE_META.reduce((a, h) => a + h.par, 0);
  const isBest = saveBest(total);
  let rows = '';
  for (let i = 0; i < 9; i++) {
    rows += '<div class="row"><span>' + (i + 1) + '. ' + HOLE_META[i].name + '</span><span>' + scores[i] + ' / ' + HOLE_META[i].par + '</span></div>';
  }
  $('finBody').innerHTML = rows + '<div class="row total"><span>Total</span><span>' + total + ' / ' + totalPar + (isBest ? ' · NEW BEST' : '') + '</span></div>';
  $('final').classList.add('on');
  $('scorecard').classList.remove('on');
  audio.cheer();
}

function nextHole() {
  $('scorecard').classList.remove('on');
  if (holeIndex >= 8) { showFinal(); return; }
  phase = 'transition';
  // brief fade via overlay
  $('fade').classList.add('on');
  setTimeout(() => {
    startHole(holeIndex + 1);
    $('fade').classList.remove('on');
  }, 450);
}

function resetBall() {
  if (!hole || phase === 'scored' || phase === 'final' || phase === 'transition') return;
  ball = makeBall(hole.tee.x, hole.tee.z);
  ballMesh.visible = true;
  phase = 'aim';
  placeMonkey();
  updateHUD();
}

function doPutt(angle, power) {
  if (phase !== 'aim' || !hole) return;
  if (strokes >= STROKE_CAP) {
    // auto-finish at cap
    strokes = STROKE_CAP;
    scores[holeIndex] = strokes;
    showScorecard(strokes);
    updateHUD();
    return;
  }
  strokes++;
  swingT = 0.35;
  putt(ball, angle, power);
  phase = 'rolling';
  audio.putt(power);
  audio.resume();
  updateHUD();
}

// ---- Input ----
const powerFill = $('powerFill');
const powerWrap = $('power');

function worldFromPointer(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  ray.ray.intersectPlane(plane, hit);
  return hit;
}

function cancelAim() {
  if (!aiming) { aimLine.visible = false; powerWrap.classList.remove('on'); return; }
  aiming = false; pointerId = null; aimPower = 0;
  aimLine.visible = false; powerWrap.classList.remove('on');
  powerFill.style.height = '0%';
}

function onDown(e) {
  if (phase !== 'aim') return;
  if (e.target.closest && e.target.closest('button,.card')) return;
  // Tracker already recorded this pointer. size>1 means a pinch — never aim/putt.
  if (touchPinching || gesturePinching || activePointers.size > 1 || (aiming && e.pointerId !== pointerId)) {
    cancelAim();
    camDrag = null;
    return;
  }
  audio.resume(); audio.startMusic();
  const hit = worldFromPointer(e.clientX, e.clientY);
  if (!hit) return;
  const d = Math.hypot(hit.x - ball.x, hit.z - ball.z);
  if (d > 1.4) return; // must start near ball
  aiming = true; pointerId = e.pointerId;
  dragStart = { x: hit.x, z: hit.z };
  try { renderer.domElement.setPointerCapture(e.pointerId); } catch (_) {}
  aimAngle = 0; aimPower = 0; setAim(aimAngle, 0.0); aimLine.visible = true; powerWrap.classList.add('on');
  e.preventDefault();
}
function onMove(e) {
  if (!aiming || e.pointerId !== pointerId) return;
  if (touchPinching || gesturePinching || activePointers.size > 1) { cancelAim(); return; }
  const hit = worldFromPointer(e.clientX, e.clientY);
  if (!hit) return;
  // Pull back from ball: aim is opposite of drag direction from ball
  const dx = ball.x - hit.x, dz = ball.z - hit.z;
  const dist = Math.hypot(dx, dz);
  aimAngle = Math.atan2(dx, dz);
  aimPower = Math.min(1, dist / 2.2);
  setAim(aimAngle, aimPower);
  powerFill.style.height = (aimPower * 100) + '%';
  e.preventDefault();
}
function onUp(e) {
  if (!aiming || e.pointerId !== pointerId) return;
  aiming = false; pointerId = null;
  aimLine.visible = false; powerWrap.classList.remove('on');
  if (aimPower > 0.06 && activePointers.size <= 1 && !touchPinching && !gesturePinching) doPutt(aimAngle, aimPower);
  aimPower = 0; powerFill.style.height = '0%';
  e.preventDefault();
}

const activePointers = new Map(); // id -> {x,y} (pointer fallback / desktop)
let pinchStartDist = 0, pinchStartCam = CAM_DIST_DEFAULT;
let touchPinching = false; // true while native touch 2-finger pinch owns camDist
let gesturePinching = false;
let camDrag = null;

function touchDist(touches) {
  if (!touches || touches.length < 2) return 0;
  const a = touches[0], b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
}
function applyPinchScale(startCam, startDist, curDist) {
  const scale = startDist / (curDist || 1);
  camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, startCam * scale));
}
function beginPinchFromTouches(touches) {
  cancelAim();
  camDrag = null;
  touchPinching = true;
  pinchStartDist = touchDist(touches);
  pinchStartCam = camDist;
}
function endTouchPinch() {
  touchPinching = false;
  pinchStartDist = 0;
}

// ---- Primary: native touch pinch (iOS Safari reliable path) ----
function onTouchStart(e) {
  if (e.touches.length >= 2) {
    beginPinchFromTouches(e.touches);
    try { e.preventDefault(); } catch (_) {}
  } else if (e.touches.length === 1 && aiming) {
    // single touch while aiming is fine; second finger handled above
  }
}
function onTouchMove(e) {
  if (e.touches.length >= 2) {
    if (!touchPinching) beginPinchFromTouches(e.touches);
    cancelAim();
    camDrag = null;
    applyPinchScale(pinchStartCam, pinchStartDist, touchDist(e.touches));
    try { e.preventDefault(); } catch (_) {}
  }
}
function onTouchEnd(e) {
  if (e.touches.length < 2) endTouchPinch();
  if (e.touches.length >= 2) {
    // still two+ (rare) — refresh baseline
    pinchStartDist = touchDist(e.touches);
    pinchStartCam = camDist;
  }
}
const touchOpts = { passive: false, capture: true };
for (const el of [renderer.domElement, document]) {
  el.addEventListener('touchstart', onTouchStart, touchOpts);
  el.addEventListener('touchmove', onTouchMove, touchOpts);
  el.addEventListener('touchend', onTouchEnd, touchOpts);
  el.addEventListener('touchcancel', onTouchEnd, touchOpts);
}

// ---- iOS Safari gesture* fallback (page pinch) ----
let gestureStartCam = CAM_DIST_DEFAULT;
document.addEventListener('gesturestart', e => {
  try { e.preventDefault(); } catch (_) {}
  gesturePinching = true;
  cancelAim();
  camDrag = null;
  gestureStartCam = camDist;
}, { passive: false, capture: true });
document.addEventListener('gesturechange', e => {
  try { e.preventDefault(); } catch (_) {}
  // e.scale > 1 = pinch out = zoom in = smaller camDist
  const s = (typeof e.scale === 'number' && e.scale > 0) ? e.scale : 1;
  camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, gestureStartCam / s));
  gesturePinching = true;
  cancelAim();
}, { passive: false, capture: true });
document.addEventListener('gestureend', e => {
  try { e.preventDefault(); } catch (_) {}
  gesturePinching = false;
}, { passive: false, capture: true });

// ---- Pointer path (desktop / Android); skip camDist while touch/gesture owns pinch ----
renderer.domElement.addEventListener('pointerdown', e => {
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size === 2 && !touchPinching && !gesturePinching) {
    cancelAim();
    camDrag = null;
    const pts = [...activePointers.values()];
    pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    pinchStartCam = camDist;
  }
}, { passive: true });
renderer.domElement.addEventListener('pointermove', e => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size >= 2 && !touchPinching && !gesturePinching) {
    cancelAim();
    const pts = [...activePointers.values()];
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    applyPinchScale(pinchStartCam, pinchStartDist, d);
  }
}, { passive: true });
function clearPointer(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) pinchStartDist = 0;
  if (activePointers.size === 1) { pinchStartDist = 0; pinchStartCam = camDist; }
}
renderer.domElement.addEventListener('pointerup', clearPointer, { passive: true });
renderer.domElement.addEventListener('pointercancel', clearPointer, { passive: true });

renderer.domElement.addEventListener('pointerdown', onDown, { passive: false });
renderer.domElement.addEventListener('pointermove', onMove, { passive: false });
renderer.domElement.addEventListener('pointerup', onUp, { passive: false });
renderer.domElement.addEventListener('pointercancel', onUp, { passive: false });

// Camera orbit: single-finger / mouse drag away from ball
renderer.domElement.addEventListener('pointerdown', e => {
  if (aiming || activePointers.size > 1 || touchPinching || gesturePinching) return;
  if (e.target.closest && e.target.closest('button,.card')) return;
  if (phase === 'aim') {
    const hit = worldFromPointer(e.clientX, e.clientY);
    if (hit && Math.hypot(hit.x - ball.x, hit.z - ball.z) <= 1.4) return;
  }
  camDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
}, { passive: true });
renderer.domElement.addEventListener('pointermove', e => {
  if (!camDrag || e.pointerId !== camDrag.id || aiming || activePointers.size > 1 || touchPinching) return;
  const dx = e.clientX - camDrag.x, dy = e.clientY - camDrag.y;
  camDrag.x = e.clientX; camDrag.y = e.clientY;
  camYaw -= dx * 0.005;
  camPitch = Math.max(0.25, Math.min(1.2, camPitch + dy * 0.004));
}, { passive: true });
renderer.domElement.addEventListener('pointerup', e => { if (camDrag && e.pointerId === camDrag.id) camDrag = null; });
renderer.domElement.addEventListener('pointercancel', e => { if (camDrag && e.pointerId === camDrag.id) camDrag = null; });
renderer.domElement.addEventListener('wheel', e => {
  camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist + e.deltaY * 0.012));
  e.preventDefault();
}, { passive: false });

// On-screen +/- zoom (always works)
function nudgeZoom(dir) {
  camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, camDist + dir * 0.85));
}
function bindZoomHold(btn, dir) {
  if (!btn) return;
  let t = null, r = null;
  const start = (e) => {
    e.preventDefault(); e.stopPropagation();
    cancelAim(); camDrag = null;
    nudgeZoom(dir);
    t = setTimeout(() => { r = setInterval(() => nudgeZoom(dir), 60); }, 320);
  };
  const stop = () => { clearTimeout(t); clearInterval(r); t = r = null; };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointerleave', stop);
  btn.addEventListener('pointercancel', stop);
  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
}
bindZoomHold($('btnZoomIn'), -1);  // + = zoom in = smaller camDist
bindZoomHold($('btnZoomOut'), +1);

$('btnReset').onclick = () => { resetBall(); strokes = Math.min(strokes + 0, strokes); /* free reset of position but keep strokes? Task: Reset ball button - typically free */ };
// Re-read: "Reset ball button" - usually puts back to last lie or tee. I'll reset to tee without adding stroke.
$('btnMute').onclick = () => {
  const m = audio.toggleMute();
  $('btnMute').textContent = m ? 'Sound off' : 'Sound on';
};
$('btnNext').onclick = () => nextHole();
$('btnAgain').onclick = () => {
  scores = []; holeIndex = 0;
  $('final').classList.remove('on');
  startHole(0);
};

// ---- Frame ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (hole && hole.movers) for (const m of hole.movers) m.update(dt);

  if (phase === 'rolling' && hole) {
    const res = stepBall(ball, hole.colliders, hole.ramps, dt, hole.cup);
    if (res.bounce > 0.4 && now - lastBounceT > 80) { audio.bounce(res.bounce); lastBounceT = now; }
    if (!inBounds(ball, hole.bounds)) {
      audio.oob();
      strokes++; // penalty
      ball = makeBall(hole.tee.x, hole.tee.z);
      phase = 'aim';
      placeMonkey();
      updateHUD();
      if (strokes >= STROKE_CAP) { scores[holeIndex] = STROKE_CAP; showScorecard(STROKE_CAP); }
    } else if (res.sunk) {
      audio.cup();
      ballMesh.visible = false;
      scores[holeIndex] = strokes;
      showScorecard(strokes);
      updateHUD();
    } else if (!ball.rolling && Math.hypot(ball.vx, ball.vz) < STOP_SPEED) {
      phase = 'aim';
      placeMonkey();
      if (strokes >= STROKE_CAP) { scores[holeIndex] = STROKE_CAP; showScorecard(STROKE_CAP); }
    }
  }

  ballMesh.position.set(ball.x, Math.max(ball.y - BALL_R + BALL_VIS, BALL_VIS * 0.55), ball.z);
  ballGlow.position.set(ball.x, 0.03, ball.z);
  ballGlow.visible = ballMesh.visible && !ball.sunk;
  if (ball.rolling) {
    ballMesh.rotation.x += ball.vz * dt * 8;
    ballMesh.rotation.z -= ball.vx * dt * 8;
  }

  // Swing animation
  if (swingT > 0) {
    swingT -= dt;
    const u = monkey.userData;
    if (u) {
      const k = Math.sin((1 - Math.max(0, swingT) / 0.35) * Math.PI);
      u.arms[1].sh.rotation.x = -0.55 - k * 0.7;
      u.arms[1].el.rotation.x = 0.28 + k * 0.35;
    }
  }

  // Camera follow ball
  // Frame whole hole: monkey near bottom, cup visible up-field
  const lookZ = hole ? (ball.z * 0.25 + hole.cup.z * 0.75) : ball.z + 3;
  const target = new THREE.Vector3(ball.x * 0.15, 0.2, lookZ);
  const horiz = Math.cos(camPitch);
  const cx = ball.x + Math.sin(camYaw) * camDist * horiz;
  const cy = 1.1 + Math.sin(camPitch) * camDist;
  const cz = ball.z - Math.cos(camYaw) * camDist * horiz - 0.6;
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), 1 - Math.pow(0.0008, dt));
  camera.lookAt(target);
  // Rim / fill follow monkey so he stays readable
  const mf = monkey.position;
  const face = monkey.rotation.y;
  // Fill from camera side, rim from opposite, key above
  const camDirX = camera.position.x - mf.x, camDirZ = camera.position.z - mf.z;
  const camLen = Math.hypot(camDirX, camDirZ) || 1;
  monkeyFill.position.set(mf.x + (camDirX / camLen) * 1.4, mf.y + 1.8, mf.z + (camDirZ / camLen) * 1.4);
  monkeyRim.position.set(mf.x - (camDirX / camLen) * 1.3, mf.y + 1.6, mf.z - (camDirZ / camLen) * 1.3);
  monkeyKey.position.set(mf.x, mf.y + 2.4, mf.z);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---- Test hook ----
window.__golf = {
  get hole() { return holeIndex + 1; },
  get camDist() { return camDist; },
  get camLimits() { return { min: CAM_DIST_MIN, max: CAM_DIST_MAX, def: CAM_DIST_DEFAULT }; },
  setZoom(d) { camDist = Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, d)); },
  get aimVisible() { return !!(aimLine && aimLine.visible); },
  get aiming() { return aiming; },
  cancelAim,
  get strokes() { return strokes; },
  get phase() { return phase; },
  get scores() { return scores.slice(); },
  get ball() { return { x: ball.x, y: ball.y, z: ball.z, vx: ball.vx, vz: ball.vz, sunk: ball.sunk }; },
  get meta() { return HOLE_META; },
  place(x, z) { ball.x = x; ball.z = z; ball.vx = ball.vz = 0; ball.rolling = false; ball.sunk = false; ball.y = BALL_R; phase = 'aim'; placeMonkey(); },
  putt(angle, power) { doPutt(angle, power); },
  sink() {
    if (!hole) return;
    strokes = Math.max(1, strokes || 1);
    ball.x = hole.cup.x; ball.z = hole.cup.z; ball.vx = ball.vz = 0; ball.sunk = true;
    ballMesh.visible = false;
    scores[holeIndex] = strokes;
    showScorecard(strokes);
  },
  goto(i) { scores = scores.slice(0, i); while (scores.length < i) scores.push(HOLE_META[scores.length].par); startHole(i); },
  next: nextHole,
  reset: resetBall,
  start: () => startHole(0),
  renderer, scene, camera, monkey,
};

startHole(0);
audio.startMusic();
requestAnimationFrame(frame);
