//! Planar peghead templates. Coordinates are millimeters, nut at (0,0), crown +Y.
use crate::{invalid, Result, API_VERSION};
use serde::{Deserialize, Serialize};
type Point = [f64; 2];
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CrownSegment {
    pub kind: String,
    pub x: f64,
    pub y: f64,
    pub c1x: f64,
    pub c1y: f64,
    pub c2x: f64,
    pub c2y: f64,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Slots {
    pub enabled: bool,
    pub width: f64,
    pub length: f64,
    pub start: f64,
    pub spacing: f64,
    pub splay: f64,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Tuners {
    pub layout: String,
    pub diameter: f64,
    pub first: f64,
    pub pitch: f64,
    pub inset: f64,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HeadstockRequest {
    pub length: f64,
    pub nut_width: f64,
    pub shoulder_width: f64,
    pub shoulder_height: f64,
    pub crown_width: f64,
    pub crown_height: f64,
    pub left_bulge: f64,
    pub right_bulge: f64,
    pub transition: f64,
    pub symmetric: bool,
    pub minimum_web: f64,
    pub crown: Vec<CrownSegment>,
    pub slots: Slots,
    pub tuners: Tuners,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Headstock {
    pub api_version: &'static str,
    pub engine: &'static str,
    pub units: &'static str,
    pub outline: Vec<Point>,
    pub slot_outlines: Vec<Vec<Point>>,
    pub holes: Vec<Point>,
    pub tuner_axes: Vec<[f64; 3]>,
    pub bounds: [f64; 4],
    pub svg: String,
    pub cutting_svg: String,
    pub warnings: Vec<String>,
}
fn bounded(v: f64, lo: f64, hi: f64) -> bool {
    v.is_finite() && (lo..=hi).contains(&v)
}
fn dist(a: Point, b: Point) -> f64 {
    (a[0] - b[0]).hypot(a[1] - b[1])
}
fn distance(p: Point, a: Point, b: Point) -> f64 {
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    let d = dx * dx + dy * dy;
    let t = if d < 1e-16 {
        0.0
    } else {
        ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d
    }
    .clamp(0.0, 1.0);
    dist(p, [a[0] + t * dx, a[1] + t * dy])
}
fn inside(p: Point, poly: &[Point]) -> bool {
    let mut yes = false;
    for i in 0..poly.len() {
        let a = poly[i];
        let b = poly[(i + 1) % poly.len()];
        if (a[1] > p[1]) != (b[1] > p[1])
            && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]
        {
            yes = !yes;
        }
    }
    yes
}
fn edge_distance(p: Point, poly: &[Point]) -> f64 {
    (0..poly.len())
        .map(|i| distance(p, poly[i], poly[(i + 1) % poly.len()]))
        .fold(f64::INFINITY, f64::min)
}
fn cross(a: Point, b: Point, c: Point) -> f64 {
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}
fn intersects(a: Point, b: Point, c: Point, d: Point) -> bool {
    let e = 1e-8;
    let x = cross(a, b, c);
    let y = cross(a, b, d);
    let z = cross(c, d, a);
    let w = cross(c, d, b);
    (x * y < -e && z * w < -e)
        || (x.abs() < e && distance(c, a, b) < e)
        || (y.abs() < e && distance(d, a, b) < e)
        || (z.abs() < e && distance(a, c, d) < e)
        || (w.abs() < e && distance(b, c, d) < e)
}
struct Path {
    d: String,
    points: Vec<Point>,
}
impl Path {
    fn new(p: Point) -> Self {
        Self {
            d: format!("M{:.4} {:.4}", p[0], -p[1]),
            points: vec![p],
        }
    }
    fn line(&mut self, p: Point) {
        self.d += &format!(" L{:.4} {:.4}", p[0], -p[1]);
        if dist(*self.points.last().unwrap(), p) > 1e-8 {
            self.points.push(p);
        }
    }
    fn curve(&mut self, a: Point, b: Point, p: Point) {
        let start = *self.points.last().unwrap();
        self.d += &format!(
            " C{:.4} {:.4} {:.4} {:.4} {:.4} {:.4}",
            a[0], -a[1], b[0], -b[1], p[0], -p[1]
        );
        for i in 1..=48 {
            let t = i as f64 / 48.0;
            let u = 1.0 - t;
            let q = [
                u * u * u * start[0]
                    + 3.0 * u * u * t * a[0]
                    + 3.0 * u * t * t * b[0]
                    + t * t * t * p[0],
                u * u * u * start[1]
                    + 3.0 * u * u * t * a[1]
                    + 3.0 * u * t * t * b[1]
                    + t * t * t * p[1],
            ];
            if dist(*self.points.last().unwrap(), q) > 1e-8 {
                self.points.push(q);
            }
        }
    }
}
fn capsule(s: &Slots, sign: f64) -> Vec<Point> {
    let r = s.width / 2.0;
    let angle = -sign * s.splay.to_radians();
    let cy = s.start + s.length / 2.0;
    let mut pts = Vec::new();
    for (center, start) in [
        (s.start + s.length - r, 0.0),
        (s.start + r, std::f64::consts::PI),
    ] {
        for i in 0..=32 {
            let t = start + std::f64::consts::PI * i as f64 / 32.0;
            let x = r * t.cos();
            let y = center + r * t.sin() - cy;
            pts.push([
                sign * s.spacing / 2.0 + x * angle.cos() - y * angle.sin(),
                cy + x * angle.sin() + y * angle.cos(),
            ]);
        }
    }
    pts
}
fn polygon_path(poly: &[Point]) -> String {
    let mut p = Path::new(poly[0]);
    for pt in &poly[1..] {
        p.line(*pt);
    }
    p.d + " Z"
}
fn side_at(poly: &[Point], y: f64) -> Result<(f64, f64)> {
    let mut xs = Vec::new();
    for i in 0..poly.len() {
        let a = poly[i];
        let b = poly[(i + 1) % poly.len()];
        if (a[1] > y) != (b[1] > y) {
            xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
        }
    }
    xs.sort_by(f64::total_cmp);
    if xs.len() != 2 {
        return Err(invalid(
            "Tuner stations must intersect two outer edges below the crown.",
        ));
    }
    Ok((xs[0], xs[1]))
}
pub fn headstock(p: HeadstockRequest) -> Result<Headstock> {
    if !bounded(p.length, 80.0, 300.0)
        || !bounded(p.nut_width, 25.0, 90.0)
        || !bounded(p.shoulder_width, 35.0, 150.0)
        || !bounded(p.crown_width, 35.0, 150.0)
        || !bounded(p.shoulder_height, 5.0, p.length * 0.45)
        || !bounded(p.crown_height, 0.0, p.length * 0.4)
        || !bounded(p.left_bulge, -25.0, 25.0)
        || !bounded(p.right_bulge, -25.0, 25.0)
        || !bounded(p.transition, 0.1, 0.9)
        || !bounded(p.minimum_web, 1.0, 12.0)
    {
        return Err(invalid("Check overall dimensions: length 80–300 mm, nut 25–90 mm, widths 35–150 mm, side bulge ±25 mm, and minimum web 1–12 mm."));
    }
    let crown_base = p.length - p.crown_height;
    if crown_base <= p.shoulder_height + 10.0 {
        return Err(invalid("Leave at least 10 mm between shoulder and crown."));
    }
    if p.crown.is_empty() || p.crown.len() > 12 {
        return Err(invalid("Use 1–12 crown segments."));
    }
    let mut previous = -1.0;
    for s in &p.crown {
        if ![s.x, s.y, s.c1x, s.c1y, s.c2x, s.c2y]
            .iter()
            .all(|v| v.is_finite())
            || !bounded(s.x, previous, if p.symmetric { 0.0 } else { 1.0 })
            || !bounded(s.y, -0.5, 1.5)
            || !['l', 'c'].contains(&s.kind.chars().next().unwrap_or(' '))
            || !matches!(s.kind.as_str(), "line" | "curve")
        {
            return Err(invalid("Crown endpoints must progress left to right. Choose line or curve; crown rise is −50% to 150%."));
        }
        if s.kind == "curve"
            && (!bounded(s.c1x, previous, s.x)
                || !bounded(s.c2x, previous, s.x)
                || !bounded(s.c1y, -0.5, 1.5)
                || !bounded(s.c2y, -0.5, 1.5))
        {
            return Err(invalid("Curve handles must lie between their segment's left and right X positions, with rise −50% to 150%."));
        }
        previous = s.x;
    }
    let last = p.crown.last().unwrap();
    if (last.x - if p.symmetric { 0.0 } else { 1.0 }).abs() > 1e-6
        || (!p.symmetric && last.y.abs() > 1e-6)
    {
        return Err(invalid(
            "A symmetric crown must end at X=0%; an asymmetric crown must end at X=100%, rise=0%.",
        ));
    }
    let left = -p.shoulder_width / 2.0;
    let right = p.shoulder_width / 2.0;
    let span = crown_base - p.shoulder_height;
    let mut outline = Path::new([-p.nut_width / 2.0, 0.0]);
    outline.curve(
        [-p.nut_width / 2.0, p.shoulder_height * p.transition],
        [left, p.shoulder_height * (1.0 - p.transition)],
        [left, p.shoulder_height],
    );
    outline.curve(
        [left - p.left_bulge, p.shoulder_height + span / 3.0],
        [-p.crown_width / 2.0 - p.left_bulge, crown_base - span / 3.0],
        [-p.crown_width / 2.0, crown_base],
    );
    let map = |x: f64, y: f64| [x * p.crown_width / 2.0, crown_base + y * p.crown_height];
    let mut starts = Vec::new();
    let mut previous = [-1.0, 0.0];
    for s in &p.crown {
        starts.push(previous);
        if s.kind == "line" {
            outline.line(map(s.x, s.y));
        } else {
            outline.curve(map(s.c1x, s.c1y), map(s.c2x, s.c2y), map(s.x, s.y));
        }
        previous = [s.x, s.y];
    }
    if p.symmetric {
        for (s, start) in p.crown.iter().zip(starts).rev() {
            if s.kind == "line" {
                outline.line(map(-start[0], start[1]));
            } else {
                outline.curve(
                    map(-s.c2x, s.c2y),
                    map(-s.c1x, s.c1y),
                    map(-start[0], start[1]),
                );
            }
        }
    }
    let bulge = if p.symmetric {
        p.left_bulge
    } else {
        p.right_bulge
    };
    outline.curve(
        [p.crown_width / 2.0 + bulge, crown_base - span / 3.0],
        [right + bulge, p.shoulder_height + span / 3.0],
        [right, p.shoulder_height],
    );
    outline.curve(
        [right, p.shoulder_height * (1.0 - p.transition)],
        [p.nut_width / 2.0, p.shoulder_height * p.transition],
        [p.nut_width / 2.0, 0.0],
    );
    let poly = &outline.points;
    let n = poly.len();
    for i in 0..n {
        for j in i + 2..n {
            if i == 0 && j == n - 1 {
                continue;
            }
            if intersects(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n]) {
                return Err(invalid(
                    "The outer outline crosses or touches itself. Adjust the crown or side curves.",
                ));
            }
        }
    }
    let mut slot_outlines = Vec::new();
    if p.slots.enabled {
        let s = &p.slots;
        if !bounded(s.width, 5.0, 35.0)
            || !bounded(s.length, s.width, p.length)
            || !bounded(s.start, 5.0, p.length)
            || !bounded(s.spacing, s.width + p.minimum_web, 120.0)
            || !bounded(s.splay, -15.0, 15.0)
        {
            return Err(invalid(
                "Check slot width, length, start, separation, and splay (±15°).",
            ));
        }
        for sign in [-1.0, 1.0] {
            let pts = capsule(s, sign);
            if pts
                .iter()
                .any(|&q| !inside(q, poly) || edge_distance(q, poly) < p.minimum_web + 0.02)
            {
                return Err(invalid("Slots leave less than the minimum web at the outside edge. Narrow, shorten, or reposition them."));
            }
            slot_outlines.push(pts);
        }
        if slot_outlines[0].iter().any(|&q| {
            inside(q, &slot_outlines[1])
                || edge_distance(q, &slot_outlines[1]) < p.minimum_web + 0.02
        }) {
            return Err(invalid("Slots overlap or leave too little center web. Increase slot separation or reduce splay."));
        }
    }
    let t = &p.tuners;
    let mut holes = Vec::new();
    let mut tuner_axes = Vec::new();
    if !matches!(
        t.layout.as_str(),
        "none" | "threePerSide" | "sixLeft" | "sixRight"
    ) || !bounded(t.diameter, 3.0, 15.0)
        || !bounded(t.first, 5.0, p.length)
        || !bounded(t.pitch, 10.0, 60.0)
        || !bounded(t.inset, 3.0, 30.0)
    {
        return Err(invalid("Check tuner layout, bore diameter (3–15 mm), first station, pitch (10–60 mm), and edge inset."));
    }
    if p.slots.enabled && !matches!(t.layout.as_str(), "none" | "threePerSide") {
        return Err(invalid(
            "Slotted heads use three tuners per side, or no tuner marks.",
        ));
    }
    if t.layout != "none" {
        let count = if t.layout == "threePerSide" { 3 } else { 6 };
        let signs: Vec<f64> = match t.layout.as_str() {
            "sixLeft" => vec![-1.0],
            "sixRight" => vec![1.0],
            _ => vec![-1.0, 1.0],
        };
        for sign in signs {
            for i in 0..count {
                let y = t.first + i as f64 * t.pitch;
                if y >= crown_base {
                    return Err(invalid(
                        "Keep tuner centers below the crown base; reduce first station or pitch.",
                    ));
                }
                let (l, r) = side_at(poly, y)?;
                if p.slots.enabled {
                    let idx = if sign < 0.0 { 0 } else { 1 };
                    let (a, b) = side_at(&slot_outlines[idx], y)?;
                    if y - t.diameter / 2.0 < p.slots.start + p.minimum_web
                        || y + t.diameter / 2.0 > p.slots.start + p.slots.length - p.minimum_web
                    {
                        return Err(invalid("Side-drill stations are too close to a slot end."));
                    }
                    tuner_axes.push([
                        if sign < 0.0 { l } else { r },
                        if sign < 0.0 { a } else { b },
                        y,
                    ]);
                } else {
                    let q = [if sign < 0.0 { l + t.inset } else { r - t.inset }, y];
                    if !inside(q, poly)
                        || edge_distance(q, poly) < t.diameter / 2.0 + p.minimum_web + 0.02
                    {
                        return Err(invalid("A tuner bore leaves less than the minimum edge web. Increase inset or change the headstock shape."));
                    }
                    holes.push(q);
                }
            }
        }
        for (i, &a) in holes.iter().enumerate() {
            for &b in &holes[i + 1..] {
                if dist(a, b) < t.diameter + p.minimum_web {
                    return Err(invalid(
                        "Tuner bores overlap or leave too little material between holes.",
                    ));
                }
            }
        }
    }
    let min_x = poly.iter().map(|p| p[0]).fold(f64::INFINITY, f64::min);
    let max_x = poly.iter().map(|p| p[0]).fold(f64::NEG_INFINITY, f64::max);
    let max_y = poly.iter().map(|p| p[1]).fold(0.0, f64::max);
    let bounds = [
        min_x - 10.0,
        -max_y - 10.0,
        max_x - min_x + 20.0,
        max_y + 20.0,
    ];
    let mut cut = format!(
        r#"<g id="cutting" fill="none" stroke="rgb(36,30,24)" stroke-width="0.2"><path d="{} Z"/>"#,
        outline.d
    );
    for slot in &slot_outlines {
        cut += &format!(r#"<path d="{}"/>"#, polygon_path(slot));
    }
    for h in &holes {
        cut += &format!(
            r#"<circle cx="{:.4}" cy="{:.4}" r="{:.4}"/>"#,
            h[0],
            -h[1],
            t.diameter / 2.0
        );
    }
    cut += "</g>";
    let mut guides = format!(
        r#"<g id="guides" fill="none" stroke="rgb(155,90,54)" stroke-width="0.15" stroke-dasharray="2 1"><path d="M0 5 V{} M{} 0 H{}"/></g>"#,
        -max_y - 4.0,
        -p.nut_width / 2.0 - 4.0,
        p.nut_width / 2.0 + 4.0
    );
    if !tuner_axes.is_empty() {
        guides += r#"<g id="side-drill-axes" fill="none" stroke="rgb(53,107,137)" stroke-width="0.2" stroke-dasharray="1 1">"#;
        for a in &tuner_axes {
            guides += &format!(r#"<path d="M{:.4} {:.4} H{:.4}"/>"#, a[0], -a[2], a[1]);
        }
        guides += "</g>";
    }
    let wrap = |body: &str| {
        format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" width="{:.4}mm" height="{:.4}mm" viewBox="{:.4} {:.4} {:.4} {:.4}">{body}</svg>"#,
            bounds[2], bounds[3], bounds[0], bounds[1], bounds[2], bounds[3]
        )
    };
    let mut warnings=vec!["Planar outline only: confirm headstock angle, thickness, hardware fit, and string paths before machining. Minimum-web checks use sampled curves with a small conservative margin.".into()];
    if p.slots.enabled && t.layout != "none" {
        warnings.push("Blue dashed marks are SIDE-DRILL AXES, not face-drilled holes. Verify tuner plate pitch, roller length, headstock thickness, and string ramps separately.".into());
    }
    Ok(Headstock {
        api_version: API_VERSION,
        engine: "rust-wasm",
        units: "mm",
        outline: outline.points,
        slot_outlines,
        holes,
        tuner_axes,
        bounds,
        svg: wrap(&(cut.clone() + &guides)),
        cutting_svg: wrap(&cut),
        warnings,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    fn sample() -> HeadstockRequest {
        HeadstockRequest {
            length: 180.0,
            nut_width: 44.45,
            shoulder_width: 62.0,
            shoulder_height: 28.0,
            crown_width: 70.0,
            crown_height: 18.0,
            left_bulge: 0.0,
            right_bulge: 0.0,
            transition: 0.55,
            symmetric: true,
            minimum_web: 3.0,
            crown: vec![CrownSegment {
                kind: "curve".into(),
                x: 0.0,
                y: 1.0,
                c1x: -0.65,
                c1y: 0.8,
                c2x: -0.25,
                c2y: 1.0,
            }],
            slots: Slots {
                enabled: true,
                width: 15.0,
                length: 105.0,
                start: 43.0,
                spacing: 38.0,
                splay: 0.0,
            },
            tuners: Tuners {
                layout: "threePerSide".into(),
                diameter: 6.0,
                first: 60.0,
                pitch: 35.0,
                inset: 10.0,
            },
        }
    }
    #[test]
    fn symmetric_slots_and_exact_scale() {
        let g = headstock(sample()).unwrap();
        assert_eq!(g.slot_outlines.len(), 2);
        assert_eq!(g.tuner_axes.len(), 6);
        assert!(g.holes.is_empty());
        assert!((g.bounds[3] - 200.0).abs() < 1e-8);
        assert!(g.cutting_svg.contains("mm\""));
        assert!(!g.cutting_svg.contains("side-drill-axes"));
        for a in &g.outline {
            assert!(g
                .outline
                .iter()
                .any(|b| (a[0] + b[0]).abs() < 1e-6 && (a[1] - b[1]).abs() < 1e-6));
        }
    }
    #[test]
    fn slot_clearance_and_unknown_controls() {
        let mut p = sample();
        p.slots.spacing = 68.0;
        assert!(headstock(p).is_err());
        let mut p = sample();
        p.crown[0].c1x = 0.9;
        assert!(headstock(p).is_err());
    }
    #[test]
    fn solid_holes_and_asymmetric_crown() {
        let mut p = sample();
        p.slots.enabled = false;
        p.tuners.diameter = 10.0;
        p.symmetric = false;
        p.crown.push(CrownSegment {
            kind: "line".into(),
            x: 1.0,
            y: 0.0,
            c1x: 0.0,
            c1y: 0.0,
            c2x: 1.0,
            c2y: 0.0,
        });
        let g = headstock(p).unwrap();
        assert_eq!(g.holes.len(), 6);
        assert!(g.tuner_axes.is_empty());
        assert!(g.svg.contains("<circle"));
    }
    #[test]
    fn malformed_and_crossing_crowns_rejected() {
        let mut p = sample();
        p.crown[0].x = -0.2;
        assert!(headstock(p).is_err());
        let mut p = sample();
        p.left_bulge = -25.0;
        p.shoulder_width = 35.0;
        p.crown_width = 35.0;
        p.slots.enabled = false;
        p.tuners.layout = "none".into();
        assert!(headstock(p).is_err());
    }
}
