# Galactic Golf

9-hole neon mini golf. Each hole is its own room, themed after a Galactic Arcade game.
Play as the arcade monkey (copied from Galactic Arcade `makeMonkey`, not edited in place).
Standalone web game, ready to add to Galactic Arcade later as a room.

## Run locally

```bash
cd /workspace/galactic-golf
python3 -m http.server 8799
```

Open http://localhost:8799/

Needs a static server because of ES modules (`vendor/three.module.js` is Three r170, same as Galactic Arcade).

## Controls

- Drag back from the ball to aim and set power, release to putt
- Drag elsewhere to orbit the camera; mouse wheel zooms
- **Reset ball** returns to the tee (no stroke)
- **Sound on/off** mutes Web Audio SFX + light music loop

## Holes and par (total par 29)

1. Strike — par 3
2. Ghost 256 — par 3
3. Monkey Crossing — par 3
4. Berserker — par 4
5. Orc Attack — par 4
6. Cybercity — par 3
7. Blaster — par 3
8. Super Pip Quest — par 3
9. Burrow Buster — par 3

Best total is stored in `localStorage['galacticgolf.best']`.

## Test

```bash
# with the static server running on $GOLF_PORT — use the shared browser lock
GOLF_PORT=8799 flock /workspace/.browser-test.lock node test/play.js
# quick visual smoke (subset of shots + putt + final):
GOLF_PORT=8799 flock /workspace/.browser-test.lock node test/smoke_vis.js
```

Uses Playwright from `/workspace/strike/node_modules/playwright` and `/usr/bin/google-chrome` with swiftshader.
`window.__golf` exposes `place`, `putt`, `sink`, `goto`, `next`, `reset` for automation.

## Layout

- `index.html` — shell + UI
- `src/game.js` — loop, controls, scorecards
- `src/holes.js` — 9 themed rooms
- `src/physics.js` — ball physics
- `src/sfx.js` — Web Audio
- `src/monkey.js` — arcade monkey (copied from neon-arcade main.js)
- `vendor/three.module.js` — Three.js r170
- `build.js` — size report / sanity check
- `shots/` — phone portrait screenshots
