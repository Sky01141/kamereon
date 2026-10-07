// Shared by client (render) and server (authoritative camouflage score).
(function (root) {
  const W = 1600, H = 900, FLOOR = '#3b4048';
  const POSES = [
    { n: 'Stand', w: 1, h: 1 }, { n: 'Sit', w: 1, h: .7 }, { n: 'Crouch', w: 1.25, h: .5 },
    { n: 'Lean', w: .8, h: 1, tilt: .25 }, { n: 'Hide', w: .6, h: .6 }, { n: 'Object', w: 1.4, h: 1.4 }];
  const OBJ = [ // drawn in order; later = on top
    { x: 0, y: 380, w: 1600, h: 110, c: '#2b2d31' }, // road
    { x: 60, y: 60, w: 340, h: 240, c: '#7a5a46' }, { x: 460, y: 60, w: 260, h: 240, c: '#5d6b7a' },
    { x: 800, y: 60, w: 200, h: 120, c: '#8c8f94' }, { x: 1080, y: 40, w: 460, h: 280, c: '#3f7d4a' }, // park
    { x: 1180, y: 120, w: 60, h: 60, c: '#2f5f38' }, { x: 1360, y: 180, w: 80, h: 80, c: '#2f5f38' },
    { x: 80, y: 580, w: 420, h: 260, c: '#9a8b6a' }, { x: 580, y: 560, w: 140, h: 140, c: '#b0472f' },
    { x: 760, y: 560, w: 100, h: 100, c: '#b0472f' }, { x: 560, y: 740, w: 300, h: 90, c: '#d8c15a' },
    { x: 960, y: 560, w: 600, h: 290, c: '#4a5b78' }, { x: 1020, y: 620, w: 70, h: 160, c: '#c9ccd2' },
    { x: 1200, y: 620, w: 70, h: 160, c: '#c9ccd2' }, { x: 1380, y: 620, w: 70, h: 160, c: '#c9ccd2' },
    { x: 700, y: 300, w: 90, h: 50, c: '#6e4b2a' }, { x: 300, y: 330, w: 50, h: 40, c: '#3f7d4a' }];
  const bgAt = (x, y) => { for (let i = OBJ.length - 1; i >= 0; i--) { const o = OBJ[i]; if (x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) return o.c; } return FLOOR; };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const SIZE = 32;
  // Score 0-100: per painted cell colour distance to the background behind that cell; transparent cells = silhouette.
  function camo(grid, pose, x, y) {
    const s = POSES[pose] || POSES[0]; let sum = 0, n = 0;
    for (let i = 0; i < 64; i++) {
      const c = grid && grid[i]; if (!c) continue;
      const cx = x + ((i % 8 + .5) / 8 - .5) * SIZE * s.w, cy = y + ((Math.floor(i / 8) + .5) / 8 - .5) * SIZE * s.h;
      const a = rgb(c), b = rgb(bgAt(cx, cy));
      sum += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); n++;
    }
    if (n < 8) return 0;
    return Math.round(Math.max(0, 100 - (sum / n) / 441.7 * 100 * 2.2));
  }
  function draw(ctx) {
    ctx.fillStyle = FLOOR; ctx.fillRect(0, 0, W, H);
    OBJ.forEach(o => { ctx.fillStyle = o.c; ctx.fillRect(o.x, o.y, o.w, o.h); });
    ctx.strokeStyle = '#39ff88'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, W, H); // map border
  }
  const api = { W, H, SIZE, POSES, bgAt, camo, draw };
  if (typeof module !== 'undefined') module.exports = api; else root.MAP = api;
})(this);
