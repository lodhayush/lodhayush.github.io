// Light-mode background: two faint alpona (Bengali floor-art) mandalas draw
// themselves in the corners, then keep gently moving: their rings turn in
// alternating directions, the whole motif breathes, and a shimmer travels
// around the dotted rings. Clicking empty space adds a small turning flower.
// Runs only while the resolved theme is light; still under
// prefers-reduced-motion, and steps down to still if the page can't keep up.
(function () {
  const canvas = document.querySelector("canvas.alpona");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const MANDALA_MS = 6000; // time for a mandala to draw itself
  const FLOWER_MS = 900; // time for a flower to draw itself
  const FLOWER_LIFE_MS = 4500; // a flower fades out and disappears after this long
  const FLOWER_FADE_MS = 1500; // length of that fade
  const MAX_FLOWERS = 40;
  const FRAME_MS = [33, 50]; // frame interval at full and reduced quality
  const SPEED = 1.8; // overall pace of turning, breathing and shimmer
  const VEIL = 0.4; // share of the pattern erased behind the text column
  const VERMILION = "185, 58, 20";
  const SAFFRON = "200, 130, 30";
  const INTERACTIVE =
    "a, button, input, textarea, select, label, summary, [role='button'], .site-sidebar, .echarts, canvas:not(.alpona), figure, table, pre, ninja-keys";

  let width = 0;
  let height = 0;
  let mandalas = [];
  let flowers = [];
  let frame = null;
  let drawnOnce = false;
  let flowerCount = 0;
  let quality = 0; // 0 full, 1 lower frame rate, 2 still
  let veil = null;

  const isLight = () => document.documentElement.getAttribute("data-theme") === "light";
  const moving = () => !reducedMotion.matches && quality < 2;

  /* Shapes as polylines around (0, 0), so any fraction can be drawn -----------*/

  const TAU = Math.PI * 2;

  function circle(r, color, alpha, lineWidth) {
    const pts = [];
    const steps = Math.max(24, Math.round(r / 3));
    for (let i = 0; i <= steps; i++) pts.push([Math.cos((i / steps) * TAU) * r, Math.sin((i / steps) * TAU) * r]);
    return { pts, color, alpha, lineWidth };
  }

  // A petal from radius r0 to r1 along angle a, bulging by w.
  function petal(a, r0, r1, w, color, alpha, lineWidth) {
    const pts = [];
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const side = (s, sign) => {
      const r = r0 + (r1 - r0) * s;
      const off = sign * w * Math.sin(Math.PI * s) * (1 - 0.35 * s);
      return [ux * r - uy * off, uy * r + ux * off];
    };
    for (let i = 0; i <= 16; i++) pts.push(side(i / 16, 1));
    for (let i = 16; i >= 0; i--) pts.push(side(i / 16, -1));
    return { pts, color, alpha, lineWidth };
  }

  function scallop(r, amp, bumps, color, alpha, lineWidth) {
    const pts = [];
    const steps = bumps * 12;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * TAU;
      const rr = r + amp * Math.abs(Math.sin((bumps / 2) * t));
      pts.push([Math.cos(t) * rr, Math.sin(t) * rr]);
    }
    return { pts, color, alpha, lineWidth };
  }

  function dotRing(r, count, size, color, alpha) {
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * TAU;
      return { dot: [Math.cos(a) * r, Math.sin(a) * r], angle: a, size, color, alpha };
    });
  }

  function petals(count, offset, r0, r1, w, color, alpha, lineWidth) {
    return Array.from({ length: count }, (_, i) => petal(((i + offset) / count) * TAU, r0, r1, w, color, alpha, lineWidth));
  }

  // A ring turns at `speed` radians per second; `shimmer` makes a highlight travel round its dots.
  const ring = (speed, items, shimmer = false) => ({ speed, items, shimmer });

  function mandala(cx, cy, R, direction, phase) {
    const rings = [
      ring(0.03, [circle(R * 0.06, VERMILION, 0.22, 1.4), ...petals(8, 0, R * 0.08, R * 0.3, R * 0.07, VERMILION, 0.2, 1.4)]),
      ring(0, [circle(R * 0.36, VERMILION, 0.16, 1.2)]),
      ring(-0.05, dotRing(R * 0.42, 24, R * 0.012, SAFFRON, 0.35), true),
      ring(0.035, petals(16, 0.5, R * 0.48, R * 0.62, R * 0.035, VERMILION, 0.16, 1.1)),
      ring(0, [circle(R * 0.68, VERMILION, 0.14, 1.1)]),
      ring(-0.012, [scallop(R * 0.72, R * 0.045, 36, VERMILION, 0.15, 1.1)]),
      ring(-0.025, dotRing(R * 0.81, 48, R * 0.008, SAFFRON, 0.35), true),
      ring(0.015, petals(12, 0, R * 0.85, R * 0.99, R * 0.05, VERMILION, 0.13, 1.1)),
    ];
    return { cx, cy, direction, phase, rings, total: measure(rings) };
  }

  function flower(x, y) {
    const color = flowerCount++ % 2 ? SAFFRON : VERMILION;
    const rings = [
      ring(0.25 * (flowerCount % 2 ? 1 : -1), petals(8, 0, 4, 18, 5.5, color, 0.38, 1.2)),
      ring(0, [{ dot: [0, 0], angle: 0, size: 2.4, color: SAFFRON, alpha: 0.6 }]),
    ];
    return { cx: x, cy: y, direction: 1, phase: Math.random() * TAU, rings, total: measure(rings) };
  }

  // Lengths let a shape be drawn up to any fraction of its total.
  function measure(rings) {
    let total = 0;
    for (const r of rings) {
      for (const it of r.items) {
        let len = it.dot ? it.size * 6 : 0;
        if (it.pts) for (let i = 1; i < it.pts.length; i++) len += Math.hypot(it.pts[i][0] - it.pts[i - 1][0], it.pts[i][1] - it.pts[i - 1][1]);
        it.len = len;
        total += len;
      }
    }
    return total;
  }

  function drawShape(shape, fraction, t, breathe) {
    let budget = shape.total * Math.min(1, fraction);
    if (budget <= 0) return;
    ctx.save();
    ctx.translate(shape.cx, shape.cy);
    if (breathe) {
      const s = 1 + 0.015 * Math.sin(t * 0.5 + shape.phase);
      ctx.scale(s, s);
    }
    ctx.lineJoin = "round";
    for (const r of shape.rings) {
      ctx.save();
      ctx.rotate(r.speed * t * shape.direction + shape.phase);
      // The shimmer's position on the ring, turning slowly against the ring itself.
      const wave = r.shimmer ? t * 0.6 * shape.direction : 0;
      for (const it of r.items) {
        if (budget <= 0) break;
        if (it.dot) {
          const glow = r.shimmer && breathe ? Math.pow(Math.max(0, Math.cos(it.angle - wave)), 10) : 0;
          ctx.fillStyle = `rgba(${it.color}, ${(it.alpha + 0.45 * glow).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(it.dot[0], it.dot[1], it.size * (1 + 0.8 * glow), 0, TAU);
          ctx.fill();
          budget -= it.len;
          continue;
        }
        ctx.strokeStyle = `rgba(${it.color}, ${it.alpha})`;
        ctx.lineWidth = it.lineWidth;
        ctx.beginPath();
        ctx.moveTo(it.pts[0][0], it.pts[0][1]);
        for (let i = 1; i < it.pts.length; i++) {
          const [x0, y0] = it.pts[i - 1];
          const [x1, y1] = it.pts[i];
          const seg = Math.hypot(x1 - x0, y1 - y0);
          if (seg > budget) {
            const k = budget / seg;
            ctx.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k);
            budget = 0;
            break;
          }
          ctx.lineTo(x1, y1);
          budget -= seg;
        }
        ctx.stroke();
      }
      ctx.restore();
      if (budget <= 0) break;
    }
    ctx.restore();
  }

  /* Layout, animation and events ---------------------------------------------*/

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Keep the lower mandala clear of the fixed desktop sidebar.
    let left = 0;
    const sidebar = document.querySelector(".site-sidebar");
    if (sidebar) {
      const s = sidebar.getBoundingClientRect();
      if (s.height >= height - 1 && s.left <= 0) left = s.right;
    }
    const R = Math.max(200, Math.min(420, width * 0.32));
    const starts = mandalas.map((m) => m.start); // keep an in-progress reveal
    mandalas = [mandala(width - R * 0.22, R * 0.22, R, 1, 0), mandala(left + R * 0.22, height - R * 0.22, R, -1, 1.3)];
    mandalas.forEach((m, i) => (m.start = starts[i]));

    const main = document.querySelector('[role="main"]');
    if (main) {
      const m = main.getBoundingClientRect();
      veil = { left: m.left, right: m.right };
    }
  }

  function render(now) {
    ctx.clearRect(0, 0, width, height);
    const t = moving() ? (now / 1000) * SPEED : 0;
    let revealing = false;
    for (const m of mandalas) {
      const f = m.start === undefined ? 1 : (now - m.start) / MANDALA_MS;
      drawShape(m, 1 - Math.pow(1 - Math.min(1, f), 2), t, moving());
      if (f < 1) revealing = true;
    }
    // Fade the pattern behind the text column (soft edges) so the content stays readable.
    if (veil) {
      const edge = 48;
      const left = veil.left - edge;
      const w = veil.right - veil.left + edge * 2;
      const k = edge / w;
      const fade = ctx.createLinearGradient(left, 0, left + w, 0);
      fade.addColorStop(0, "rgba(0, 0, 0, 0)");
      fade.addColorStop(k, `rgba(0, 0, 0, ${VEIL})`);
      fade.addColorStop(1 - k, `rgba(0, 0, 0, ${VEIL})`);
      fade.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = fade;
      ctx.fillRect(left, 0, w, height);
      ctx.restore();
    }

    // Flowers are drawn over the fade: they mark where you clicked, then fade away.
    flowers = flowers.filter((fl) => now - fl.start < FLOWER_LIFE_MS);
    for (const fl of flowers) {
      const age = now - fl.start;
      ctx.globalAlpha = Math.min(1, (FLOWER_LIFE_MS - age) / FLOWER_FADE_MS);
      drawShape(fl, fl.animate ? age / FLOWER_MS : 1, t, false);
      ctx.globalAlpha = 1;
    }
    return revealing || flowers.length > 0;
  }

  // Frames are paced to FRAME_MS. Every 2 seconds the achieved frame rate is
  // checked; if it is far below target, step down to a lower rate, then to still.
  let lastFrame = 0;
  let windowStart = 0;
  let windowFrames = 0;
  function loop() {
    const now = performance.now();
    frame = requestAnimationFrame(loop);
    const target = FRAME_MS[Math.min(quality, 1)];
    if (lastFrame && now - lastFrame < target - 2) return;
    lastFrame = now;

    if (!windowStart) windowStart = now;
    windowFrames++;
    if (now - windowStart >= 2000) {
      const achieved = (windowFrames * 1000) / (now - windowStart);
      windowStart = now;
      windowFrames = 0;
      if (achieved < (1000 / target) * 0.4) quality++;
    }

    const revealing = render(now);
    // Keep animating while something moves; a still pattern stops once it is fully drawn.
    if (quality >= 2) {
      mandalas.forEach((m) => delete m.start);
      flowers.forEach((fl) => (fl.animate = false));
    }
    if (!moving() && !revealing) {
      if (quality >= 2) render(now);
      stop();
    }
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    windowStart = windowFrames = 0;
  }

  function start() {
    stop();
    if (!isLight()) {
      canvas.classList.remove("is-active");
      return;
    }
    canvas.classList.add("is-active");
    // Draw the mandalas in the first time light mode is shown on a page.
    if (!drawnOnce && moving()) {
      const now = performance.now();
      mandalas.forEach((m, i) => (m.start = now + i * 400));
    }
    drawnOnce = true;
    if (document.hidden) return;
    frame = requestAnimationFrame(loop);
  }

  document.addEventListener("click", (e) => {
    if (!isLight() || e.button !== 0 || e.target.closest(INTERACTIVE)) return;
    const selection = window.getSelection && window.getSelection();
    if (selection && !selection.isCollapsed) return;
    const fl = flower(e.clientX, e.clientY);
    fl.start = performance.now();
    fl.animate = moving();
    flowers.push(fl);
    flowers = flowers.slice(-MAX_FLOWERS);
    if (!frame) frame = requestAnimationFrame(loop);
  });

  window.addEventListener("resize", () => {
    build();
    mandalas.forEach((m) => delete m.start);
    if (isLight() && !frame) render(performance.now());
  });
  window.addEventListener("load", () => {
    build();
    if (isLight() && !frame) render(performance.now());
  });
  document.addEventListener("visibilitychange", start);
  reducedMotion.addEventListener("change", start);
  new MutationObserver(start).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  build();
  start();
})();
