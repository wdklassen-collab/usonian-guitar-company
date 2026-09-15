import { parseDXF, validateLoops, defaults, plan, gcode } from "./engine.js";
const $ = (id) => document.getElementById(id);
let contours = null,
  job = null,
  source = "",
  version = 0;
const fields = {
  stock: [
    ["width", "Stock width (mm)"],
    ["height", "Stock height (mm)"],
    ["thickness", "Thickness (mm)"],
    ["margin", "Drawing margin (mm)"],
    ["safe", "Safe Z above stock (mm)"],
    ["fixture", "Fixture height above stock (mm)"],
  ],
  cutting: [
    ["diameter", "Cutter diameter (mm)"],
    ["feed", "Cut feed (mm/min)"],
    ["plunge", "Plunge feed (mm/min)"],
    ["rpm", "Spindle speed (RPM)"],
    ["maxRpm", "Spindle maximum ($30)"],
    ["step", "Depth per pass (mm)"],
    ["through", "Spoilboard allowance (mm)"],
  ],
  holding: [
    ["tabCount", "Tabs per contour"],
    ["tabWidth", "Finished tab width (mm)"],
    ["tabHeight", "Tab height (mm)"],
  ],
};
for (const [group, fs] of Object.entries(fields))
  for (const [key, label] of fs) {
    const l = document.createElement("label");
    l.textContent = label;
    const i = document.createElement("input");
    i.type = "number";
    i.id = key;
    i.value = defaults[key];
    i.step = key === "tabCount" ? "1" : "any";
    l.append(i);
    $(group).append(l);
  }
