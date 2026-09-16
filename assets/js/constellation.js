// Dark-mode background: a drifting graph of nodes and edges. Clicking an empty
// part of the page adds new nodes, which link up with their neighbours.
// Runs only while the resolved theme is dark; honours prefers-reduced-motion.
(function () {
  const canvas = document.querySelector("canvas.constellation");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const LINK_DIST = 140; // max distance at which two nodes are joined
  const CURSOR_DIST = 180; // cursor links to nodes within this distance
  const SPAWN_COUNT = 4; // nodes added per click
  const COLORS = ["#e8a33d", "#f5e9d4", "#e0714b"]; // saffron, cream, soft vermilion

  let nodes = [];
  let width = 0;
  let height = 0;
  let maxNodes = 0;
  let cursor = null;
  let frame = null;

  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";

  function makeNode(x, y, spawned) {
    const speed = spawned ? 0.6 : 0.25;
    const angle = Math.random() * Math.PI * 2;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed * (0.4 + Math.random()),
      vy: Math.sin(angle) * speed * (0.4 + Math.random()),
      r: spawned ? 2.6 : 1.4 + Math.random() * 1.4,
      color: spawned ? COLORS[2] : COLORS[Math.random() < 0.7 ? 0 : 1],
      born: spawned ? performance.now() : 0,
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Density scales with viewport area, so phones get a lighter graph.
    const base = Math.round(Math.min(160, Math.max(45, (width * height) / 9000)));
    maxNodes = base * 2;
    if (nodes.length === 0) {
      for (let i = 0; i < base; i++) nodes.push(makeNode(Math.random() * width, Math.random() * height, false));
    } else {
      nodes.forEach((n) => {
        n.x = Math.min(n.x, width);
        n.y = Math.min(n.y, height);
      });
    }
  }

  function step() {
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
      // Spawned nodes start fast and settle to the ambient drift.
      if (n.born && Math.hypot(n.vx, n.vy) > 0.3) {
        n.vx *= 0.995;
        n.vy *= 0.995;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          const alpha = 0.35 * (1 - Math.sqrt(d2) / LINK_DIST);
          ctx.strokeStyle = `rgba(232, 163, 61, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      if (cursor) {
        const dx = a.x - cursor.x;
        const dy = a.y - cursor.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < CURSOR_DIST) {
          ctx.strokeStyle = `rgba(245, 233, 212, ${(0.4 * (1 - d / CURSOR_DIST)).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(cursor.x, cursor.y);
          ctx.stroke();
        }
      }
    }

    const now = performance.now();
    for (const n of nodes) {
      // New nodes glow for a couple of seconds after being added.
      const glow = n.born ? Math.max(0, 1 - (now - n.born) / 2500) : 0;
      if (glow > 0) {
        ctx.fillStyle = `rgba(224, 113, 75, ${(0.25 * glow).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 6 * glow, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    step();
    draw();
    frame = requestAnimationFrame(loop);
  }

  function start() {
    stop();
    if (!isDark()) {
      ctx.clearRect(0, 0, width, height);
      canvas.classList.remove("is-active");
      return;
    }
    canvas.classList.add("is-active");
    if (reducedMotion.matches || document.hidden) draw();
    else frame = requestAnimationFrame(loop);
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
  }

  // Clicks on links, controls, charts, figures or the sidebar keep their usual behaviour.
  const IGNORE =
    "a, button, input, textarea, select, label, summary, [role='button'], .site-sidebar, .echarts, canvas:not(.constellation), figure, table, pre, ninja-keys";

  document.addEventListener("click", (e) => {
    if (!isDark() || e.button !== 0) return;
    if (e.target.closest && e.target.closest(IGNORE)) return;
    const selection = window.getSelection && window.getSelection();
    if (selection && !selection.isCollapsed) return; // user was selecting text

    for (let i = 0; i < SPAWN_COUNT; i++) {
      nodes.push(makeNode(e.clientX + (Math.random() - 0.5) * 30, e.clientY + (Math.random() - 0.5) * 30, true));
    }
    // Keep the graph bounded: retire the oldest nodes first.
    if (nodes.length > maxNodes) nodes.splice(0, nodes.length - maxNodes);
    if (!frame) draw();
  });

  window.addEventListener("pointermove", (e) => {
    cursor = e.pointerType === "mouse" ? { x: e.clientX, y: e.clientY } : null;
  });
  document.addEventListener("pointerleave", () => (cursor = null));
  window.addEventListener("resize", () => {
    resize();
    if (!frame && isDark()) draw();
  });
  document.addEventListener("visibilitychange", start);
  reducedMotion.addEventListener("change", start);
  new MutationObserver(start).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  resize();
  start();
})();
