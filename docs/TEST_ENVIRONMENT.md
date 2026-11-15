# Isolated Rust test environment

Verified 2026-11-14 (America/Denver). Application code tested at e75b75f61d6d211e31eb94709dbc0b454f38d1e8.

| Environment | Worker | Git branch | Address |
| --- | --- | --- | --- |
| Production | usonian-guitar-company | main | https://usonianguitar.com |
| Rust test website | usonian-guitar-test | feature/rust-backend | https://test.usonianguitar.com |
| Test Rust API | usonian-luthier-api-preview | feature/rust-backend | https://usonian-luthier-api-preview.wdklassen.workers.dev |

No Rust changes were merged into main. Test Workers have no database or storage bindings. No paid plan was added.

## Build and deployment

Cloudflare's Git connection builds both test Workers from feature/rust-backend; their "Production" label refers only to each separate Worker's own active deployment.

Website build: `USONIAN_TEST_SITE=1 npm run build`.
Website deploy: `node scripts/deploy-test.mjs`.
The deploy script rejects artifacts without the dedicated test Worker name and test flag; it attaches only test.usonianguitar.com.
Test runtime variables: USONIAN_TEST_SITE=1 and RUST_API_URL=https://usonian-luthier-api-preview.wdklassen.workers.dev.
The TEST banner links directly to the Rust side/top mode and the basic Rust fretboard preview. It is hidden from printed templates.
Test page responses include X-Robots-Tag: noindex, nofollow, noarchive. This discourages indexing; it is not access protection.

API build: `bash backend/scripts/cloudflare-build.sh`.
API deploy: `bash -c 'source "$HOME/.cargo/env" && npx wrangler deploy --config backend/cloudflare/wrangler.jsonc'`.
The cargo environment must be sourced again because Cloudflare uses a fresh deployment shell.
The first API deploy failed on missing wasm-bindgen in that shell; the corrected retry succeeded.
API build watch paths: backend/core/**, backend/wasm/**, backend/cloudflare/**, backend/scripts/**, backend/Cargo.*, backend/rust-toolchain.toml, package.json, package-lock.json.
Ordinary frontend or documentation edits do not recompile the API.

## Verified live

- Website and API Cloudflare builds succeeded; GitHub geometry-and-website checks succeeded.
- Website /api/v1/health reports engine rust-wasm, API v1, millimeters, side-top and fretboard tools.
- Calculated side half-perimeters: OM-14 748.389209 mm; Dreadnought-14 771.092559 mm; 00-14 729.490947 mm, matching the regression references.
- Browser: all three presets, 15-foot default radius, 00 custom body length 510 mm (side length approximately 737.3 mm), Reset to 500 mm, and three-sheet portrait tiled print preview.
- Browser: 20-fret Rust fretboard with scale length 643.636 mm, nut width 44.45 mm, end width 58 mm; final fret at 440.903 mm, twelfth fret at 321.818 mm.
- Test homepage, side/top page and fretboard page show test banner and noindex headers.
- Production homepage remains separate, without test banner or noindex header; production /api/v1/health is absent.

## Review and promotion

PR #9 remains draft. Hosted and visual checks are now complete for this milestone; earlier "no hosted preview" notes in backend/VALIDATION.md describe the original overnight environment, and are superseded by this record.
Neck, headstock and bridge Rust modules are not implemented. The Rust fretboard is deliberately a basic second-tool preview, not a replacement for the full production fretboard/CNC tool.
Production promotion requires separate user authorization. Never repoint the production hostname or change the original production Worker's main-branch setting as part of test development.