function message(text, type = "") {
  $("status").textContent = text;
  $("status").className = type;
}
function invalidate() {
  job = null;
  $("review").checked = false;
  $("review").disabled = true;
  $("download").disabled = true;
  $("scrub").disabled = true;
  $("preview").replaceChildren();
  $("summary").textContent = "Plan needs validation";
  $("moveInfo").textContent = "Generate a plan to inspect cutting depth.";
}
$("settings").addEventListener("input", () => {
  invalidate();
  message("Settings changed. Validate again before exporting.");
});
function parse() {
  invalidate();
  contours = null;
  try {
    contours = parseDXF(source, $("units").value);
    message(
      `${contours.filter((c) => !c.hole).length} outside profile(s), ${contours.filter((c) => c.hole).length} hole(s). Ready to validate.`,
    );
  } catch (e) {
    message(e.message, "error");
  }
}
$("file").addEventListener("change", async () => {
  const n = ++version;
  source = "";
  contours = null;
  invalidate();
  const f = $("file").files[0];
  if (!f) return;
  if (f.size > 2000000) {
    message("DXF exceeds the 2 MB limit.", "error");
    return;
  }
  $("filename").textContent = f.name;
  try {
    const text = await f.text();
    if (n !== version) return;
    source = text;
    parse();
  } catch (e) {
    message(e.message, "error");
  }
});
$("units").addEventListener("change", () => {
  if (source) parse();
});
$("demo").addEventListener("click", () => {
  version++;
  source = "";
  invalidate();
  for (const [k, v] of Object.entries(defaults)) $(k).value = v;
  const circle = (x, y, r) =>
    Array.from({ length: 160 }, (_, i) => ({
      x: x + r * Math.cos((i * 2 * Math.PI) / 160),
      y: y + r * Math.sin((i * 2 * Math.PI) / 160),
    }));
  contours = validateLoops([
    [
      { x: 0, y: 0 },
      { x: 150, y: 0 },
      { x: 150, y: 80 },
      { x: 0, y: 80 },
    ],
    circle(45, 40, 22),
    circle(105, 40, 22),
  ]);
  $("filename").textContent =
    "Sample · 150 × 80 mm template with two 44 mm holes";
  generate();
});
function generate() {
  invalidate();
  if (!contours) {
    message("Load a supported DXF first.", "error");
    return;
  }
  try {
    const s = Object.fromEntries(
      Object.entries(defaults).map(([k, v]) => [
        k,
        typeof v === "number"
          ? $(k).value.trim() === ""
            ? NaN
            : Number($(k).value)
          : $(k).value,
      ]),
    );
    job = plan(contours, s);
    $("review").disabled = false;
    $("scrub").disabled = false;
    $("scrub").max = job.moves.length - 1;
    $("scrub").value = 0;
    $("summary").textContent =
      `${job.paths.length} contours · ${job.passes} passes · ${job.moves.length.toLocaleString()} moves`;
    message(
      "Geometry and cutter clearance checks passed.\nReview the preview and setup before downloading.",
      "success",
    );
    draw();
  } catch (e) {
    message(e.message, "error");
  }
}
$("generate").addEventListener("click", generate);
const NS = "http://www.w3.org/2000/svg";
function shape(tag, attrs, parent = $("preview")) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent.append(el);
  return el;
}
function draw() {
  if (!job) return;
  const { settings: s } = job,
    svg = $("preview"),
    ox = s.zero === "center" ? s.width / 2 : 0,
    oy = s.zero === "center" ? s.height / 2 : 0;
  svg.replaceChildren();
  svg.setAttribute(
    "viewBox",
    `${-ox - 10} ${-s.height + oy - 10} ${s.width + 20} ${s.height + 20}`,
  );
  const g = shape("g", { transform: "scale(1,-1)" });
  shape(
    "rect",
    {
      x: -ox,
      y: -oy,
      width: s.width,
      height: s.height,
      fill: "#eee3cf",
      stroke: "#b9aa94",
      "stroke-width": 0.3,
    },
    g,
  );
  const path = (pts, color, width, dash) =>
    shape(
      "polyline",
      {
        points: pts.map((p) => `${p.x},${p.y}`).join(" "),
        fill: "none",
        stroke: color,
        "stroke-width": width,
        ...(dash ? { "stroke-dasharray": "2 2" } : {}),
      },
      g,
    );
  for (const c of job.paths) {
    path([...c.points, c.points[0]], "#241e18", 0.35);
    path([...c.path, c.path[0]], "#b65f32", s.diameter);
    g.lastChild.setAttribute("opacity", ".18");
    path([...c.path, c.path[0]], "#b65f32", 0.3);
  }
  let previous = null;
  for (const m of job.moves) {
    if (m.x !== null) {
      if (m.kind === "rapid" && previous)
        path([previous, m], "#52758b", 0.3, true);
      previous = m;
    }
  }
  for (const t of job.tabs)
    shape("circle", { cx: t.x, cy: t.y, r: 1.3, fill: "#66705a" }, g);
  path(
    [
      { x: -3, y: 0 },
      { x: 3, y: 0 },
    ],
    "#52758b",
    0.5,
  );
  path(
    [
      { x: 0, y: -3 },
      { x: 0, y: 3 },
    ],
    "#52758b",
    0.5,
  );
  const idx = Number($("scrub").value),
    m = job.moves[idx];
  let pos = m;
  if (pos.x === null)
    pos = job.moves
      .slice(0, idx)
      .reverse()
      .find((v) => v.x !== null);
  if (pos)
    shape(
      "circle",
      {
        cx: pos.x,
        cy: pos.y,
        r: s.diameter / 2,
        fill: "#b65f32",
        stroke: "#241e18",
        "stroke-width": 0.4,
      },
      g,
    );
  $("moveInfo").textContent =
    `Move ${idx + 1}/${job.moves.length} · ${m.kind} · Z ${m.z.toFixed(3)} mm (${s.zZero} zero)`;
}
$("scrub").addEventListener("input", draw);
$("review").addEventListener("change", () => {
  $("download").disabled = !job || !$("review").checked;
});
$("download").addEventListener("click", () => {
  if (!job || !$("review").checked) return;
  const url = URL.createObjectURL(
      new Blob([gcode(job)], { type: "text/plain" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = "usonian-cnc-template.nc";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
