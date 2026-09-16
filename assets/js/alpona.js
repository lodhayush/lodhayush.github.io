// Light-mode background: two faint alpona (Bengali floor-art) mandalas draw
// themselves in the corners, and clicking empty space adds a small flower.
// Runs only while the resolved theme is light; drawn instantly under
// prefers-reduced-motion.
(function () {
  const canvas = document.querySelector("canvas.alpona");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const MANDALA_MS = 6000; // time for a mandala to draw itself
  const FLOWER_MS = 900; // time for a flower to draw itself
  const MAX_FLOWERS = 40;
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

  const isLight = () => document.documentElement.getAttribute("data-theme") === "light";

  /* Shapes as polylines, so any fraction of them can be drawn ---------------*/

  const TAU = Math.PI * 2;

  function circle(cx, cy, r, color, alpha, lineWidth) {
    const pts = [];
    const steps = Math.max(24, Math.round(r / 3));
    for (let i = 0; i <= steps; i++) pts.push([cx + Math.cos((i / steps) * TAU) * r, cy + Math.sin((i / steps) * TAU) * r]);
    return { pts, color, alpha, lineWidth };
  }

  // A petal from radius r0 to r1 along angle a, bulging by w.
  function petal(cx, cy, a, r0, r1, w, color, alpha, lineWidth) {
    const pts = [];
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const side = (s, sign) => {
      const r = r0 + (r1 - r0) * s;
      const off = sign * w * Math.sin(Math.PI * s) * (1 - 0.35 * s);
      return [cx + ux * r - uy * off, cy + uy * r + ux * off];
    };
    for (let i = 0; i <= 16; i++) pts.push(side(i / 16, 1));
    for (let i = 16; i >= 0; i--) pts.push(side(i / 16, -1));
    return { pts, color, alpha, lineWidth };
  }

  function scallop(cx, cy, r, amp, bumps, color, alpha, lineWidth) {
    const pts = [];
    const steps = bumps * 12;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * TAU;
      const rr = r + amp * Math.abs(Math.sin((bumps / 2) * t));
      pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
    }
    return { pts, color, alpha, lineWidth };
  }

  function dotRing(cx, cy, r, count, size, color, alpha) {
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * TAU;
      return { dot: [cx + Math.cos(a) * r, cy + Math.sin(a) * r], size, color, alpha };
    });
  }

  function mandala(cx, cy, R) {
    const items = [circle(cx, cy, R * 0.06, VERMILION, 0.22, 1.4)];
    for (let i = 0; i < 8; i++) items.push(petal(cx, cy, (i / 8) * TAU, R * 0.08, R * 0.3, R * 0.07, VERMILION, 0.2, 1.4));
    items.push(circle(cx, cy, R * 0.36, VERMILION, 0.16, 1.2));
    items.push(...dotRing(cx, cy, R * 0.42, 24, R * 0.012, SAFFRON, 0.35));
    for (let i = 0; i < 16; i++) items.push(petal(cx, cy, ((i + 0.5) / 16) * TAU, R * 0.48, R * 0.62, R * 0.035, VERMILION, 0.16, 1.1));
    items.push(circle(cx, cy, R * 0.68, VERMILION, 0.14, 1.1));
    items.push(scallop(cx, cy, R * 0.72, R * 0.045, 36, VERMILION, 0.15, 1.1));
    items.push(...dotRing(cx, cy, R * 0.81, 48, R * 0.008, SAFFRON, 0.35));
    for (let i = 0; i < 12; i++) items.push(petal(cx, cy, (i / 12) * TAU, R * 0.85, R * 0.99, R * 0.05, VERMILION, 0.13, 1.1));
    return withLengths(items);
  }

  function flower(x, y) {
    const color = flowerCount++ % 2 ? SAFFRON : VERMILION;
    const items = [];
    for (let i = 0; i < 8; i++) items.push(petal(x, y, (i / 8) * TAU, 4, 18, 5.5, color, 0.45, 1.2));
    items.push({ dot: [x, y], size: 2.4, color: SAFFRON, alpha: 0.7 });
    return withLengths(items);
  }

  // Cumulative lengths let a shape be drawn up to any fraction of its total.
  function withLengths(items) {
    let total = 0;
    for (const it of items) {
      let len = it.dot ? it.size * 6 : 0;
      if (it.pts) for (let i = 1; i < it.pts.length; i++) len += Math.hypot(it.pts[i][0] - it.pts[i - 1][0], it.pts[i][1] - it.pts[i - 1][1]);
      it.len = len;
      total += len;
    }
    return { items, total };
  }

  function drawShape(shape, fraction) {
    let budget = shape.total * Math.min(1, fraction);
    for (const it of shape.items) {
      if (budget <= 0) return;
      if (it.dot) {
        ctx.fillStyle = `rgba(${it.color}, ${it.alpha})`;
        ctx.beginPath();
        ctx.arc(it.dot[0], it.dot[1], it.size, 0, TAU);
        ctx.fill();
        budget -= it.len;
        continue;
      }
      ctx.strokeStyle = `rgba(${it.color}, ${it.alpha})`;
      ctx.lineWidth = it.lineWidth;
      ctx.lineJoin = "round";
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
    mandalas = [mandala(width - R * 0.22, R * 0.22, R), mandala(left + R * 0.22, height - R * 0.22, R)];
  }

  function render(now) {
    ctx.clearRect(0, 0, width, height);
    let busy = false;
    for (const m of mandalas) {
      const f = m.start === undefined ? 1 : (now - m.start) / MANDALA_MS;
      drawShape(m, 1 - Math.pow(1 - Math.min(1, f), 2));
      if (f < 1) busy = true;
    }
    for (const fl of flowers) {
      const f = (now - fl.start) / FLOWER_MS;
      drawShape(fl, Math.min(1, f));
      if (f < 1) busy = true;
    }
    return busy;
  }

  // Drawn at up to ~30 fps; if frames keep arriving late, finish the drawing at once.
  let lastFrame = 0;
  let lateFrames = 0;
  function loop() {
    const now = performance.now();
    if (lastFrame && now - lastFrame < 31) {
      frame = requestAnimationFrame(loop);
      return;
    }
    if (lastFrame && now - lastFrame > 150 && ++lateFrames >= 5) {
      mandalas.forEach((m) => delete m.start);
      flowers.forEach((fl) => (fl.start = -Infinity));
    }
    lastFrame = now;
    const busy = render(now);
    frame = busy ? requestAnimationFrame(loop) : null;
    if (!busy) lastFrame = 0;
  }

  function start() {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    if (!isLight()) {
      canvas.classList.remove("is-active");
      return;
    }
    canvas.classList.add("is-active");
    // Animate the mandalas the first time light mode is shown on a page.
    if (!drawnOnce && !reducedMotion.matches) {
      const now = performance.now();
      mandalas.forEach((m, i) => (m.start = now + i * 400));
    }
    drawnOnce = true;
    loop();
  }

  document.addEventListener("click", (e) => {
    if (!isLight() || e.button !== 0 || e.target.closest(INTERACTIVE)) return;
    const selection = window.getSelection && window.getSelection();
    if (selection && !selection.isCollapsed) return;
    const fl = flower(e.clientX, e.clientY);
    fl.start = reducedMotion.matches ? -Infinity : performance.now();
    flowers.push(fl);
    flowers = flowers.slice(-MAX_FLOWERS);
    if (!frame) loop();
  });

  const rebuild = () => {
    build();
    mandalas.forEach((m) => delete m.start);
    flowers = [];
    if (isLight()) loop();
  };
  window.addEventListener("resize", rebuild);
  document.addEventListener("sidebar-toggled", rebuild);
  reducedMotion.addEventListener("change", start);
  new MutationObserver(start).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  build();
  start();
})();
