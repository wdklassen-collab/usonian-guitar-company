# Shared luthier geometry backend

This branch adds an independent Rust geometry core and a Cloudflare Wasm HTTP
adapter. The website uses a same-origin proxy; browser drawing, annotations,
SVG downloads and portrait side tiling remain in the existing UI.

## Architecture and scope

- `core`: pure Rust, millimeters throughout, typed input and validation, measured
  body transformation, one spherical back, cumulative developed side length,
  and physical-size SVG cutting outlines. No HTTP, accounts, database or hosting API.
- `wasm`: only a JSON/wasm-bindgen boundary around the core. The native CLI uses
  the same function, so comparisons do not rely on a second Rust implementation.
- `cloudflare/api.js`: HTTP methods, JSON media type, 16 KiB streamed request
  limit, status codes and consistent errors. `index.js` instantiates the compiled
  module supplied by Cloudflare. There is no remote fetch or dynamic Wasm compilation.
- `app/api/v1/[...path]`: website proxy to the server-owned `RUST_API_URL` origin.
  No credentials, cookies or browser-selected origins are forwarded. Requests
  time out after 10 seconds. Missing configuration returns a visible 503.
- `side-template/rust-client.js`: optional engine selector or `?engine=rust`.
  Debounces input, cancels superseded requests, ignores late responses, and
  blocks export/print until the current dimensions have a successful result.
  Backend errors remain visible; selecting Browser explicitly restores local mode.
- `/rust-fretboard/`: deliberately small second tool proving reuse. Standard
  12-tone equal temperament, straight taper, width at the final fret, SVG and
  coordinate table. Outline ends at the final fret; no overhang, kerf, radius,
  multiscale, STL or CNC code. The established full fretboard tool is unchanged.

Future neck, headstock and bridge modules belong beside `side` in `core`, with
explicit input structs and their own API paths. Add a shared primitive when two
real tools need it; do not generalize untested CAD operations ahead of use.

## Geometry provenance

The website checkout is authoritative for this port. The older
`usonian-web-tools` repo contains other standalone tools and conflicting historical
production notes; no companion branch changes are needed for this milestone.

`core/data/measured.json` is a deterministic export of this checkout's existing
OM DXF and Dreadnought/00 measured polylines and presets. Regenerate only with:

```sh
node backend/scripts/references.mjs
```

Builds and CI check that export against the source scripts. Parity tests execute
the original JS geometry in a minimal DOM harness and compare every x/width/depth/
developed-distance sample with the native Rust result. Separate Wasm API tests
compare the compiled core too. They cover all three defaults, custom changes,
plate deductions, trim, extensions, near-flat radius, invalid inputs and the
literal 00 trace. Default back radius remains **4572 mm (15 feet)**.

The 00 trace is a separate, fixed-dimension mode. The original 729.967545 mm
side polyline and its drafting irregularities remain distinct from the calculated
729.4909 mm body half-perimeter. Custom geometry must use calculated mode.
See `../side-template/SPHERICAL-BACK.md` for source-plan limitations.

Core SVGs are dimensioned cutting outlines, rounded to 0.001 mm. API samples
retain double precision. The browser uses the returned samples with its existing
annotated SVG/print routines. This is numerical parity with the existing model,
not a claim of more precise manufacturing or an exact match to an unrelated plan.

## Local development

From the repository root, install Node dependencies and Rust tooling:

```sh
npm ci
rustup toolchain install 1.91.1 --profile minimal --component rustfmt --component clippy
rustup target add wasm32-unknown-unknown --toolchain 1.91.1
cargo install wasm-bindgen-cli --version 0.2.105 --locked
npm run backend:test
npm run backend:dev
```

In another terminal:

```sh
RUST_API_URL=http://127.0.0.1:8787 npm run dev -- --host 127.0.0.1
```

Open `/side-template/?engine=rust` and `/rust-fretboard/` on the website preview.
Vite may serve the raw root-level `side-template/index.html` instead of the
application route during development. Use the built preview below for side/top UI
verification; it exercises the bundled checkout scripts used in deployment:

```sh
npm run build
npx wrangler dev --config dist/server/wrangler.json --local --port 3000 --var RUST_API_URL:http://127.0.0.1:8787
```

