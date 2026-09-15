import ClipperLib from "clipper-lib";
import DxfParser from "dxf-parser";
const S = 10000,
  TOL = 0.01;
const fail = (m) => {
  throw new Error(m);
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ip = (p) => ({ X: Math.round(p.x * S), Y: Math.round(p.y * S) });
const fp = (p) => ({ x: p.X / S, y: p.Y / S });
const area = (p) => ClipperLib.Clipper.Area(p.map(ip)) / S / S;
function offset(p, d) {
  const co = new ClipperLib.ClipperOffset(2, (TOL * S) / 4),
    out = [];
  co.AddPath(
    p.map(ip),
    ClipperLib.JoinType.jtRound,
    ClipperLib.EndType.etClosedPolygon,
  );
  co.Execute(out, d * S);
  return out.map((q) => q.map(fp));
}
function pointSegment(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
    );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function cross(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function intersects(a, b, c, d) {
  if (
    Math.min(a.x, b.x) > Math.max(c.x, d.x) + 1e-8 ||
    Math.min(c.x, d.x) > Math.max(a.x, b.x) + 1e-8 ||
    Math.min(a.y, b.y) > Math.max(c.y, d.y) + 1e-8 ||
    Math.min(c.y, d.y) > Math.max(a.y, b.y) + 1e-8
  )
    return false;
  return (
    cross(a, b, c) * cross(a, b, d) <= 1e-12 &&
    cross(c, d, a) * cross(c, d, b) <= 1e-12
  );
}
function arc(c, r, start, sweep) {
  if (!(r > 0 && r < 10000)) fail("Invalid arc radius.");
  const n = Math.max(
    2,
    Math.ceil(
      Math.abs(sweep) /
        Math.min(Math.PI / 18, 2 * Math.acos(Math.max(-1, 1 - TOL / 4 / r))),
    ),
  );
  if (n > 10000) fail("Arc is too complex.");
  return Array.from({ length: n + 1 }, (_, i) => ({
    x: c.x + r * Math.cos(start + (sweep * i) / n),
    y: c.y + r * Math.sin(start + (sweep * i) / n),
  }));
}
export function parseDXF(text, units = "auto") {
  if (text.length > 2000000) fail("DXF exceeds the 2 MB limit.");
  // Inspect raw entity names because dxf-parser skips unknown entity types.
  const lines = text.replace(/\r/g, "").split("\n");
  let inEntities = false;
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = lines[i].trim(),
      value = lines[i + 1].trim();
    if (code === "2" && value === "ENTITIES") inEntities = true;
    if (code === "0" && value === "ENDSEC") inEntities = false;
    if (
      inEntities &&
      code === "0" &&
      ![
        "LINE",
        "ARC",
        "CIRCLE",
        "LWPOLYLINE",
        "POLYLINE",
        "VERTEX",
        "SEQEND",
      ].includes(value)
    )
      fail(`Unsupported DXF entity: ${value}. Remove it or convert it in CAD.`);
  }
  const d = new DxfParser().parseSync(text);
  if (!d?.entities?.length) fail("No drawing entities found.");
  const unit = d.header?.$INSUNITS;
  const factor =
    units === "inch"
      ? 25.4
      : units === "mm"
        ? 1
        : unit === 1
          ? 25.4
          : unit === 4
            ? 1
            : null;
  if (!factor)
    fail(
      "DXF units are missing or unsupported. Choose millimeters or inches explicitly.",
    );
  const loops = [],
    chains = [];
  for (const e of d.entities) {
    if (e.paperSpace)
      fail("Paper-space geometry is unsupported. Export a single flat sketch.");
    if (
      e.extrusionDirection &&
      (Math.abs(e.extrusionDirection.x || 0) > 1e-8 ||
        Math.abs(e.extrusionDirection.y || 0) > 1e-8 ||
        e.extrusionDirection.z !== 1)
    )
      fail("Non-XY geometry is unsupported.");
    const pt = (v) => {
      if (
        !v ||
        !Number.isFinite(v.x) ||
        !Number.isFinite(v.y) ||
        Math.abs(v.z || 0) > 1e-8
      )
        fail("Only finite, flat XY geometry at Z=0 is supported.");
      return { x: v.x * factor, y: v.y * factor };
    };
    if (
      e.extrusionDirectionX ||
      e.extrusionDirectionY ||
      (e.extrusionDirectionZ !== undefined && e.extrusionDirectionZ !== 1)
    )
      fail("Non-XY geometry is unsupported.");
    if (e.elevation || e.thickness || e.depth)
      fail("Export flat geometry at Z=0.");
    if (e.type === "CIRCLE") {
      const p = arc(pt(e.center), e.radius * factor, 0, Math.PI * 2);
      p.pop();
      loops.push(p);
    } else if (e.type === "ARC") {
      let sw = e.endAngle - e.startAngle;
      while (sw <= 0) sw += Math.PI * 2;
      chains.push(arc(pt(e.center), e.radius * factor, e.startAngle, sw));
    } else if (["LINE", "LWPOLYLINE", "POLYLINE"].includes(e.type)) {
      if (e.is3dPolyline || e.is3dPolygonMesh || e.isPolyfaceMesh)
        fail("3D polylines are unsupported.");
      const vs = e.vertices,
        p = [];
      if (!vs || vs.length < 2) fail("Empty line or polyline.");
      const n = e.shape ? vs.length : vs.length - 1;
      for (let i = 0; i < n; i++) {
        const a = pt(vs[i]),
          b = pt(vs[(i + 1) % vs.length]),
          bulge = vs[i].bulge || 0;
        if (bulge) {
          const theta = 4 * Math.atan(bulge),
            ch = dist(a, b);
          if (ch < 1e-7) fail("Degenerate bulged segment.");
          const h = (ch * (1 - bulge * bulge)) / (4 * bulge),
            c = {
              x: (a.x + b.x) / 2 - ((b.y - a.y) / ch) * h,
              y: (a.y + b.y) / 2 + ((b.x - a.x) / ch) * h,
            };
          p.push(
            ...arc(
              c,
              dist(c, a),
              Math.atan2(a.y - c.y, a.x - c.x),
              theta,
            ).slice(0, -1),
          );
        } else p.push(a);
      }
      if (e.shape) loops.push(p);
      else {
        p.push(pt(vs.at(-1)));
        chains.push(p);
      }
    } else
      fail(
        `Unsupported DXF entity: ${e.type}. Export lines, arcs, circles, or polylines; convert splines in CAD first.`,
      );
  }
  while (chains.length) {
    let p = chains.pop();
    while (dist(p[0], p.at(-1)) > 0.001) {
      const matches = [];
      chains.forEach((q, i) => {
        if (dist(p.at(-1), q[0]) <= 0.001) matches.push([i, false]);
        if (dist(p.at(-1), q.at(-1)) <= 0.001) matches.push([i, true]);
      });
      if (matches.length !== 1)
        fail(
          "Open or branching contours. Join endpoints in CAD (0.001 mm tolerance).",
        );
      const [i, rev] = matches[0],
        q = chains.splice(i, 1)[0];
      if (rev) q.reverse();
      p.push(...q.slice(1));
    }
    p.pop();
    loops.push(p);
  }
  return validateLoops(loops);
}
export function validateLoops(loops) {
  if (
    !loops.length ||
    loops.length > 100 ||
    loops.reduce((n, p) => n + p.length, 0) > 5000
  )
    fail("Use 1–100 contours and at most 5,000 vertices.");
  for (const p of loops) {
    if (
      p.length < 3 ||
      p.some(
        (q) =>
          !Number.isFinite(q.x) ||
          !Number.isFinite(q.y) ||
          Math.abs(q.x) > 10000 ||
          Math.abs(q.y) > 10000,
      )
    )
      fail("Invalid contour coordinates.");
    for (let i = 0; i < p.length; i++) {
      if (dist(p[i], p[(i + 1) % p.length]) < 0.0001)
        fail("Duplicate vertices or zero-length edges.");
      for (let j = i + 2; j < p.length; j++) {
        if (i === 0 && j === p.length - 1) continue;
        if (
          intersects(p[i], p[(i + 1) % p.length], p[j], p[(j + 1) % p.length])
        )
          fail("Self-intersecting contour. Repair it in CAD.");
      }
    }
    if (Math.abs(area(p)) < 0.01) fail("Contour has no usable area.");
    if (area(p) < 0) p.reverse();
  }
  for (let i = 0; i < loops.length; i++)
    for (let j = i + 1; j < loops.length; j++)
      for (let a = 0; a < loops[i].length; a++)
        for (let b = 0; b < loops[j].length; b++)
          if (
            intersects(
              loops[i][a],
              loops[i][(a + 1) % loops[i].length],
              loops[j][b],
              loops[j][(b + 1) % loops[j].length],
            )
          )
            fail("Contours touch, overlap, or cross.");
  return loops.map((p, i) => {
    const depth = loops.filter(
      (q, j) =>
        j !== i && ClipperLib.Clipper.PointInPolygon(ip(p[0]), q.map(ip)) === 1,
    ).length;
    if (depth > 1)
      fail(
        "Nested islands are unsupported. Use outside profiles with one level of holes.",
      );
    return { points: p, hole: depth === 1 };
  });
}
export const defaults = {
  thickness: 6,
  diameter: 3.175,
  feed: 300,
  plunge: 100,
  rpm: 10000,
  maxRpm: 10000,
  step: 1,
  through: 0.2,
  safe: 8,
  fixture: 3,
  width: 180,
  height: 100,
  margin: 10,
  tabCount: 4,
  tabWidth: 8,
  tabHeight: 2,
  zero: "corner",
  zZero: "top",
};
export function plan(contours, s) {
  for (const k of Object.keys(defaults)) {
    if (typeof defaults[k] === "number" && !Number.isFinite(s[k]))
      fail(`Enter a finite value for ${k}.`);
  }
  for (const k of [
    "thickness",
    "diameter",
    "feed",
    "plunge",
    "rpm",
    "maxRpm",
    "step",
    "safe",
    "width",
    "height",
    "tabWidth",
    "tabHeight",
  ])
    if (s[k] <= 0) fail(`${k} must be positive.`);
  if (
    s.diameter < 0.1 ||
    s.thickness < 0.1 ||
    s.step < 0.01 ||
    s.feed < 1 ||
    s.plunge < 1 ||
    !Number.isInteger(s.rpm) ||
    !Number.isInteger(s.maxRpm) ||
    s.safe - s.fixture < 1 ||
    s.through < 0 ||
    s.through > 2 ||
    s.margin < 0 ||
    s.fixture < 0 ||
    s.safe <= s.fixture ||
    s.step > s.diameter ||
    s.step > s.thickness ||
    s.tabHeight >= s.thickness ||
    s.tabCount < 2 ||
    s.tabCount > 16 ||
    !Number.isInteger(s.tabCount) ||
    s.tabWidth <= s.diameter ||
    s.rpm > s.maxRpm ||
    s.feed > 5000 ||
    s.plunge > s.feed ||
    s.width > 2000 ||
    s.height > 2000 ||
    s.thickness > 100 ||
    s.safe > 100
  )
    fail(
      "Check limits: cutter/stock ≥ 0.1 mm, pass ≥ 0.01 mm, feeds ≥ 1 mm/min, whole-number RPM, safe Z ≥ 1 mm above fixtures, pass ≤ cutter and stock thickness, 2–16 tabs wider than cutter, tab height below stock, RPM ≤ spindle maximum, plunge ≤ feed (maximum 5,000).",
    );
  if (
    !["corner", "center"].includes(s.zero) ||
    !["top", "bottom"].includes(s.zZero)
  )
    fail("Invalid stock zero.");
  contours = validateLoops(
    contours.map((c) => c.points.map((p) => ({ ...p }))),
  );
  const all = contours.flatMap((c) => c.points),
    minX = Math.min(...all.map((p) => p.x)),
    minY = Math.min(...all.map((p) => p.y)),
    r = s.diameter / 2;
  const ox = s.zero === "center" ? s.width / 2 : 0,
    oy = s.zero === "center" ? s.height / 2 : 0;
  const placed = contours.map((c) => ({
    ...c,
    points: c.points.map((p) => ({
      x: p.x - minX + s.margin - ox,
      y: p.y - minY + s.margin - oy,
    })),
  }));
  const paths = placed
    .map((c) => {
      const o = offset(c.points, c.hole ? -r : r);
      if (o.length !== 1 || Math.abs(area(o[0])) < 0.01)
        fail(
          "Cutter does not fit a hole or splits a contour. Use a smaller cutter.",
        );
      const p = o[0];
      // Erode/dilate round-trip reveals features that the chosen cutter cannot reach.
      const back = offset(p, c.hole ? r : -r);
      if (back.length !== 1) fail("Compensation changes contour topology.");
      for (const a of c.points)
        if (
          Math.min(
            ...back[0].map((b, i) =>
              pointSegment(a, b, back[0][(i + 1) % back[0].length]),
            ),
          ) > 0.03
        )
          fail(
            "Cutter cannot reach a narrow feature or inside corner within 0.03 mm. Use a smaller cutter or revise CAD.",
          );
      for (const a of p) {
        if (
          a.x - r < -ox - 0.001 ||
          a.y - r < -oy - 0.001 ||
          a.x + r > s.width - ox + 0.001 ||
          a.y + r > s.height - oy + 0.001
        )
          fail(
            "Cutter envelope leaves the stock. Increase stock size or drawing margin.",
          );
      }
      // Check complete swept segments against all other boundaries.
      for (let i = 0; i < p.length; i++) {
        const a = p[i],
          b = p[(i + 1) % p.length];
        for (const other of placed) {
          if (other === c) continue;
          for (let j = 0; j < other.points.length; j++) {
            const q = other.points[j],
              t = other.points[(j + 1) % other.points.length];
            if (
              intersects(a, b, q, t) ||
              Math.min(
                pointSegment(a, q, t),
                pointSegment(b, q, t),
                pointSegment(q, a, b),
                pointSegment(t, a, b),
              ) <
                r - 0.01
            )
              fail(
                "Cutter clearance reaches another contour. Increase spacing or use a smaller cutter.",
              );
          }
        }
      }
      // Clockwise holes, counterclockwise outside profiles: conventional milling.
      if (area(p) > 0 === c.hole) p.reverse();
      return { ...c, path: p };
    })
    .sort((a, b) => Number(b.hole) - Number(a.hole));
  const top = s.zZero === "top" ? 0 : s.thickness,
    safe = top + s.safe,
    depth = s.thickness + s.through,
    passes = Math.ceil(depth / s.step);
  if (passes > 200) fail("Too many depth passes (maximum 200).");
  const moves = [],
    tabs = [];
  const move = (kind, x, y, z) => {
    if (moves.length > 250000) fail("Toolpath exceeds 250,000 moves.");
    moves.push({ kind, x, y, z });
  };
  for (const [index, c] of paths.entries()) {
    const p = c.path,
      lens = p.map((a, i) => dist(a, p[(i + 1) % p.length])),
      total = lens.reduce((a, b) => a + b, 0),
      half = (s.tabWidth + s.diameter) / 2;
    // A hole with no remaining core produces no loose slug. All other cuts need tabs.
    const needsTabs =
      !c.hole || offset(c.points, -s.diameter + 0.01).length > 0;
    const count = needsTabs ? s.tabCount : 0;
    if (needsTabs && total / count < 2 * half + 2)
      fail(
        "Contour too small for the requested holding tabs. Reduce tab width/count or revise CAD.",
      );
    const centers = Array.from(
        { length: count },
        (_, i) => ((i + 0.5) * total) / count,
      ),
      breaks = [0, total];
    let acc = 0;
    for (const l of lens) {
      acc += l;
      breaks.push(acc);
    }
    for (const t of centers) breaks.push(t - half, t + half);
    const at = (d) => {
      let n = 0;
      for (let i = 0; i < lens.length; i++) {
        if (d <= n + lens[i] + 1e-8) {
          const f = (d - n) / lens[i];
          return {
            x: p[i].x + (p[(i + 1) % p.length].x - p[i].x) * f,
            y: p[i].y + (p[(i + 1) % p.length].y - p[i].y) * f,
          };
        }
        n += lens[i];
      }
      return p[0];
    };
    centers.forEach((t) => tabs.push({ ...at(t), contour: index }));
    const stops = [...new Set(breaks)].sort((a, b) => a - b);
    move("retract", null, null, safe);
    move("rapid", p[0].x, p[0].y, safe);
    for (let pass = 1; pass <= passes; pass++) {
      const z = top - Math.min(depth, pass * s.step);
      move("plunge", p[0].x, p[0].y, z);
      let current = z;
      for (let i = 1; i < stops.length; i++) {
        const mid = (stops[i - 1] + stops[i]) / 2,
          tab = centers.some((t) => Math.abs(mid - t) < half),
          target = tab ? Math.max(z, top - s.thickness + s.tabHeight) : z,
          a = at(stops[i - 1]),
          b = at(stops[i]);
        if (target !== current) move("plunge", a.x, a.y, target);
        move("cut", b.x, b.y, target);
        current = target;
      }
    }
    move("retract", null, null, safe);
  }
  return { paths, tabs, moves, passes, top, safe, settings: s };
}
export function gcode(job) {
  const s = job.settings,
    f = (n) => n.toFixed(3);
  return [
    "(Usonian CNC Template - mm - conventional milling)",
    "(Set G54 XY stock " + s.zero + " and Z " + s.zZero + ")",
    "(Tabs retain workpiece and hole slugs; finish by hand)",
    "G21 G17 G90 G94 G54",
    "G40 G49 G80",
    "M5",
    `G0 Z${f(job.safe)}`,
    `M3 S${Math.round(s.rpm)}`,
    "G4 P2",
    ...job.moves.map(
      (m) =>
        `${m.kind === "rapid" || m.kind === "retract" ? "G0" : "G1"}${m.x === null ? "" : ` X${f(m.x)} Y${f(m.y)}`} Z${f(m.z)}${m.kind === "cut" ? ` F${f(s.feed)}` : m.kind === "plunge" ? ` F${f(s.plunge)}` : ""}`,
    ),
    "M5",
    "M2",
    "",
  ].join("\n");
}
