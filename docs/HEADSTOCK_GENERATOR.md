# Rust headstock studio

Development route: /rust-headstock on test.usonianguitar.com. The existing /headstock-generator and production main branch are unchanged.

The browser POSTs dimensions to /api/v1/headstock via the existing same-origin proxy. Rust generates the outline, cutouts, tuner positions, and physical-scale SVG; the browser supplies editing, display, zoom/pan, design JSON files, and tiled Letter printing. There is no JavaScript geometry fallback.

## Geometry contract

Coordinates are millimeters, X from centerline and Y from nut toward crown. Crown endpoint and Bézier handle X coordinates are normalized to half crown-base width; rise is normalized to crown height. Each segment is a line or cubic Bézier. In symmetric mode edit the left half, ending at X=0; Rust mirrors segments and reverses curve handles. Asymmetric mode ends at X=1, rise=0. At most 12 editable segments.

Dimensions control nut width, shoulder width/height, crown-base width, crown rise, independent side bulges, neck transition blend, and minimum material web. Slots are rounded capsules with length, width, bottom station, center spacing and optional symmetric splay. Solid heads support 3+3 or six-inline tuner face bores. Slotted heads show three side-drill axes per side; these are not face holes and are excluded from the cutting-only SVG.

Checks reject out-of-range or unknown fields, crossing/touching outlines, unsafe slots, overlapping face bores, and insufficient material around cutouts. Curved clearance checks are sampled and include a small margin; they do not constitute a complete structural analysis. Verify actual stock, headstock angle/thickness, tuner hardware, string paths, and string ramps before cutting.

Starting crowns: soft arch, central peak, raised plateau, flat, asymmetric crest, angular peaks. These are reference-inspired starting points, not traced reproductions of the uploaded photos.

## Interface

- Crown endpoint and handle values can be entered numerically or dragged in the preview.
- Option/Alt + wheel zooms toward the pointer. Ctrl/pinch wheel events are supported. Shift + wheel pans horizontally; Space + drag pans freely. Native horizontal trackpad gestures pan the preview. Unmodified vertical wheel scrolls the page.
- Zoom buttons and Fit to View affect only display, never physical geometry or export size.
- Cutting SVG includes only outer outline, slots and face bores. Guide SVG adds centerline/nut reference and side-drill axes.
- Full-size print preview tiles onto portrait Letter with 6.35 mm overlaps, registration marks and a 10 mm calibration square. Print at Actual Size/100%, with browser headers/footers off. Check scale before use.
- Save/load design JSON stores measurements locally in a downloaded file; no account, database or server storage is added.
- Input changes invalidate exports immediately; only the current successful Rust result can be exported or printed. Backend errors remain visible.

## Validation

Rust unit tests cover symmetry, SVG scale, slot clearance, invalid curves, solid holes and self intersections. backend/tests/headstock.test.mjs exercises all six crown families, 3+3 and six-inline holes, invalid input, compiled Wasm, HTTP and the same-origin proxy. Existing side/top and fretboard regressions remain in the CI suite. The new React source is included in targeted lint.