Keep `npm run backend:dev` running separately. This is local only.
Use a preview-only runtime setting (`.dev.vars` for local Worker environments or
the deployment provider's environment settings) if shell variables are not
forwarded by a different host. Never commit an environment file.

`npm run backend:smoke` requires `npm run build` first, then starts both services locally using the deployable website artifact and exercises the actual
website → proxy → workerd → Rust path. Optional `USONIAN_BROWSER_SMOKE=1` also
uses an installed Playwright/Chromium to exercise controls, print and download.
No deployment or production API is contacted. In containers that prohibit network-interface enumeration, set `USONIAN_LOOPBACK_ONLY=1` to use the test-only loopback fallback; it does not alter deployment code or network permissions. Run `npm run build` for the website
artifact; the backend has its own build and is not needed for normal browser mode.

## Versioned JSON API

All dimensions are mm. Coordinate convention: body x is neck → tail; widths
are full widths, depth is down from the top, and side s is cumulative half-perimeter
from the neck centerline. Top SVG y is ± half width. Fretboard x starts at the nut.
Only `apiVersion: "v1"` is currently supported.

| Endpoint | Method | Input |
| --- | --- | --- |
| `/api/v1/health` | GET | None; runs a compiled Rust octave calculation |
| `/api/v1/side-top` | POST | `preset`, optional `profileSource`, optional `parameters` |
| `/api/v1/fretboard` | POST | `scaleLength`, `fretCount`, `nutWidth`, `endWidth` |

Example side request (omitted dimensions come from the selected preset):

```json
{"preset":"om14","profileSource":"calculated","parameters":{"backRadius":4572,"topThickness":3,"backThickness":2.5,"trimAllowance":1}}
```

Preset keys: `om14`, `dread14`, `plan00`. Profile: `calculated` or `trace00`.
`trace00` requires `plan00`; only thicknesses, trim and extensions can vary.
Parameters use the existing UI's camelCase field names. Unused legacy outline
radius handles and unknown fields are rejected rather than silently accepted.
Finite body length is >3 and ≤2000 mm; widths ≤2000 mm; positive end depths
≤1000 mm; radius >0 and ≤1e9 mm; extensions/plate/trim values 0–1000 mm.
Stations must be strictly ordered inside the body. Sphere and depth feasibility
are validated after those bounds.

Example fretboard request:

```json
{"scaleLength":643.636,"fretCount":20,"nutWidth":44.45,"endWidth":58}
```

Success: `{"ok":true,"data":{"apiVersion":"v1","units":"mm",...}}`.
Side data includes `parameters`, `samples`, `topSamples`, `sideLength`, `traced`,
`sphere` and `svg: {top, side}`. Fretboard data includes `length`, `frets` and `svg`.
Error: `{"ok":false,"apiVersion":"v1","error":{"code":"invalid_dimensions","message":"..."}}`.

| Status | Meaning |
| --- | --- |
| 400 | Malformed JSON/schema/type/unknown field |
| 404 / 405 / 415 | Unknown route / wrong method / wrong content type |
| 413 | Body exceeds 16 KiB, including chunked requests |
| 422 | Valid schema, impossible or unsupported dimensions |
| 502 / 503 | Website cannot reach backend / preview unconfigured |
| 500 | Unexpected adapter/core failure (no internal details exposed) |

## Isolated Cloudflare preview

The dedicated config names **`usonian-luthier-api-preview`**, has no custom-domain
routes, storage bindings or secrets, and never targets the production Worker.
Cloudflare account authentication is required to deploy; no paid resource is
requested or created by these files. Confirm the account's existing free allowance
before running an actual deployment. A Workers preview remains publicly reachable;
do not send private designs during testing.

```sh
npm run backend:build
npm run backend:dry-run
# Only with authorized Cloudflare account access:
npx wrangler deploy --config backend/cloudflare/wrangler.jsonc
```

Verify the returned URL's `/api/v1/health` and a side request, then set
`RUST_API_URL=https://<verified-preview-worker-host>` on an isolated website preview.
Do not put a Worker URL into the browser bundle and do not change production
runtime configuration for this branch. No repository CI workflow deploys anything.
