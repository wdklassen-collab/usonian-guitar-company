import test from "node:test";
import assert from "node:assert/strict";
import {
  validateLoops,
  parseDXF,
  plan,
  gcode,
  defaults,
} from "../cnc-template/engine.js";
const rect = (x = 0, y = 0, w = 150, h = 80) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
const circle = (x, y, r) =>
  Array.from({ length: 160 }, (_, i) => ({
    x: x + r * Math.cos((i * 2 * Math.PI) / 160),
    y: y + r * Math.sin((i * 2 * Math.PI) / 160),
  }));
const sample = () =>
  validateLoops([rect(), circle(45, 40, 22), circle(105, 40, 22)]);
test("outside compensation expands by tool radius, holes shrink; holes first", () => {
  const j = plan(sample(), defaults);
  assert.equal(j.paths[0].hole, true);
  assert.equal(j.paths.at(-1).hole, false);
  const p = j.paths.at(-1).path;
  assert.ok(
    Math.abs(Math.min(...p.map((v) => v.x)) - (10 - defaults.diameter / 2)) <
      0.001,
  );
  const hole = j.paths[0].path;
  assert.ok(
    Math.abs(
      Math.max(...hole.map((v) => v.x)) - (55 + 22 - defaults.diameter / 2),
    ) < 0.01,
  );
});
test("G-code independently parsed: no XY rapids below safe Z, depths, feeds, tabs, ending", () => {
  const j = plan(sample(), defaults),
    nc = gcode(j);
  let x = 0,
    y = 0,
    z = null,
    feed = null,
    cut = 0,
    tab = 0;
  for (const line of nc.split("\n")) {
    if (!/^G[01] /.test(line)) continue;
    const get = (k) => {
      const m = line.match(new RegExp(k + "(-?[0-9.]+)"));
      return m ? Number(m[1]) : null;
    };
    const nx = get("X"),
      ny = get("Y"),
      nz = get("Z");
    if (line.startsWith("G0") && nx !== null) {
      assert.ok(z >= j.safe);
      assert.ok(nz >= j.safe);
    }
    if (line.startsWith("G1")) {
      feed = get("F") ?? feed;
      assert.ok(feed > 0);
      assert.ok(nz >= -6.2 - 0.001);
      assert.ok(nz <= j.safe);
      if (nx !== x || ny !== y) {
        cut++;
        if (nz === -4) tab++;
      }
    }
    x = nx ?? x;
    y = ny ?? y;
    z = nz ?? z;
  }
  assert.ok(cut > 100);
  assert.ok(tab > 0);
  assert.equal(z, j.safe);
  assert.match(nc, /M5\nM2\n$/);
  assert.doesNotMatch(nc, /G2 |G3 |G28|M6|G41|G42/);
});
test("center and bottom zero translate all generated moves consistently", () => {
  const a = plan(sample(), defaults),
    b = plan(sample(), { ...defaults, zero: "center", zZero: "bottom" });
  assert.equal(a.moves.length, b.moves.length);
  a.moves.forEach((m, i) => {
    const n = b.moves[i];
    assert.ok(Math.abs(n.z - m.z - 6) < 1e-8);
    if (m.x !== null) {
      assert.ok(Math.abs(n.x - m.x + 90) < 1e-8);
      assert.ok(Math.abs(n.y - m.y + 50) < 1e-8);
    }
  });
});
test("reject unsafe settings, collapsed hole, stock escape, and insufficient clearance", () => {
  for (const s of [
    { safe: 3 },
    { step: 4 },
    { tabCount: 0 },
    { tabWidth: 2 },
    { rpm: 11000 },
    { width: 150 },
    { feed: NaN },
    { through: -1 },
  ])
    assert.throws(() => plan(sample(), { ...defaults, ...s }));
  assert.throws(
    () => plan(validateLoops([rect(), circle(40, 40, 1)]), defaults),
    /fit/,
  );
  assert.throws(
    () =>
      plan(validateLoops([rect(0, 0, 60, 60), rect(62, 0, 60, 60)]), defaults),
    /clearance/,
  );
});
test("reject open, crossed, touching, nested, and unreachable sharp inside corners", () => {
  assert.throws(
    () =>
      validateLoops([
        [
          { x: 0, y: 0 },
          { x: 20, y: 20 },
          { x: 0, y: 20 },
          { x: 20, y: 0 },
        ],
      ]),
    /intersect/,
  );
  assert.throws(() => validateLoops([rect(), rect(150, 0)]), /touch/);
  assert.throws(
    () => validateLoops([rect(), rect(20, 20, 50, 50), rect(30, 30, 10, 10)]),
    /islands/,
  );
  assert.throws(
    () => plan(validateLoops([rect(), rect(30, 20, 40, 40)]), defaults),
    /corner/,
  );
});
const dxf = (entities, units = 4) =>
  `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n${units}\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
test("DXF circle, explicit inch units, unknown units, unsupported entity, open line", () => {
  const c = "0\nCIRCLE\n10\n0\n20\n0\n30\n0\n40\n2\n";
  assert.equal(parseDXF(dxf(c))[0].hole, false);
  assert.ok(Math.abs(parseDXF(dxf(c, 1))[0].points[0].x - 50.8) < 0.001);
  assert.throws(() => parseDXF(dxf(c, 0)), /units/);
  assert.throws(
    () => parseDXF(dxf("0\nTEXT\n1\nhello\n10\n0\n20\n0\n")),
    /Unsupported/,
  );
  assert.throws(
    () => parseDXF(dxf("0\nLINE\n10\n0\n20\n0\n11\n10\n21\n0\n")),
    /Open/,
  );
});
test("DXF joins unordered line entities into a closed contour", () => {
  const lines = [
    [0, 0, 50, 0],
    [50, 30, 0, 30],
    [50, 0, 50, 30],
    [0, 30, 0, 0],
  ]
    .map(([x, y, a, b]) => `0\nLINE\n10\n${x}\n20\n${y}\n11\n${a}\n21\n${b}\n`)
    .join("");
  assert.equal(parseDXF(dxf(lines))[0].points.length, 4);
});

test("small holes are cut without a loose core; larger untabbable slugs are blocked", () => {
  const j = plan(validateLoops([rect(), circle(40, 40, 2.5)]), defaults);
  assert.equal(j.tabs.filter((t) => t.contour === 0).length, 0);
  assert.equal(j.tabs.length, defaults.tabCount);
  assert.throws(
    () => plan(validateLoops([rect(), circle(40, 40, 5)]), defaults),
    /tabs/,
  );
});
test("raw preflight rejects entities silently skipped by the parser and tilted polylines", () => {
  assert.throws(() => parseDXF(dxf("0\nHATCH\n10\n0\n20\n0\n")), /Unsupported/);
  const tilted =
    "0\nLWPOLYLINE\n90\n4\n70\n1\n10\n0\n20\n0\n10\n20\n20\n0\n10\n20\n20\n20\n10\n0\n20\n20\n210\n0\n220\n0\n230\n-1\n";
  assert.throws(() => parseDXF(dxf(tilted)), /Non-XY/);
});
test("closed bulged polyline forms a circle; arcs join into a closed contour", () => {
  const bulge =
    "0\nLWPOLYLINE\n90\n2\n70\n1\n10\n-20\n20\n0\n42\n1\n10\n20\n20\n0\n42\n1\n";
  const p = parseDXF(dxf(bulge))[0].points;
  assert.ok(p.length > 100);
  p.forEach((v) => assert.ok(Math.abs(Math.hypot(v.x, v.y) - 20) < 0.001));
  const arcs = [0, 180]
    .map((a) => `0\nARC\n10\n0\n20\n0\n40\n20\n50\n${a}\n51\n${a + 180}\n`)
    .join("");
  assert.equal(parseDXF(dxf(arcs)).length, 1);
});
