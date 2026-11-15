# Branch validation and handoff

## What is implemented

- Shared Rust core, native CLI, Wasm boundary and independent Cloudflare adapter.
- `/api/v1/health`, `/api/v1/side-top`, `/api/v1/fretboard` with one JSON/error contract.
- Existing side/top UI connected through an opt-in Rust selector; rendering,
  annotated exports and portrait print tiles continue to use existing code.
- OM-14, Dreadnought-14, 00-14, custom measured-outline transformations, one
  4572 mm default back sphere, thickness/trim deductions and literal 00 trace.
- Minimal fretboard UI and dimensioned SVG proving the same backend can host
  another generator. Future neck/headstock/bridge implementations are not included.
- Deterministic measured-data export, source freshness checks and CI without deployment.

## Checks

See the draft PR for the final validation result and commit. Commands are
reproducible from the repository root after installing the pinned tools.

| Check | Result |
| --- | --- |
| `cargo test --locked --manifest-path backend/Cargo.toml` | 2 Rust unit tests pass |
| `cargo fmt` / `cargo clippy --workspace --all-targets -- -D warnings` | Pass |
| `npm run backend:test` | 41 Node tests pass, including native parity, compiled Wasm, HTTP, proxy, client races and existing side/print regressions |
| New-source ESLint | Pass for new TS/JS, adapters, scripts, tests and client integration |
| `npm run backend:dry-run` | Dedicated preview Worker bundles successfully; no deployment |
| `npm run build` | Pass, including ESM Worker artifact validation |
| Applicable existing website regressions | 31 tests pass |
| `npm run backend:smoke` | Built website → real local workerd → Rust health and geometry verified |
| Visual browser checks | Blocked: Chromium cannot open its required Unix socket in this environment; browser tests are provided but not claimed as passing |

JS/Rust comparisons check every x, full width, cutting depth and developed
coordinate, generally within 0.000001 mm; this is numerical parity, not a
manufacturing tolerance. Native parity covers all three defaults, custom geometry
for each, large radii, thickness/trim/extensions, literal 00 trace and invalid
inputs. Independent sphere-distance and octave checks complement comparisons.
Default calculated half-perimeters: OM **748.389209 mm**, Dreadnought
**771.092559 mm**, 00 **729.490947 mm**.

## Known base-branch test debt

The full pre-existing suite has **35 passing / 4 failing tests** before this
change. The same four failures were reproduced in a detached checkout of
`origin/main` at `20004118a6fe3e274da2ec6be2fee77256d45a57`:

- Three `fretboard-orientation` cases expect negative-Y CNC motion, while the
  existing v4.5.3 generator explicitly uses a lower-left origin and positive Y.
- The slotted `fretboard-stl` case writes to macOS-specific `/private/tmp`, which
  does not exist in this Linux environment.

The old fretboard implementation and those tests are unchanged. CI for this
branch names the applicable passing website regressions explicitly; it does not
present the whole legacy suite as green. Resolve that separate CNC/test contract
before treating the full old suite as a merge gate.

The base TypeScript environment is also missing declarations for
`cloudflare:workers`, `Fetcher` and `D1Database`; a standalone `tsc --noEmit` is not
clean. Repository-wide ESLint has unrelated existing errors. This branch checks
new-source ESLint and the deployable build, rather than claiming those global
checks pass.

## Deployment status and next action

No production branch, domain, deployment setting, account, database or paid
resource has been changed. GitHub changes are for review on `feature/rust-backend`.

Cloudflare CLI reports **not authenticated** in this environment. Therefore no
remote Worker or website preview is deployed or verified, and there is no hosted
preview URL. The checked-in preview config deliberately has a separate Worker
name and no custom-domain routes. A successful local/dry-run result must not be
reported as a hosted deployment.

With authorized Cloudflare access: deploy the dedicated preview Worker, verify
its health and geometry responses, then set its origin as `RUST_API_URL` on a
separate website preview. Keep production configuration unchanged. Instructions
and exact API examples are in [README.md](README.md).
