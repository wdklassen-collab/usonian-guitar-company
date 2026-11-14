use crate::{decode, invalid, Result, API_VERSION};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Clone, Copy, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Preset {
    Om14,
    Dread14,
    Plan00,
}
#[derive(Clone, Copy, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Profile {
    Calculated,
    Trace00,
}
fn default_preset() -> Preset {
    Preset::Om14
}
fn default_profile() -> Profile {
    Profile::Calculated
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SideRequest {
    #[serde(default = "default_preset")]
    pub preset: Preset,
    #[serde(default = "default_profile")]
    pub profile_source: Profile,
    #[serde(default)]
    pub parameters: serde_json::Map<String, serde_json::Value>,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Parameters {
    pub body_length: f64,
    pub back_radius: f64,
    pub neck_depth: f64,
    pub tail_depth: f64,
    pub neck_extension: f64,
    pub tail_extension: f64,
    pub neck_block_width: f64,
    pub tail_block_width: f64,
    pub upper_bout_width: f64,
    pub upper_bout_pos: f64,
    pub waist_width: f64,
    pub waist_pos: f64,
    pub lower_bout_width: f64,
    pub lower_bout_pos: f64,
    pub top_thickness: f64,
    pub back_thickness: f64,
    pub trim_allowance: f64,
}
#[derive(Deserialize)]
struct Reference {
    samples: Vec<[f64; 2]>,
    stations: Vec<[f64; 2]>,
    defaults: Parameters,
}
#[derive(Deserialize)]
struct References {
    om14: Reference,
    dread14: Reference,
    plan00: Reference,
    trace00: Vec<[f64; 2]>,
}
fn references() -> &'static References {
    static REFERENCES: OnceLock<References> = OnceLock::new();
    REFERENCES.get_or_init(|| {
        serde_json::from_str(include_str!("../data/measured.json"))
            .expect("checked-in measured reference")
    })
}
#[derive(Serialize, Clone)]
pub struct Sample {
    pub x: f64,
    pub w: f64,
    pub d: f64,
    pub s: f64,
}
#[derive(Serialize)]
pub struct Sphere {
    pub cx: f64,
    pub cz: f64,
    pub radius: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SideGeometry {
    pub api_version: &'static str,
    pub units: &'static str,
    pub samples: Vec<Sample>,
    pub top_samples: Vec<Sample>,
    pub side_length: f64,
    pub traced: bool,
    pub sphere: Sphere,
    pub parameters: Parameters,
    pub svg: crate::svg::SideSvg,
}
fn segment(x: f64, xs: &[f64]) -> usize {
    let mut i = 0;
    while i < 3 && x > xs[i + 1] {
        i += 1;
    }
    i
}
fn interpolate(points: &[[f64; 2]], x: f64) -> f64 {
    if x <= points[0][0] {
        return points[0][1];
    }
    let mut lo = 0;
    let mut hi = points.len() - 1;
    while hi - lo > 1 {
        let mid = (lo + hi) / 2;
        if points[mid][0] <= x {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    let a = points[lo];
    let b = points[hi];
    a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])
}
fn validate(p: &Parameters) -> Result<()> {
    let all = [
        p.body_length,
        p.back_radius,
        p.neck_depth,
        p.tail_depth,
        p.neck_extension,
        p.tail_extension,
        p.neck_block_width,
        p.tail_block_width,
        p.upper_bout_width,
        p.waist_width,
        p.lower_bout_width,
        p.upper_bout_pos,
        p.waist_pos,
        p.lower_bout_pos,
        p.top_thickness,
        p.back_thickness,
        p.trim_allowance,
    ];
    if !all.iter().all(|v| v.is_finite())
        || p.body_length <= 3.0
        || p.body_length > 2000.0
        || p.back_radius <= 0.0
        || p.back_radius > 1e9
        || p.neck_depth <= 0.0
        || p.tail_depth <= 0.0
        || p.neck_depth > 1000.0
        || p.tail_depth > 1000.0
        || [
            p.neck_extension,
            p.tail_extension,
            p.top_thickness,
            p.back_thickness,
            p.trim_allowance,
        ]
        .iter()
        .any(|v| *v < 0.0 || *v > 1000.0)
        || [
            p.neck_block_width,
            p.tail_block_width,
            p.upper_bout_width,
            p.waist_width,
            p.lower_bout_width,
        ]
        .iter()
        .any(|v| *v < 0.0 || *v > 2000.0)
        || !(0.0 < p.upper_bout_pos
            && p.upper_bout_pos < p.waist_pos
            && p.waist_pos < p.lower_bout_pos
            && p.lower_bout_pos < p.body_length)
    {
        return Err(invalid("Enter finite positive dimensions and radius, ordered bout positions, and nonnegative thicknesses and allowances within supported limits."));
    }
    Ok(())
}

pub fn side(request: SideRequest) -> Result<SideGeometry> {
    let refs = references();
    let reference = match request.preset {
        Preset::Om14 => &refs.om14,
        Preset::Dread14 => &refs.dread14,
        Preset::Plan00 => &refs.plan00,
    };
    let mut values = serde_json::to_value(&reference.defaults).unwrap();
    for (k, v) in &request.parameters {
        if request.profile_source == Profile::Trace00
            && ![
                "neckExtension",
                "tailExtension",
                "topThickness",
                "backThickness",
                "trimAllowance",
            ]
            .contains(&k.as_str())
            && values.get(k) != Some(v)
        {
            return Err(invalid("Literal 00 trace uses fixed plan dimensions. Use calculated mode for custom geometry."));
        }
        values.as_object_mut().unwrap().insert(k.clone(), v.clone());
    }
    let p: Parameters = decode(&values.to_string())?;
    validate(&p)?;
    if request.profile_source == Profile::Trace00 && request.preset != Preset::Plan00 {
        return Err(invalid(
            "Literal trace is available only for the 00-14 plan.",
        ));
    }
    let source_x = reference.stations.iter().map(|s| s[0]).collect::<Vec<_>>();
    let target_x = if request.preset == Preset::Plan00 {
        vec![
            0.0,
            p.upper_bout_pos,
            p.waist_pos,
            p.lower_bout_pos,
            p.body_length,
        ]
    } else {
        let x1 = p.upper_bout_pos.min(p.body_length - 3.0).max(1.0);
        let x2 = p.waist_pos.min(p.body_length - 2.0).max(x1 + 1.0);
        let x3 = p.lower_bout_pos.min(p.body_length - 1.0).max(x2 + 1.0);
        vec![0.0, x1, x2, x3, p.body_length]
    };
    let target_w = [
        p.neck_block_width,
        p.upper_bout_width,
        p.waist_width,
        p.lower_bout_width,
        p.tail_block_width,
    ];
    let width_at = |x: f64| {
        let x = x.clamp(0.0, p.body_length);
        let i = segment(x, &target_x);
        let t = (x - target_x[i]) / (target_x[i + 1] - target_x[i]);
        let rx = source_x[i] + t * (source_x[i + 1] - source_x[i]);
        let u = (interpolate(&reference.samples, rx) - reference.stations[i][1])
            / (reference.stations[i + 1][1] - reference.stations[i][1]);
        (target_w[i] + u * (target_w[i + 1] - target_w[i])).max(0.0)
    };
    // Retain the measured sources' arc-spaced points, including the half neck face.
    let mut points = Vec::new();
    if request.preset != Preset::Plan00 {
        points.push([0.0, 0.0]);
    }
    for &[x, y] in &reference.samples {
        let i = segment(x, &source_x);
        let t = (x - source_x[i]) / (source_x[i + 1] - source_x[i]);
        let target = target_x[i] + t * (target_x[i + 1] - target_x[i]);
        let width = if request.preset == Preset::Plan00 {
            let u = (y - reference.stations[i][1])
                / (reference.stations[i + 1][1] - reference.stations[i][1]);
            target_w[i] + u * (target_w[i + 1] - target_w[i])
        } else {
            width_at(target)
        };
        points.push([target, width]);
    }
    // For 00 the original width function interpolates the transformed polyline.
    let width = |x: f64| {
        if request.preset == Preset::Plan00 {
            interpolate(&points, x)
        } else {
            width_at(x)
        }
    };
    let l = p.body_length;
    let r = p.back_radius;
    let yn = width(0.0) / 2.0;
    let yt = width(l) / 2.0;
    let delta = p.tail_depth - p.neck_depth;
    let chord = l.hypot(delta);
    let a = (yt * yt - yn * yn + chord * chord) / (2.0 * chord);
    let h2 = r * r - yn * yn - a * a;
    if h2 <= 0.0 {
        return Err(invalid("Back radius is too small for these dimensions."));
    }
    let h = h2.sqrt();
    let cx = a * l / chord + h * delta / chord;
    let cz = p.neck_depth + a * delta / chord - h * l / chord;
    if cz >= p.neck_depth.min(p.tail_depth) {
        return Err(invalid("Depth taper is too steep for this back radius."));
    }
    let offset = p.top_thickness + p.back_thickness - p.trim_allowance;
    let depth = |x: f64| -> Result<f64> {
        let y = width(x) / 2.0;
        let radial = r * r - (x - cx) * (x - cx) - y * y;
        if radial <= 0.0 {
            return Err(invalid("Body outline extends beyond the back sphere."));
        }
        let d = cz + radial.sqrt() - offset;
        if d <= 0.0 || !d.is_finite() {
            return Err(invalid(
                "Plate thickness exceeds the calculated body depth.",
            ));
        }
        Ok(if x == 0.0 {
            p.neck_depth - offset
        } else if x == l {
            p.tail_depth - offset
        } else {
            d
        })
    };
    let mut samples = Vec::with_capacity(points.len());
    let mut length = 0.0;
    for (i, &[x, w]) in points.iter().enumerate() {
        if i > 0 {
            let prev = points[i - 1];
            length += (x - prev[0]).hypot((w - prev[1]) / 2.0);
        }
        samples.push(Sample {
            x,
            w,
            d: depth(x)?,
            s: length,
        });
    }
    let top_samples = samples.clone();
    let traced = request.profile_source == Profile::Trace00;
    if traced {
        let original_length = length;
        length = refs.trace00.last().unwrap()[0];
        samples.clear();
        let xs = top_samples.iter().map(|s| [s.s, s.x]).collect::<Vec<_>>();
        let ws = top_samples.iter().map(|s| [s.s, s.w]).collect::<Vec<_>>();
        for &[s, d] in &refs.trace00 {
            if d - offset <= 0.0 {
                return Err(invalid("Plate thickness exceeds the plan template depth."));
            }
            let original_s = s / length * original_length;
            samples.push(Sample {
                s,
                d: d - offset,
                x: interpolate(&xs, original_s),
                w: interpolate(&ws, original_s),
            });
        }
    }
    let svg = crate::svg::side(&p, &samples, &top_samples, length);
    Ok(SideGeometry {
        api_version: API_VERSION,
        units: "mm",
        samples,
        top_samples,
        side_length: length,
        traced,
        sphere: Sphere { cx, cz, radius: r },
        parameters: p,
        svg,
    })
}
