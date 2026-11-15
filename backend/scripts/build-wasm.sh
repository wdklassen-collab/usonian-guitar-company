#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/references.mjs --check
if [[ "$(wasm-bindgen --version)" != 'wasm-bindgen 0.2.105' ]]; then
  echo 'Install wasm-bindgen-cli 0.2.105 (must match Cargo.lock).' >&2
  exit 1
fi
cargo build --locked --release --target wasm32-unknown-unknown -p usonian-wasm
wasm-bindgen --target web --out-dir pkg --out-name usonian target/wasm32-unknown-unknown/release/usonian_wasm.wasm
