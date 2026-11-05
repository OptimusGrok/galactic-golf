// Copied from Galactic Arcade main.js makeMonkey (DO NOT edit neon-arcade).
// Exports makeMonkey(THREE) -> Group named 'monkey'.
export function makeMonkey(THREE) {
  function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
    return t;
  }
  const tieDye = canvasTex(512, 512, (g, w, h) => {
    const cols = ['#ffd21f', '#2f7bff', '#ff4fb8', '#8f3dff', '#ffe95a', '#29c3ff'];
    g.fillStyle = '#ffd21f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); const c = cols[i % cols.length];
      gr.addColorStop(0, c); gr.addColorStop(0.6, c + 'aa'); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 0.35; g.strokeStyle = '#fff'; g.lineWidth = 6;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(w / 2, h / 2, 30 + i * 30, i, i + 4); g.stroke(); }
    g.globalAlpha = 1; // chest graphic: pink star burst with dark outline (front = middle of texture)
    g.save(); g.translate(w * 0.5, h * 0.42); g.fillStyle = '#ff3fae'; g.strokeStyle = '#3b0a3a'; g.lineWidth = 6; g.beginPath();
    for (let i = 0; i < 16; i++) { const r = i % 2 ? 26 : 56, a = i * Math.PI / 8; g.lineTo(r * Math.cos(a), r * Math.sin(a)); }
    g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#2a0a3a'; g.fillRect(-22, -7, 44, 14); g.restore();
  });
  const denim = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6f93c4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(40,60,110,.25)' : 'rgba(200,220,255,.18)'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1); }
    for (const [x, y] of [[70, 60], [180, 150], [60, 200]]) { g.fillStyle = '#e8edf5'; for (let k = 0; k < 7; k++) g.fillRect(x - 18 + Math.random() * 6, y - 12 + k * 4, 30 + Math.random() * 10, 2); }
  });
  const M = {
    fur: new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.95 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb78a68, roughness: 0.7 }),
    shirt: new THREE.MeshStandardMaterial({ map: tieDye, roughness: 0.85 }),
    jeans: new THREE.MeshStandardMaterial({ map: denim, roughness: 0.9 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffc640, metalness: 1, roughness: 0.25, emissive: 0x402800, emissiveIntensity: 0.4 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xcfd6e0, metalness: 1, roughness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x120a06, roughness: 0.3 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xffc81e, roughness: 0.5 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2c6cff, roughness: 0.5 }),
    red: new THREE.MeshStandardMaterial({ color: 0xff3030, roughness: 0.5 }),
  };
  function part(parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = false; parent.add(m); return m; }
  const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
  const CYL = (r1, r2, h, s = 16) => new THREE.CylinderGeometry(r1, r2, h, s);
  
    const mk = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o));
    const fur = mk(0x4e2a14, { roughness: 0.95, emissive: 0x100804 }), tan = mk(0xd9a779, { roughness: 0.7, emissive: 0x2a1a0c }), navy = mk(0x1d2452, { roughness: 0.75 }), navyD = mk(0x1d2452, { roughness: 0.75, side: THREE.DoubleSide });
    const rib = mk(0x141a3a, { roughness: 0.9 }), pink = mk(0xff4f9e, { roughness: 0.6 }), pinkD = mk(0xd93a82, { roughness: 0.6 }), cream = mk(0xf1e8d6, { roughness: 0.6 }), maroon = mk(0x8a1e2c, { roughness: 0.55 }), hp = mk(0x18181f, { roughness: 0.35 }), iris = mk(0x8a4c1a, { roughness: 0.3, emissive: 0x2a1404 }), lip = mk(0x3a1a10, { roughness: 0.5 });
    const root = new THREE.Group(); root.name = 'monkey';
    const hips = new THREE.Group(); hips.position.y = 0.8; root.add(hips);
    part(hips, CYL(0.2, 0.21, 0.16, 20), M.jeans, 0, 0, 0, 1, 1, 0.8);
    part(hips, CYL(0.205, 0.205, 0.03, 20), M.dark, 0, 0.07, 0, 1, 1, 0.8);
    const legs = [];
    for (const sd of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(0.1 * sd, -0.04, 0); hips.add(leg);
      part(leg, CYL(0.11, 0.115, 0.42, 14), M.jeans, 0, -0.2, 0);
      const knee = new THREE.Group(); knee.position.y = -0.4; leg.add(knee);
      part(knee, CYL(0.115, 0.13, 0.3, 14), M.jeans, 0, -0.14, 0);
      part(knee, CYL(0.13, 0.13, 0.05, 14), M.jeans, 0, -0.27, 0, 1.03, 1, 1.03); // cuff
      const shoe = new THREE.Group(); shoe.position.set(0, -0.34, 0.04); knee.add(shoe);
      part(shoe, CYL(0.095, 0.1, 0.14, 14), cream, 0, 0.04, -0.03);          // high-top ankle
      part(shoe, CYL(0.1, 0.1, 0.025, 14), maroon, 0, 0.11, -0.03);          // collar
      part(shoe, new THREE.BoxGeometry(0.17, 0.1, 0.26), cream, 0, -0.01, 0.02);
      part(shoe, S(0.088, 14, 10), maroon, 0, -0.01, 0.13, 0.98, 0.6, 0.75);  // toe box
      part(shoe, new THREE.BoxGeometry(0.185, 0.045, 0.34), M.white, 0, -0.065, 0.03); // sole
      part(shoe, new THREE.BoxGeometry(0.176, 0.06, 0.09), maroon, 0, 0.0, -0.09);    // heel panel
      for (let i = 0; i < 3; i++) part(shoe, new THREE.BoxGeometry(0.08, 0.012, 0.015), M.white, 0, 0.055 - i * 0.025 + 0.01, 0.06 + i * 0.03).rotation.x = -0.5; // laces
      legs.push({ leg, knee });
    }
    const torso = new THREE.Group(); torso.position.y = 0.06; hips.add(torso);
    const shirt = part(torso, CYL(0.24, 0.27, 0.56, 22), M.shirt, 0, 0.26, 0, 1, 1, 0.76); shirt.rotation.y = -Math.PI / 2;
    part(torso, S(0.25), M.shirt, 0, 0.5, 0, 1.12, 0.42, 0.78);
    // open bomber: body shell with a gap at the front, ribbed hem, collar, zip edges
    const gap = 0.42;
    part(torso, new THREE.CylinderGeometry(0.265, 0.29, 0.5, 26, 1, true, gap, Math.PI * 2 - gap * 2), navyD, 0, 0.29, 0, 1, 1, 1.06);
    part(torso, new THREE.CylinderGeometry(0.29, 0.28, 0.07, 26, 1, true, gap, Math.PI * 2 - gap * 2), rib, 0, 0.03, 0, 1.01, 1, 1.07);
    part(torso, new THREE.SphereGeometry(0.27, 26, 10, Math.PI / 2 + gap, Math.PI * 2 - gap * 2, 0, Math.PI / 2), navyD, 0, 0.53, 0, 1.12, 0.42, 1.06);
    const col = part(torso, new THREE.TorusGeometry(0.15, 0.03, 8, 24, Math.PI * 1.5), rib, 0, 0.61, -0.01, 1.05, 1, 1.1); col.rotation.set(Math.PI / 2, 0, Math.PI * 0.75);
    for (const sd of [-1, 1]) { const zx = Math.sin(gap) * 0.27 * sd, zz = Math.cos(gap) * 0.27 * 1.06; part(torso, new THREE.BoxGeometry(0.014, 0.5, 0.014), M.gold, zx, 0.29, zz + 0.012); }
    // front welt pockets on the bomber (hands go in here when idle)
    for (const sd of [-1, 1]) { const pk = part(torso, new THREE.BoxGeometry(0.15, 0.03, 0.03), rib, 0.19 * sd, 0.15, 0.255); pk.rotation.set(-0.15, -0.62 * sd, -0.35 * sd); pk.name = 'pocket'; }
    // gold monkey-ticket pin on the left chest
    const pin = new THREE.Group(); pin.position.set(0.2, 0.42, 0.25); pin.rotation.y = 0.55; torso.add(pin);
    part(pin, new THREE.BoxGeometry(0.075, 0.05, 0.01), M.gold); part(pin, S(0.017, 10, 8), fur, 0, 0.003, 0.008, 1, 1, 0.5); part(pin, S(0.011, 8, 6), tan, 0, -0.001, 0.014, 1, 0.8, 0.4);
    for (const sx of [-1, 1]) part(pin, S(0.008, 6, 4), tan, sx * 0.018, 0.012, 0.008, 1, 1, 0.4);
    const neck = new THREE.Group(); neck.position.y = 0.58; torso.add(neck);
    part(neck, CYL(0.075, 0.085, 0.12), fur, 0, 0.02, 0);
    // headphones resting around the neck
    const band = part(neck, new THREE.TorusGeometry(0.13, 0.018, 8, 26, Math.PI * 1.15), hp, 0, -0.02, -0.03, 1, 1, 1); band.rotation.set(Math.PI / 2 - 0.25, 0, Math.PI * 0.95);
    for (const sd of [-1, 1]) { const cup = part(neck, CYL(0.055, 0.055, 0.04, 18), hp, 0.115 * sd, -0.02, 0.07, 1, 1, 1); cup.rotation.set(0.3, 0, Math.PI / 2 + 0.35 * sd); const ring = part(cup, new THREE.TorusGeometry(0.05, 0.008, 6, 18), pink, 0, 0.021 * -sd, 0); ring.rotation.x = Math.PI / 2; }
    // head
    const head = new THREE.Group(); head.position.y = 0.08; neck.add(head);
    part(head, S(0.18, 28, 20), fur, 0, 0.15, -0.01, 1, 1.02, 0.98);
    part(head, S(0.11, 24, 16), tan, 0.045, 0.16, 0.095, 0.75, 0.9, 0.75);   // heart-shaped face mask (two lobes)
    part(head, S(0.11, 24, 16), tan, -0.045, 0.16, 0.095, 0.75, 0.9, 0.75);
    part(head, S(0.11, 24, 16), tan, 0, 0.07, 0.13, 1.1, 0.8, 0.85);         // muzzle
    part(head, S(0.05, 16, 10), fur, 0, 0.215, 0.165, 2.7, 0.4, 0.6);         // brow
    for (const sd of [-1, 1]) {
      part(head, S(0.046, 16, 12), M.white, 0.06 * sd, 0.165, 0.175, 1, 1.15, 0.7);
      part(head, S(0.03, 14, 10), iris, 0.058 * sd, 0.163, 0.2, 1, 1.1, 0.6);
      part(head, S(0.017, 10, 8), M.dark, 0.057 * sd, 0.163, 0.214, 1, 1.1, 0.5);
      part(head, S(0.007, 6, 4), M.white, 0.048 * sd, 0.178, 0.222);
      part(head, S(0.07, 16, 12), fur, 0.185 * sd, 0.15, 0, 0.45, 1, 0.9);   // ear
      part(head, S(0.05, 14, 10), tan, 0.2 * sd, 0.15, 0.01, 0.3, 0.85, 0.75);
      part(head, S(0.011, 6, 4), lip, 0.022 * sd, 0.1, 0.225);                 // nostril
    }
    const smile = part(head, new THREE.TorusGeometry(0.055, 0.008, 6, 20, Math.PI * 0.8), lip, 0, 0.065, 0.214); smile.rotation.set(-0.35, 0, Math.PI + Math.PI * 0.1);
    for (const sd of [-1, 1]) part(head, S(0.01, 6, 4), lip, 0.05 * sd, 0.058, 0.205);
    // pink baseball cap, brim forward
    const cap = new THREE.Group(); cap.position.set(0, 0.215, -0.005); cap.rotation.x = -0.08; head.add(cap);
    part(cap, new THREE.SphereGeometry(0.188, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), pink, 0, 0, 0, 1, 0.82, 1.03);
    part(cap, new THREE.CylinderGeometry(0.19, 0.19, 0.03, 24, 1, true), pinkD, 0, 0.005, 0, 1, 1, 1.03);
    part(cap, new THREE.CylinderGeometry(0.15, 0.15, 0.014, 22, 1, false, -Math.PI * 0.5, Math.PI), pinkD, 0, -0.005, 0.17, 1, 1, 1.0).rotation.x = 0.1;
    part(cap, S(0.018, 8, 6), pinkD, 0, 0.152, 0);
    // arms: navy bomber sleeves with ribbed cuffs, tan hands
    const arms = [];
    for (const sd of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(0.29 * sd, 0.47, 0); torso.add(sh);
      part(sh, S(0.105, 16, 12), navy, 0.01 * sd, -0.02, 0);
      part(sh, CYL(0.09, 0.08, 0.34, 14), navy, 0.02 * sd, -0.17, 0);
      const el = new THREE.Group(); el.position.set(0.02 * sd, -0.34, 0); sh.add(el);
      part(el, S(0.08, 12, 10), navy, 0, 0, 0);
      part(el, CYL(0.078, 0.068, 0.24, 14), navy, 0, -0.12, 0);
      part(el, CYL(0.066, 0.06, 0.05, 14), rib, 0, -0.26, 0);
      const hand = part(el, S(0.058, 14, 10), tan, 0, -0.32, 0.01, 0.8, 1.05, 1);
      part(hand, S(0.022, 8, 6), tan, -0.035 * sd, 0.01, 0.035, 1, 1.6, 1);   // thumb
      for (let f = 0; f < 3; f++) part(hand, CYL(0.013, 0.012, 0.06, 6), tan, (f - 1) * 0.024, -0.06, 0.012);
      arms.push({ sh, el, hand, sd });
    }
    // idle prop: a small phone with a glowing generic dark feed (placeholder posts, no real content), held in the right hand
    const phone = new THREE.Group(); phone.name = 'idlePhone'; phone.visible = false;
    const pcv = document.createElement('canvas'); pcv.width = 128; pcv.height = 256; const ptex = new THREE.CanvasTexture(pcv); ptex.colorSpace = THREE.SRGBColorSpace;
    part(phone, new THREE.BoxGeometry(0.075, 0.14, 0.009), mk(0x111116, { roughness: 0.3, metalness: 0.6 }));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.128), new THREE.MeshBasicMaterial({ map: ptex, color: 0xe0e8f4 })); scr.position.z = 0.0052; phone.add(scr);
    arms[1].el.add(phone); phone.position.set(0.0, -0.36, 0.06); phone.rotation.set(-0.2, 0.75, -2.1);   // screen tipped up toward his eyes (angled a little outward, as people hold them), top pointing away
    // backpack (matches the HUD backpack icon: charcoal pack, top loop, grey cartoon-monkey face on the front pocket) - never hue-tinted
    const pack = new THREE.Group(); pack.name = 'backpack'; pack.position.set(0, 0.3, -0.27); torso.add(pack);
    const bpD = mk(0x1c1c22, { roughness: 0.85 }), bpM = mk(0x3a3a44, { roughness: 0.8 }), bpS = mk(0x55555f, { roughness: 0.7 });
    const bag = part(pack, new THREE.BoxGeometry(0.4, 0.44, 0.16), bpD, 0, 0, -0.06); bag.name = 'backpackBag';
    part(pack, S(0.2, 18, 10), bpD, 0, 0.2, -0.06, 1, 0.35, 0.4);                                   // rounded top
    const loop = part(pack, new THREE.TorusGeometry(0.05, 0.012, 6, 16, Math.PI), bpS, 0, 0.27, -0.06); loop.name = 'backpackLoop';
    const pkt = part(pack, new THREE.BoxGeometry(0.3, 0.26, 0.05), bpM, 0, -0.06, -0.16); pkt.name = 'backpackPocket';
    const fcv = document.createElement('canvas'); fcv.width = fcv.height = 128; const fx = fcv.getContext('2d');
    fx.fillStyle = '#3a3a44'; fx.fillRect(0, 0, 128, 128); fx.fillStyle = '#9a9aa4'; fx.beginPath(); fx.ellipse(64, 66, 46, 42, 0, 0, 7); fx.fill();
    fx.fillStyle = '#c4c4cc'; fx.beginPath(); fx.ellipse(64, 82, 30, 20, 0, 0, 7); fx.fill();
    for (const sx of [-1, 1]) { fx.fillStyle = '#fff'; fx.beginPath(); fx.arc(64 + sx * 18, 52, 13, 0, 7); fx.fill(); fx.fillStyle = '#111'; fx.beginPath(); fx.arc(64 + sx * 17, 54, 6, 0, 7); fx.fill(); fx.fillStyle = '#555'; fx.beginPath(); fx.arc(64 + sx * 5, 78, 3, 0, 7); fx.fill(); }
    fx.strokeStyle = '#222'; fx.lineWidth = 3; fx.beginPath(); fx.arc(64, 84, 10, 0.3, Math.PI - 0.3); fx.stroke();
    const ftex = new THREE.CanvasTexture(fcv); ftex.colorSpace = THREE.SRGBColorSpace;
    const pface = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.22), new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.8 })); pface.name = 'backpackFace'; pface.position.set(0, -0.06, -0.186); pface.rotation.y = Math.PI; pack.add(pface);
    for (const sd of [-1, 1]) { const strap = part(torso, new THREE.BoxGeometry(0.05, 0.5, 0.03), bpD, 0.13 * sd, 0.32, 0); strap.name = 'backpackStrap';   // shoulder straps over the bomber
      strap.scale.set(1, 1, 1); strap.position.set(0.14 * sd, 0.36, 0.0); strap.rotation.x = 0; const a = part(torso, new THREE.TorusGeometry(0.2, 0.018, 6, 20, Math.PI * 0.9), bpD, 0.15 * sd, 0.42, -0.02); a.rotation.set(0, Math.PI / 2, Math.PI * 0.55); }
    pack.traverse(o => { if (o.isMesh) o.userData.noTint = true; });
    torso.traverse(o => { if (o.isMesh && o.material === bpD) o.userData.noTint = true; });
    // curly brown tail from below the backpack, swayed in the animation loop
    const tail = new THREE.Group(); tail.name = 'tail'; tail.position.set(0, 0.02, -0.2); hips.add(tail);
    const tc = [[0, 0, 0], [0.02, -0.12, -0.12], [0.08, -0.12, -0.3], [0.17, 0.02, -0.42], [0.22, 0.2, -0.42], [0.18, 0.33, -0.34], [0.1, 0.32, -0.28], [0.09, 0.24, -0.3], [0.14, 0.22, -0.35]].map(v => new THREE.Vector3(...v));
    const tailM = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tc), 40, 0.028, 8, false), fur); tailM.name = 'tailMesh'; tail.add(tailM);
    part(tail, S(0.03, 8, 6), fur, tc[8].x, tc[8].y, tc[8].z);
    root.userData = { hips, torso, neck, head, legs, arms, phone, pcv, ptex, pack, tail };
    return root;
}
