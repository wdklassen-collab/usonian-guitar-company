//! Exact-scale cutting outlines, not screen pixels. Browser retains annotations/tiling.
use crate::{
    side::{Parameters, Sample},
    Fret,
};
use serde::Serialize;
fn path(points: &[[f64; 2]]) -> String {
    points
        .iter()
        .enumerate()
        .map(|(i, p)| format!("{}{:.3} {:.3}", if i == 0 { "M" } else { "L" }, p[0], p[1]))
        .collect::<Vec<_>>()
        .join(" ")
}
fn svg(x: f64, y: f64, w: f64, h: f64, body: &str) -> String {
    format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" viewBox="{x} {y} {w} {h}"><g fill="none" stroke="black" stroke-width="0.2">{body}</g></svg>"#
    )
}
#[derive(Serialize)]
pub struct SideSvg {
    pub top: String,
    pub side: String,
}
pub fn side(p: &Parameters, samples: &[Sample], top_samples: &[Sample], length: f64) -> SideSvg {
    let mut top = top_samples
        .iter()
        .map(|s| [s.x, -s.w / 2.0])
        .collect::<Vec<_>>();
    top.extend(top_samples.iter().rev().map(|s| [s.x, s.w / 2.0]));
    let width = top_samples.iter().map(|s| s.w).fold(0.0, f64::max);
    let first = &samples[0];
    let last = samples.last().unwrap();
    let mut side = vec![
        [-p.neck_extension, 0.0],
        [length + p.tail_extension, 0.0],
        [length + p.tail_extension, last.d],
        [length, last.d],
    ];
    side.extend(samples.iter().rev().map(|s| [s.s, s.d]));
    side.push([-p.neck_extension, first.d]);
    let depth = samples.iter().map(|s| s.d).fold(0.0, f64::max);
    SideSvg {
        top: svg(
            -10.0,
            -width / 2.0 - 10.0,
            p.body_length + 20.0,
            width + 20.0,
            &format!(r#"<path d="{} Z"/>"#, path(&top)),
        ),
        side: svg(
            -p.neck_extension - 10.0,
            -10.0,
            length + p.neck_extension + p.tail_extension + 20.0,
            depth + 20.0,
            &format!(r#"<path d="{} Z"/>"#, path(&side)),
        ),
    }
}
pub fn fretboard(length: f64, nut: f64, end: f64, frets: &[Fret]) -> String {
    let outline = path(&[
        [0.0, -nut / 2.0],
        [length, -end / 2.0],
        [length, end / 2.0],
        [0.0, nut / 2.0],
    ]);
    let mut body = format!(r#"<path d="{outline} Z"/>"#);
    for f in frets {
        body.push_str(&format!(
            r#"<line data-fret="{}" x1="{}" x2="{}" y1="{}" y2="{}"/>"#,
            f.number,
            f.x,
            f.x,
            -f.width / 2.0,
            f.width / 2.0
        ));
    }
    let w = nut.max(end);
    svg(-10.0, -w / 2.0 - 10.0, length + 20.0, w + 20.0, &body)
}
