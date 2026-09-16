// Dark-mode background: a drifting graph of nodes and edges.
//  - Labelled "research" nodes (from _data/research_graph.yml) link topics, papers
//    and places; hover shows a label, click opens the page.
//  - Clicking empty space adds nodes; when two added clusters meet, their link flashes.
//  - The cursor leaves a fading ink trail and gently pushes nodes away.
//  - Double-clicking empty space writes the Bengali name in ink.
//  - Every 20th click, the nodes briefly gather into the Bengali name.
//  - Hovering a project card pulses links from nearby nodes into the card.
//  - Scrolling shifts the nodes slightly (parallax).
// Runs only while the resolved theme is dark; animations are skipped under
// prefers-reduced-motion.
(function () {
  const canvas = document.querySelector("canvas.constellation");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const tooltip = document.querySelector(".graph-tooltip");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const LINK_DIST = 140; // max distance at which two nodes are joined
  const SHAPE_NODES = 200; // nodes used to form the name
  const FRAME_MS = [33, 50]; // frame interval at full and reduced quality (~30 and 20 fps)
  const CURSOR_DIST = 180; // cursor links to nodes within this distance
  const REPEL_DIST = 110; // nodes closer than this to the cursor are pushed away
  const HUB_LINK_DIST = 120; // plain nodes link to research nodes within this distance
  const SPAWN_COUNT = 4; // nodes added per click
  const EGG_EVERY = 20; // clicks between name formations
  const AMBIENT_SPEED = 0.35; // faster nodes are damped back to this speed
  const GOLD = "232, 163, 61";
  const CREAM = "245, 233, 212";
  const VERMILION = "224, 113, 75";
  const HUB_COLORS = { topic: "#e8a33d", paper: "#e0714b", place: "#f5e9d4" };
  const NAME = (document.querySelector(".sidebar-name-native") || {}).textContent?.trim() || "আযুষ";

  // Elements whose clicks keep their usual behaviour.
  const INTERACTIVE =
    "a, button, input, textarea, select, label, summary, [role='button'], .site-sidebar, .echarts, canvas:not(.constellation), figure, table, pre, ninja-keys, .graph-tooltip";
  // Elements over which research nodes are not hoverable (they sit behind the text).
  const CONTENT = INTERACTIVE + ", p, li, h1, h2, h3, h4, h5, h6, img, blockquote, .card, span, code, em, strong";

  let nodes = [];
  let width = 0;
  let height = 0;
  let maxNodes = 0;
  let quality = 0; // 0 full, 1 fewer nodes and lower frame rate, 2 still (redraws on interaction only)
  let linkDist = LINK_DIST;
  let shapeLinkDist = 20;
  let cursor = null;
  let frame = null;
  let group = 0;
  let clicks = 0;
  let flashes = [];
  let trail = [];
  let writings = [];
  let formation = null;
  let hovered = null;
  let pinned = null;
  let activeCard = null;
  let lastScroll = window.scrollY;

  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
  const animated = () => !reducedMotion.matches && quality < 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* Research nodes ------------------------------------------------------------*/

  let research = { nodes: [], edges: [] };
  try {
    const data = document.getElementById("research-graph-data");
    if (data) research = JSON.parse(data.textContent);
  } catch (err) {
    // Leave the research layer empty if the data is malformed.
  }
  const hubs = (research.nodes || []).map((n, i) => ({
    ...n,
    x: 0,
    y: 0,
    ax: 0,
    ay: 0,
    phase: i * 2.39996, // golden angle, so layouts are stable between pages
    r: n.kind === "topic" ? 5 : 4.2,
    labelBox: null,
  }));
  const hubById = new Map(hubs.map((h) => [h.id, h]));
  const hubEdges = (research.edges || []).map(([a, b]) => [hubById.get(a), hubById.get(b)]).filter(([a, b]) => a && b);
  const neighbours = new Map(hubs.map((h) => [h, new Set()]));
  hubEdges.forEach(([a, b]) => {
    neighbours.get(a).add(b);
    neighbours.get(b).add(a);
  });

  // Free space for the graph: right of the fixed sidebar (desktop) or below the
  // top bar (mobile), plus the content column so hubs can avoid it.
  function region() {
    const sidebar = document.querySelector(".site-sidebar");
    const main = document.querySelector('[role="main"]');
    let left = 0;
    let top = 0;
    if (sidebar) {
      const s = sidebar.getBoundingClientRect();
      if (s.height >= height - 1 && s.left <= 0) left = s.right;
      else top = Math.max(0, s.bottom);
    }
    const m = main ? main.getBoundingClientRect() : { left, right: width };
    return { left, top, contentLeft: m.left, contentRight: m.right };
  }

  // A small force layout: edges pull, nodes repel, and when there is a wide
  // enough margin beside the content, hubs are pushed into it so labels stay readable.
  function layoutHubs() {
    if (!hubs.length) return;
    const reg = region();
    const pad = 36;
    const minX = reg.left + pad;
    const maxX = width - pad;
    const minY = reg.top + pad;
    const maxY = height - pad;
    const leftWide = reg.contentLeft - reg.left >= 190;
    const rightWide = width - reg.contentRight >= 190;

    hubs.forEach((h, i) => {
      const a = h.phase;
      const rad = 0.35 + 0.12 * ((i % 3) / 2);
      h.x = (minX + maxX) / 2 + Math.cos(a) * (maxX - minX) * rad;
      h.y = (minY + maxY) / 2 + Math.sin(a) * (maxY - minY) * rad;
      h.column = null;
      h.side = null;
      if (leftWide || rightWide) {
        // Each hub gets a margin column: alternate between them when both are wide.
        const useLeft = leftWide && (!rightWide || i % 2 === 0);
        h.column = useLeft ? [reg.left, reg.contentLeft] : [reg.contentRight, width];
        h.side = useLeft ? "left" : "right";
        h.x = (h.column[0] + h.column[1]) / 2;
      }
    });

    for (let iter = 0; iter < 300; iter++) {
      const fx = new Array(hubs.length).fill(0);
      const fy = new Array(hubs.length).fill(0);
      for (let i = 0; i < hubs.length; i++) {
        for (let j = i + 1; j < hubs.length; j++) {
          const dx = hubs[i].x - hubs[j].x;
          const dy = hubs[i].y - hubs[j].y;
          const d2 = Math.max(dx * dx + dy * dy, 100);
          const f = 16000 / d2;
          const d = Math.sqrt(d2);
          fx[i] += (dx / d) * f;
          fy[i] += (dy / d) * f;
          fx[j] -= (dx / d) * f;
          fy[j] -= (dy / d) * f;
        }
      }
      hubEdges.forEach(([a, b]) => {
        const i = hubs.indexOf(a);
        const j = hubs.indexOf(b);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.max(Math.hypot(dx, dy), 1);
        const f = (d - 150) * 0.02;
        // Edges between the two margins only pull vertically.
        const pullX = a.side === b.side;
        if (pullX) fx[i] += (dx / d) * f;
        fy[i] += (dy / d) * f;
        if (pullX) fx[j] -= (dx / d) * f;
        fy[j] -= (dy / d) * f;
      });
      hubs.forEach((h, i) => {
        if (h.column) fx[i] += ((h.column[0] + h.column[1]) / 2 - h.x) * 0.05;
        h.x = clamp(h.x + clamp(fx[i], -12, 12), minX, maxX);
        h.y = clamp(h.y + clamp(fy[i], -12, 12), minY, maxY);
        // Hubs with a margin column stay inside it, clear of the text.
        if (h.column) h.x = clamp(h.x, h.column[0] + 50, h.column[1] - 50);
      });
    }

    // Space the hubs in each margin evenly enough that their labels never overlap.
    ["left", "right"].forEach((side) => {
      const col = hubs.filter((h) => h.side === side).sort((p, q) => p.y - q.y);
      if (col.length < 2) return;
      const gap = Math.min(90, (maxY - minY) / (col.length - 1));
      for (let k = 1; k < col.length; k++) col[k].y = Math.max(col[k].y, col[k - 1].y + gap);
      const overflow = col[col.length - 1].y - maxY;
      if (overflow > 0) col.forEach((h) => (h.y = Math.max(minY, h.y - overflow)));
      for (let k = 1; k < col.length; k++) col[k].y = Math.max(col[k].y, col[k - 1].y + gap);
    });

    ctx.font = "600 12px 'Source Sans 3', sans-serif";
    hubs.forEach((h) => {
      h.ax = h.x;
      h.ay = h.y;
      h.labelBox = null;
      // Labels are drawn only for hubs sitting in a margin; others show on hover.
      if (!h.column) return;
      const [colLeft, colRight] = h.column;
      const lines = h.label.split(" · ");
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width));
      if (w > colRight - colLeft - 16) return;
      h.labelBox = { lines, left: clamp(h.x - w / 2, colLeft + 8, colRight - 8 - w) };
    });
  }

  function hubAt(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const h of hubs) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < h.r + 12 && d < bestD) [best, bestD] = [h, d];
    }
    return best;
  }

  function showTooltip(h) {
    if (!tooltip) return;
    if (!h) {
      tooltip.hidden = true;
      return;
    }
    const kind = { topic: "Research topic", paper: "Publication", place: "Institution" }[h.kind] || "";
    tooltip.innerHTML = "";
    const k = document.createElement("span");
    k.className = "graph-tooltip-kind";
    k.textContent = kind;
    const label = h.url ? document.createElement("a") : document.createElement("span");
    label.className = "graph-tooltip-label";
    label.textContent = h.label;
    if (h.url) label.href = h.url;
    tooltip.append(k, label);
    tooltip.hidden = false;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    tooltip.style.left = `${clamp(h.x + 14, 8, width - tw - 8)}px`;
    tooltip.style.top = `${clamp(h.y - th - 10, 8, height - th - 8)}px`;
  }

  function setHovered(h) {
    if (h === hovered) return;
    hovered = h;
    document.documentElement.classList.toggle("graph-hover", !!(h && h.url));
    showTooltip(h);
    if (!frame) draw(performance.now());
  }

  /* Plain nodes ---------------------------------------------------------------*/

  function makeNode(x, y, spawnGroup) {
    const speed = spawnGroup ? 0.6 : 0.25;
    const angle = Math.random() * Math.PI * 2;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed * (0.4 + Math.random()),
      vy: Math.sin(angle) * speed * (0.4 + Math.random()),
      r: spawnGroup ? 2.6 : 1.4 + Math.random() * 1.4,
      color: spawnGroup ? "#e0714b" : Math.random() < 0.7 ? "#e8a33d" : "#f5e9d4",
      group: spawnGroup,
      flashed: false,
      born: spawnGroup ? performance.now() : 0,
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
    const base = Math.round(Math.min(70, Math.max(24, (width * height) / 20000)));
    maxNodes = quality ? Math.round(base * 0.6) + 15 : base + 30;
    if (nodes.length === 0) {
      for (let i = 0; i < base; i++) nodes.push(makeNode(Math.random() * width, Math.random() * height, 0));
    } else {
      nodes.forEach((n) => {
        n.x = Math.min(n.x, width);
        n.y = Math.min(n.y, height);
      });
    }
    layoutHubs();
  }

  // dt is elapsed time in 60 fps frames, so motion speed is independent of refresh rate.
  function step(now, dt) {
    const ease = (k) => 1 - Math.pow(1 - k, dt);
    for (const n of nodes) {
      if (formation && n.tx !== undefined) {
        n.x += (n.tx - n.x) * ease(0.08);
        n.y += (n.ty - n.y) * ease(0.08);
        continue;
      }
      if (cursor) {
        const dx = n.x - cursor.x;
        const dy = n.y - cursor.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL_DIST * REPEL_DIST && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (1 - d / REPEL_DIST) * 0.12 * dt;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
        }
      }
      if (Math.hypot(n.vx, n.vy) > AMBIENT_SPEED) {
        n.vx *= Math.pow(0.985, dt);
        n.vy *= Math.pow(0.985, dt);
      }
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.x < 0) [n.x, n.vx] = [0, Math.abs(n.vx)];
      if (n.x > width) [n.x, n.vx] = [width, -Math.abs(n.vx)];
      if (n.y < 0) [n.y, n.vy] = [0, Math.abs(n.vy)];
      if (n.y > height) [n.y, n.vy] = [height, -Math.abs(n.vy)];
    }

    if (formation && now > formation.until) {
      for (const n of nodes) {
        if (n.tx === undefined) continue;
        delete n.tx;
        delete n.ty;
        const a = Math.random() * Math.PI * 2;
        n.vx = Math.cos(a) * 1.2;
        n.vy = Math.sin(a) * 1.2;
        if (n.borrowed) n.fading = now;
      }
      formation = null;
      setTimeout(() => canvas.classList.remove("is-raised"), 1200);
    }
    linkDist += ((formation ? shapeLinkDist : LINK_DIST) - linkDist) * ease(0.08);

    for (const h of hubs) {
      h.x = h.ax + Math.sin(now * 0.0004 + h.phase) * 6;
      h.y = h.ay + Math.cos(now * 0.0005 + h.phase) * 6;
    }
    nodes = nodes.filter((n) => !n.fading || now - n.fading < 1500);
    trail = trail.filter((p) => now - p.t < 600);
  }

  /* Drawing -------------------------------------------------------------------*/

  function line(ax, ay, bx, by, rgb, alpha, lineWidth = 1) {
    ctx.strokeStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  // Faint links are batched by colour and opacity (20 levels) so each batch is one stroke.
  const batches = new Map();
  function batchLine(ax, ay, bx, by, rgb, alpha) {
    const level = Math.round(alpha * 20);
    if (level <= 0) return;
    const key = `${rgb}|${level}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(ax, ay, bx, by);
  }
  function flushLines() {
    ctx.lineWidth = 1;
    for (const [key, segs] of batches) {
      const [rgb, level] = key.split("|");
      ctx.strokeStyle = `rgba(${rgb}, ${level / 20})`;
      ctx.beginPath();
      for (let i = 0; i < segs.length; i += 4) {
        ctx.moveTo(segs[i], segs[i + 1]);
        ctx.lineTo(segs[i + 2], segs[i + 3]);
      }
      ctx.stroke();
    }
    batches.clear();
  }

  function dot(x, y, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    const L2 = linkDist * linkDist;

    // Links between plain nodes; the first link between two added clusters flashes.
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= L2) continue;
        batchLine(a.x, a.y, b.x, b.y, GOLD, 0.35 * (1 - Math.sqrt(d2) / linkDist));
        if (a.group && b.group && a.group !== b.group && !(a.flashed && b.flashed) && !formation) {
          a.flashed = b.flashed = true;
          flashes.push({ a, b, t: now });
        }
      }
      if (cursor && !formation) {
        const d = Math.hypot(a.x - cursor.x, a.y - cursor.y);
        if (d < CURSOR_DIST) batchLine(a.x, a.y, cursor.x, cursor.y, CREAM, 0.4 * (1 - d / CURSOR_DIST));
      }
      if (!formation) {
        for (const h of hubs) {
          const d = Math.hypot(a.x - h.x, a.y - h.y);
          if (d < HUB_LINK_DIST) batchLine(a.x, a.y, h.x, h.y, GOLD, 0.2 * (1 - d / HUB_LINK_DIST));
        }
      }
    }
    flushLines();

    // Research edges; the hovered node's edges are highlighted.
    for (const [a, b] of hubEdges) {
      const lit = hovered && (a === hovered || b === hovered);
      line(a.x, a.y, b.x, b.y, lit ? GOLD : CREAM, lit ? 0.8 : 0.2, lit ? 1.6 : 1);
    }

    // Pulses from nearby nodes into the hovered project card.
    if (activeCard) {
      const rect = activeCard.getBoundingClientRect();
      const nearest = nodes
        .map((n) => {
          const px = clamp(n.x, rect.left, rect.right);
          const py = clamp(n.y, rect.top, rect.bottom);
          return { n, px, py, d: Math.hypot(n.x - px, n.y - py) };
        })
        .filter((o) => o.d > 0)
        .sort((p, q) => p.d - q.d)
        .slice(0, 7);
      nearest.forEach((o, i) => {
        line(o.n.x, o.n.y, o.px, o.py, GOLD, 0.5);
        const t = animated() ? (now / 1100 + i * 0.15) % 1 : 0.5;
        dot(o.n.x + (o.px - o.n.x) * t, o.n.y + (o.py - o.n.y) * t, 2.2, `rgb(${CREAM})`);
      });
    }

    flashes = flashes.filter((f) => now - f.t < 700);
    for (const f of flashes) {
      const k = 1 - (now - f.t) / 700;
      line(f.a.x, f.a.y, f.b.x, f.b.y, CREAM, 0.9 * k, 1 + 1.5 * k);
    }

    for (const n of nodes) {
      // Added nodes glow for a couple of seconds.
      const glow = n.born ? Math.max(0, 1 - (now - n.born) / 2500) : 0;
      if (glow > 0) dot(n.x, n.y, n.r + 6 * glow, `rgba(${VERMILION}, ${(0.25 * glow).toFixed(3)})`);
      ctx.globalAlpha = n.fading ? Math.max(0, 1 - (now - n.fading) / 1500) : 1;
      dot(n.x, n.y, n.r, n.color);
      ctx.globalAlpha = 1;
    }

    ctx.font = "600 12px 'Source Sans 3', sans-serif";
    ctx.textBaseline = "top";
    for (const h of hubs) {
      const color = HUB_COLORS[h.kind] || HUB_COLORS.topic;
      const lit = h === hovered || (hovered && neighbours.get(hovered).has(h));
      ctx.strokeStyle = color;
      ctx.globalAlpha = lit ? 0.9 : 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r + (h === hovered ? 7 : 4), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      dot(h.x, h.y, h.r, color);
      if (h.labelBox) {
        ctx.fillStyle = `rgba(${CREAM}, ${lit ? 1 : 0.7})`;
        h.labelBox.lines.forEach((text, i) => ctx.fillText(text, h.labelBox.left, h.y + h.r + 8 + i * 15));
      }
    }

    // Ink trail behind the cursor.
    for (let i = 1; i < trail.length; i++) {
      const k = 1 - (now - trail[i].t) / 600;
      if (k > 0) line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y, GOLD, 0.8 * k, 0.6 + 2 * k);
    }

    // The name, written left to right by a glowing pen nib, then faded out.
    writings = writings.filter((w) => now - w.t < 3700);
    for (const w of writings) {
      const age = now - w.t;
      const reveal = Math.min(1, age / 1400);
      ctx.save();
      ctx.globalAlpha = age < 2800 ? 0.95 : Math.max(0, 1 - (age - 2800) / 900);
      ctx.beginPath();
      ctx.rect(w.x, w.y, w.w * reveal, w.h);
      ctx.clip();
      ctx.drawImage(w.img, w.x, w.y, w.w, w.h);
      ctx.restore();
      if (reveal < 1) {
        const nx = w.x + w.w * reveal;
        const ny = w.y + w.h / 2 + Math.sin(age / 70) * w.h * 0.2;
        dot(nx, ny, 7, `rgba(${GOLD}, 0.3)`);
        dot(nx, ny, 2.5, `rgb(${CREAM})`);
      }
    }
  }

  // Frames are paced to FRAME_MS. If most frames arrive far later than asked, the
  // page is struggling, so step down: first fewer nodes at a lower frame rate,
  // then a still graph that redraws only when you interact with it.
  let lastFrame = 0;
  let windowStart = 0;
  let windowFrames = 0;
  function loop() {
    const now = performance.now();
    frame = requestAnimationFrame(loop);
    const target = FRAME_MS[quality];
    if (lastFrame && now - lastFrame < target - 2) return;
    const elapsed = lastFrame ? now - lastFrame : target;
    lastFrame = now;

    // Every 2 seconds, compare the frames actually drawn with the target rate.
    if (!windowStart) windowStart = now;
    windowFrames++;
    if (now - windowStart >= 2000) {
      const achieved = (windowFrames * 1000) / (now - windowStart);
      windowStart = now;
      windowFrames = 0;
      if (achieved < (1000 / target) * 0.4) {
        degrade();
        if (!frame) return;
      }
    }

    step(now, Math.min(4, elapsed / 16.667));
    draw(now);
  }

  function degrade() {
    quality++;
    if (quality === 1) {
      nodes = nodes.slice(Math.floor(nodes.length * 0.4));
      maxNodes = Math.round(maxNodes * 0.6);
      return;
    }
    quality = 2;
    formation = null;
    canvas.classList.remove("is-raised");
    nodes.forEach((n) => delete n.tx);
    nodes = nodes.filter((n) => !n.borrowed);
    cursor = null;
    trail = [];
    stop();
    draw(performance.now());
  }

  function start() {
    stop();
    if (!isDark()) {
      ctx.clearRect(0, 0, width, height);
      canvas.classList.remove("is-active");
      setHovered(null);
      return;
    }
    canvas.classList.add("is-active");
    if (animated() && !document.hidden) frame = requestAnimationFrame(loop);
    else draw(performance.now());
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    windowStart = windowFrames = 0;
  }

  /* Name writing and formation ------------------------------------------------*/

  function renderName(size) {
    const font = `700 ${size}px "Noto Serif Bengali", serif`;
    return document.fonts.load(font, NAME).then(
      () => font,
      () => font,
    );
  }

  function writeName(x, y) {
    const size = clamp(width * 0.08, 40, 72);
    renderName(size).then((font) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const off = document.createElement("canvas");
      const c = off.getContext("2d");
      c.font = font;
      const w = c.measureText(NAME).width + size * 0.4;
      const h = size * 1.7;
      off.width = Math.ceil(w * dpr);
      off.height = Math.ceil(h * dpr);
      c.scale(dpr, dpr);
      c.font = font;
      c.textBaseline = "middle";
      const grad = c.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#e8a33d");
      grad.addColorStop(1, "#e0714b");
      c.fillStyle = grad;
      c.fillText(NAME, size * 0.2, h / 2);
      writings.push({ img: off, w, h, x: clamp(x - w / 2, 8, width - w - 8), y: clamp(y - h / 2, 8, height - h - 8), t: performance.now() });
      writings = writings.slice(-3);
    });
  }

  function formName() {
    const reg = region();
    const size = Math.min((width - reg.left) * 0.3, height * 0.6, 320);
    renderName(size).then((font) => {
      const off = document.createElement("canvas");
      off.width = Math.ceil(width);
      off.height = Math.ceil(height);
      const c = off.getContext("2d");
      c.font = font;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#fff";
      c.fillText(NAME, (reg.left + width) / 2, (reg.top + height) / 2);
      const data = c.getImageData(0, 0, off.width, off.height).data;
      const sample = (gap) => {
        const pts = [];
        for (let y = 0; y < off.height; y += gap) {
          for (let x = 0; x < off.width; x += gap) {
            if (data[(y * off.width + x) * 4 + 3] > 128) pts.push([x, y]);
          }
        }
        return pts;
      };
      if (!animated() || !isDark()) return; // quality dropped or theme changed meanwhile
      // An even grid over the letters reads far better than a random subset,
      // so widen the grid until there are about as many points as the budget.
      const budget = Math.max(nodes.length, SHAPE_NODES);
      let gap = 4;
      let points = sample(gap);
      while (points.length > budget && gap < 40) points = sample(++gap);

      // Borrow extra nodes for the shape; they fade away after it breaks up.
      while (nodes.length < points.length) {
        const n = makeNode(Math.random() * width, Math.random() * height, 0);
        n.borrowed = true;
        nodes.push(n);
      }
      for (let i = points.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [points[i], points[j]] = [points[j], points[i]];
      }
      points.forEach((pt, i) => ([nodes[i].tx, nodes[i].ty] = pt));
      shapeLinkDist = gap * 1.5;
      formation = { until: performance.now() + 3500 };
      // Lift the graph above the page while the name is shown.
      canvas.classList.add("is-raised");
    });
  }

  /* Events --------------------------------------------------------------------*/

  document.addEventListener("click", (e) => {
    if (!isDark() || e.button !== 0) return;
    const target = e.target;

    const hub = hubAt(e.clientX, e.clientY);
    if (hub && !target.closest(CONTENT)) {
      // Mouse: open straight away. Touch: the first tap shows the label.
      if (e.pointerType === "mouse" || pinned === hub) {
        if (hub.url) window.location.href = hub.url;
      } else {
        pinned = hub;
        setHovered(hub);
      }
      return;
    }
    if (pinned) {
      pinned = null;
      setHovered(null);
    }

    if (target.closest(INTERACTIVE)) return;
    const selection = window.getSelection && window.getSelection();
    if (selection && !selection.isCollapsed) return; // user was selecting text

    group++;
    for (let i = 0; i < SPAWN_COUNT; i++) {
      nodes.push(makeNode(e.clientX + (Math.random() - 0.5) * 30, e.clientY + (Math.random() - 0.5) * 30, group));
    }
    // Keep the graph bounded: retire the oldest nodes first.
    if (nodes.length > maxNodes) nodes.splice(0, nodes.length - maxNodes);
    clicks++;
    if (clicks % EGG_EVERY === 0 && animated()) formName();
    if (!frame) draw(performance.now());
  });

  document.addEventListener("dblclick", (e) => {
    if (!isDark() || !animated() || e.target.closest(INTERACTIVE)) return;
    const selection = window.getSelection && window.getSelection();
    if (selection && !selection.isCollapsed) return; // double-click selected a word
    writeName(e.clientX, e.clientY);
  });

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") {
      cursor = null;
      return;
    }
    if (!isDark()) return;
    if (animated()) {
      cursor = { x: e.clientX, y: e.clientY };
      trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    }
    const hub = hubAt(e.clientX, e.clientY);
    setHovered(hub && !e.target.closest(CONTENT) ? hub : null);
  });
  document.addEventListener("pointerleave", () => {
    cursor = null;
    setHovered(null);
  });

  window.addEventListener(
    "scroll",
    () => {
      const dy = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      if (!isDark() || !animated() || formation) return;
      for (const n of nodes) {
        n.y -= dy * 0.3;
        if (n.y < 0) n.y += height;
        else if (n.y > height) n.y -= height;
      }
    },
    { passive: true },
  );

  document.querySelectorAll(".projects .card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      if (!isDark()) return;
      activeCard = card;
      card.classList.add("graph-linked");
      if (!frame) draw(performance.now());
    });
    card.addEventListener("mouseleave", () => {
      activeCard = null;
      card.classList.remove("graph-linked");
      if (!frame && isDark()) draw(performance.now());
    });
  });

  window.addEventListener("resize", () => {
    resize();
    if (!frame && isDark()) draw(performance.now());
  });
  // Fonts and images shift the content column, so lay the hubs out again once loaded.
  window.addEventListener("load", () => {
    layoutHubs();
    if (!frame && isDark()) draw(performance.now());
  });
  document.addEventListener("visibilitychange", start);
  reducedMotion.addEventListener("change", start);
  new MutationObserver(start).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  resize();
  start();
})();
