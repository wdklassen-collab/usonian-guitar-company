use wasm_bindgen::prelude::*;

// Transport-neutral JSON boundary; neither geometry nor validation knows HTTP.
#[wasm_bindgen]
pub fn generate(tool: &str, input: &str) -> String {
    usonian_geometry::generate(tool, input)
}
