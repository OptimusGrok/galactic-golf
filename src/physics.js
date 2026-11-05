// Mini-golf ball physics on XZ with optional height (ramps). Circle + AABB colliders.
export const BALL_R = 0.046; // ~68% of prior 0.068 — visual+physics
export const FRICTION = 1.6;
export const BOUNCE = 0.62;
export const STOP_SPEED = 0.06;
export const MAX_SPEED = 9;
export const STROKE_CAP = 8;

export function makeBall(x, z, y = BALL_R) {
  return { x, y, z, vx: 0, vy: 0, vz: 0, rolling: false, sunk: false };
}

export function putt(ball, angle, power) {
  // power 0..1, angle yaw (0 = +z)
  const v = 1.2 + power * 7.5;
  ball.vx = Math.sin(angle) * v;
  ball.vz = Math.cos(angle) * v;
  ball.vy = 0;
  ball.rolling = true;
  ball.sunk = false;
}

function resolveCircle(ball, cx, cz, cr) {
  const dx = ball.x - cx, dz = ball.z - cz;
  const d = Math.hypot(dx, dz) || 1e-6;
  const min = BALL_R + cr;
  if (d >= min) return false;
  const nx = dx / d, nz = dz / d;
  const pen = min - d;
  ball.x += nx * pen; ball.z += nz * pen;
  const vn = ball.vx * nx + ball.vz * nz;
  if (vn < 0) {
    ball.vx -= (1 + BOUNCE) * vn * nx;
    ball.vz -= (1 + BOUNCE) * vn * nz;
    return Math.abs(vn);
  }
  return 0;
}

function resolveAABB(ball, minX, maxX, minZ, maxZ) {
  // Closest point on AABB to ball
  const cx = Math.max(minX, Math.min(maxX, ball.x));
  const cz = Math.max(minZ, Math.min(maxZ, ball.z));
  const dx = ball.x - cx, dz = ball.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= BALL_R * BALL_R && (ball.x < minX || ball.x > maxX || ball.z < minZ || ball.z > maxZ)) {
    // outside, maybe touching corner/edge
    if (d2 >= BALL_R * BALL_R || d2 < 1e-12) {
      // fully inside check below
      const inside = ball.x > minX && ball.x < maxX && ball.z > minZ && ball.z < maxZ;
      if (!inside && d2 >= BALL_R * BALL_R) return false;
      if (!inside) {
        const d = Math.sqrt(d2) || 1e-6;
        const nx = dx / d, nz = dz / d;
        ball.x = cx + nx * BALL_R; ball.z = cz + nz * BALL_R;
        const vn = ball.vx * nx + ball.vz * nz;
        if (vn < 0) {
          ball.vx -= (1 + BOUNCE) * vn * nx;
          ball.vz -= (1 + BOUNCE) * vn * nz;
          return Math.abs(vn);
        }
        return 0;
      }
    }
  }
  // Inside or overlapping
  const inside = ball.x >= minX - BALL_R && ball.x <= maxX + BALL_R && ball.z >= minZ - BALL_R && ball.z <= maxZ + BALL_R;
  if (!inside) return false;

  // Push out via nearest face
  const dl = ball.x - minX, dr = maxX - ball.x, db = ball.z - minZ, dt = maxZ - ball.z;
  // If center outside, use closest-point method
  if (ball.x < minX || ball.x > maxX || ball.z < minZ || ball.z > maxZ) {
    const d = Math.sqrt(d2) || 1e-6;
    if (d2 >= BALL_R * BALL_R) return false;
    const nx = dx / d, nz = dz / d;
    ball.x = cx + nx * BALL_R; ball.z = cz + nz * BALL_R;
    const vn = ball.vx * nx + ball.vz * nz;
    if (vn < 0) {
      ball.vx -= (1 + BOUNCE) * vn * nx;
      ball.vz -= (1 + BOUNCE) * vn * nz;
      return Math.abs(vn);
    }
    return 0;
  }
  // Center inside: push through thinnest wall
  const m = Math.min(dl, dr, db, dt);
  let nx = 0, nz = 0, pen = 0;
  if (m === dl) { nx = -1; pen = dl + BALL_R; }
  else if (m === dr) { nx = 1; pen = dr + BALL_R; }
  else if (m === db) { nz = -1; pen = db + BALL_R; }
  else { nz = 1; pen = dt + BALL_R; }
  ball.x += nx * pen; ball.z += nz * pen;
  const vn = ball.vx * nx + ball.vz * nz;
  if (vn < 0) {
    ball.vx -= (1 + BOUNCE) * vn * nx;
    ball.vz -= (1 + BOUNCE) * vn * nz;
    return Math.abs(vn);
  }
  return 0;
}

