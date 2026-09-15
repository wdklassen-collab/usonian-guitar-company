# CNC Template Tool

Production entry: `/cnc-template/`, linked in the homepage tool registry. The route redirects to packaged static assets at `/cnc-template-tool/index.html`. DXF content never goes to a server. The browser bundle contains pinned Clipper 6.4.2 and dxf-parser 1.1.2 dependencies, without a CDN dependency.

## Build and checks

- `npm run test:cnc`: analytical geometry fixtures and independent exported G-code checks.
- `npm run build:cnc`: rebuild the committed browser bundle with esbuild.
- `npm run build`: CNC tests and bundle regeneration run in prebuild, then the existing verified production build.
- `node --test tests/*.test.mjs`: existing route, rendering, and generator regression tests after building.

`engine.js` handles flat DXF conversion, contour validation, Clipper compensation, stock and adjacent-contour clearance, tab scheduling, depth passes, and GRBL output. `browser.js` owns inputs and preview. Any setting change invalidates the plan and download approval.

## Supported machining

XY lines, arcs, circles, and polylines, including bulges. Export Onshape sketches as DXF at Z=0; select units explicitly if INSUNITS is missing. Unsupported entities are rejected before parsing, including types the parser would silently omit. Endpoints must join within 0.001 mm. Arc chord tolerance is 0.0025 mm; Clipper uses integer coordinates at 10,000 units/mm. Inside corners/narrow features exceeding 0.03 mm reconstruction error are blocked.

One nesting level: outside profiles and their holes, with holes machined first. Conventional milling, center-cutting end mill, vertical plunges, linearized paths. Output: millimeters, G54, absolute XYZ, feed/minute, M3 spindle, safe-Z retract before XY travel, M5/M2 finish. XY stock corner or center; Z stock top or bottom. No G28, tool changes, canned cycles, or controller-side cutter compensation.

Tabs retain outside parts and hole slugs. A hole whose entire core is removed by the contour sweep has no tabs. A remaining slug that cannot accommodate the chosen tabs is blocked. Tabs are evenly spaced and require the operator to inspect placement. Stock dimensions and fixture height are explicit; fixture height validates vertical clearance only, and the user must verify lateral clamp placement and machine travel. Settings are examples, not material/machine presets. Verify $30, G54 and travel for the particular Genmitsu model.

## Scope and validation limits

No pockets, V-carving, STL/3D machining, splines, blocks, drawing annotations, nested islands, or drilling cycles. There is no live machine connection. Automated tests are software validation, not a physical cut or a GRBL firmware certification. UGS visualizer, GRBL check mode and an air cut are still required before cutting stock.

The production build and artifact validation pass locally. Repository-wide TypeScript checking currently reports existing missing Cloudflare worker type declarations in db/index.ts and worker/index.ts. Interactive browser QA was unavailable because the browser's admin-policy security check could not be verified; it was not bypassed.

Library references: https://github.com/junmer/clipper-lib and https://github.com/gdsestimating/dxf-parser. GRBL command reference: https://github.com/gnea/grbl/blob/master/doc/markdown/commands.md. Distributed license notices are in public/cnc-template-tool/THIRD-PARTY-NOTICES.txt.
