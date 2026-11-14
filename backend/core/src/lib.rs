//! Millimeter geometry independent of HTTP, JavaScript, and Cloudflare.
mod side;
mod svg;
use serde::{Deserialize, Serialize};
pub use side::{side, Parameters, SideRequest};

pub const API_VERSION: &str = "v1";
#[derive(Debug, Serialize)]
pub struct GeometryError {
    pub code: &'static str,
    pub message: String,
}
pub type Result<T> = std::result::Result<T, GeometryError>;
pub fn invalid(message: impl Into<String>) -> GeometryError {
    GeometryError {
        code: "invalid_dimensions",
        message: message.into(),
    }
}
pub fn decode<T: serde::de::DeserializeOwned>(input: &str) -> Result<T> {
    serde_json::from_str(input).map_err(|e| GeometryError {
        code: "invalid_request",
        message: e.to_string(),
    })
}

// Standard 12-tone equal temperament, same convention as the existing generator.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FretboardRequest {
    pub scale_length: f64,
    pub fret_count: u32,
    pub nut_width: f64,
    pub end_width: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Fret {
    pub number: u32,
    pub x: f64,
    pub width: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Fretboard {
    pub api_version: &'static str,
    pub units: &'static str,
    pub length: f64,
    pub frets: Vec<Fret>,
    pub svg: String,
}
pub fn fretboard(p: FretboardRequest) -> Result<Fretboard> {
    if ![p.scale_length, p.nut_width, p.end_width]
        .iter()
        .all(|x| x.is_finite())
        || !(100.0..=1500.0).contains(&p.scale_length)
        || !(1..=36).contains(&p.fret_count)
        || !(10.0..=150.0).contains(&p.nut_width)
        || !(10.0..=150.0).contains(&p.end_width)
    {
        return Err(invalid(
            "Scale must be 100–1500 mm, frets 1–36, and widths 10–150 mm.",
        ));
    }
    let position = |n: u32| p.scale_length * (1.0 - 2.0_f64.powf(-(n as f64) / 12.0));
    let length = position(p.fret_count);
    let frets = (1..=p.fret_count)
        .map(|n| {
            let x = position(n);
            Fret {
                number: n,
                x,
                width: p.nut_width + (p.end_width - p.nut_width) * x / length,
            }
        })
        .collect::<Vec<_>>();
    let svg = svg::fretboard(length, p.nut_width, p.end_width, &frets);
    Ok(Fretboard {
        api_version: API_VERSION,
        units: "mm",
        length,
        frets,
        svg,
    })
}

/// Every hosting adapter receives exactly the same success/error JSON envelope.
pub fn generate(tool: &str, input: &str) -> String {
    let result = match tool {
        "side-top" => decode::<SideRequest>(input)
            .and_then(side)
            .and_then(|v| serde_json::to_value(v).map_err(|_| invalid("Serialization failed"))),
        "fretboard" => decode::<FretboardRequest>(input)
            .and_then(fretboard)
            .and_then(|v| serde_json::to_value(v).map_err(|_| invalid("Serialization failed"))),
        _ => Err(GeometryError {
            code: "unknown_tool",
            message: "Unknown generator.".into(),
        }),
    };
    match result {
        Ok(data) => serde_json::json!({"ok":true,"data":data}).to_string(),
        Err(error) => {
            serde_json::json!({"ok":false,"apiVersion":API_VERSION,"error":error}).to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn equal_temperament_octave() {
        let p = FretboardRequest {
            scale_length: 643.636,
            fret_count: 20,
            nut_width: 44.45,
            end_width: 58.0,
        };
        let g = fretboard(p).unwrap();
        assert!((g.frets[11].x - 321.818).abs() < 1e-10);
        assert!(g
            .frets
            .windows(2)
            .all(|f| f[1].x > f[0].x && f[1].width > f[0].width));
        assert!(g.svg.contains("mm\""));
    }
    #[test]
    fn errors_are_consistent() {
        for (tool, input, code) in [
            ("side-top", "{", "invalid_request"),
            ("side-top", r#"{"preset":"wrong"}"#, "invalid_request"),
            (
                "fretboard",
                r#"{"scaleLength":0,"fretCount":20,"nutWidth":44,"endWidth":58}"#,
                "invalid_dimensions",
            ),
        ] {
            let out: serde_json::Value = serde_json::from_str(&generate(tool, input)).unwrap();
            assert_eq!(out["ok"], false);
            assert_eq!(out["error"]["code"], code);
        }
    }
}