export function stepBall(ball, colliders, ramps, dt, cup) {
  if (ball.sunk) return { bounce: 0, sunk: true, oob: false };
  let bounceHit = 0;
  const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / sub;
  for (let s = 0; s < sub; s++) {
    // Ramp height / slope force
    let gy = 0, slopeX = 0, slopeZ = 0;
    if (ramps) {
      for (const r of ramps) {
        if (ball.x >= r.minX && ball.x <= r.maxX && ball.z >= r.minZ && ball.z <= r.maxZ) {
          const t = (ball.z - r.minZ) / (r.maxZ - r.minZ);
          gy = r.y0 + (r.y1 - r.y0) * t;
          // gravity along slope
          const rise = r.y1 - r.y0, run = r.maxZ - r.minZ;
          const ang = Math.atan2(rise, run);
          slopeZ += -Math.sin(ang) * 9.8 * 0.55;
          break;
        }
      }
    }
    ball.vx += slopeX * h;
    ball.vz += slopeZ * h;
    ball.x += ball.vx * h;
    ball.z += ball.vz * h;
    ball.y = BALL_R + gy;

    // Friction
    const sp = Math.hypot(ball.vx, ball.vz);
    if (sp > 0) {
      const ns = Math.max(0, sp - FRICTION * h);
      const k = ns / sp;
      ball.vx *= k; ball.vz *= k;
      if (ns < STOP_SPEED) { ball.vx = ball.vz = 0; ball.rolling = false; }
    }

    // Cap speed
    const sp2 = Math.hypot(ball.vx, ball.vz);
    if (sp2 > MAX_SPEED) { const k = MAX_SPEED / sp2; ball.vx *= k; ball.vz *= k; }

    if (colliders) {
      for (const c of colliders) {
        let hit = 0;
        if (c.type === 'circle') hit = resolveCircle(ball, c.x, c.z, c.r);
        else if (c.type === 'aabb') hit = resolveAABB(ball, c.minX, c.maxX, c.minZ, c.maxZ);
        else if (c.type === 'gate') {
          // Raisable gate: when open (c.open), no collide
          if (!c.open) hit = resolveAABB(ball, c.minX, c.maxX, c.minZ, c.maxZ);
        }
        if (hit) bounceHit = Math.max(bounceHit, hit);
      }
    }

    // Cup: if slow enough and over hole, sink
    if (cup) {
      const dx = ball.x - cup.x, dz = ball.z - cup.z;
      const d = Math.hypot(dx, dz);
      const sp3 = Math.hypot(ball.vx, ball.vz);
      if (d < cup.r * 1.15 && sp3 < 2.8) {
        // pull in
        ball.x += (cup.x - ball.x) * 0.35;
        ball.z += (cup.z - ball.z) * 0.35;
        if (d < cup.r * 0.7 && sp3 < 1.8) {
          ball.sunk = true; ball.vx = ball.vz = 0; ball.x = cup.x; ball.z = cup.z; ball.y = -0.02;
          return { bounce: bounceHit, sunk: true, oob: false };
        }
      }
    }
  }
  return { bounce: bounceHit, sunk: false, oob: false };
}

export function inBounds(ball, bounds) {
  return ball.x >= bounds.minX && ball.x <= bounds.maxX && ball.z >= bounds.minZ && ball.z <= bounds.maxZ;
}
