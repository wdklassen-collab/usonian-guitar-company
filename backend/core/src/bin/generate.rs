use std::io::{self, BufRead};
fn main() {
    let tool = std::env::args().nth(1).unwrap_or_else(|| "side-top".into());
    for line in io::stdin().lock().lines() {
        println!(
            "{}",
            usonian_geometry::generate(&tool, &line.expect("stdin"))
        );
    }
}
