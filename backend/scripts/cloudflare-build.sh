#!/usr/bin/env bash
set -euo pipefail
# Runs only in the dedicated API Worker build, never in the production website.
if ! command -v rustup >/dev/null; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain 1.91.1
fi
source "$HOME/.cargo/env"
rustup toolchain install 1.91.1 --profile minimal
rustup target add wasm32-unknown-unknown --toolchain 1.91.1
if ! command -v wasm-bindgen >/dev/null || [[ "$(wasm-bindgen --version)" != 'wasm-bindgen 0.2.105' ]]; then
  cargo +1.91.1 install wasm-bindgen-cli --version 0.2.105 --locked
fi
bash backend/scripts/build-wasm.sh
