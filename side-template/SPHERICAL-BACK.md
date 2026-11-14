# Back geometry and supplied 00 plan

## Calculation

The Back Radius control is the only radius input. The back rim is the lower intersection with one sphere fitted to the outline end depths. Calculated templates use that same spherical radius in every direction. This model is separate from a literal reproduction of a drafted side contour.

Side X is accumulated top-view perimeter distance. The top edge is flat; sides are vertical. Cutting depth subtracts top and back thicknesses and adds trimming allowance. These are constant vertical deductions, not plate-normal offsets. All three default to zero. Bout and waist marks use developed distance. Inch stations start at the body tail, excluding extensions. The dashed line is a straight taper comparison.

## Binder00-14.pdf reference

Numeric polylines were extracted directly from sheet 05 at 25.4/72 mm per PDF point. No PDF page, artwork, notes, or photographs are bundled. The body outline is calibrated to its printed 500 mm length. A 0.155 mm neck-front overhang is omitted for a single-valued width function. Its resulting half-perimeter is 729.491 mm. Body widths from this template are 251.156 / 211.824 / 357.446 mm; these differ slightly from dimension text on other sheets.

The transverse back arch is labeled R3657.6 mm (12 ft) on sheets 02 and 05. The longitudinal back arc is labeled R4605.3 mm on sheet 02. The measured 00 preset defaults to a 15 ft spherical back radius; the source plan specifies 12 ft and can be tested by entering that value. The second radius remains source provenance only and is not an input or hidden calculation setting. Literal trace mode retains the original drawing independently.

The drawn side polyline is 729.967545 mm long, with end depths 87.367336 and 102.400355 mm. The printed labels say 730, 87.4, and 102.3 mm. Preserve these small drafting discrepancies rather than silently distorting the source curve. The reference has a conspicuous local kink at s348.966942, depth100.200360 mm. A calculated smooth surface need not reproduce that kink.

## Literal plan trace

Selecting `00 plan trace (literal template)` reproduces that exact side polyline in physical millimeters. Body geometry, end depths, and radius controls are locked to the source; plate deductions, trimming allowance, and end extensions remain adjustable. Switching back to calculated mode unlocks geometry. Reset retains the selected mode.

The literal side drawing has its own developed length, independent of the perimeter measured in the separate top drawing. The top view retains the full measured body polyline. The trace mode's side length is not claimed to be a newly calculated perimeter or a validated sphere intersection. This distinction matters for the approximately 0.48 mm difference between the two drawings.

## Deployment and checks

The route bundles sources from its checkout; branch previews never fetch mutable main-branch scripts. Run `node --test tests/om-dxf.test.mjs tests/side-print.test.mjs` from the repository root. Checks cover OM and Dreadnought regressions, spherical geometry, large-radius behavior, invalid dimensions, thickness and trim deductions, input summaries, measured 00 dimensions, literal trace coordinates, exports, and portrait tiling.

## BinderOM.pdf validation

The supplied sheet 05 side measures 749.020755 mm; its printed dimension is 749 mm. The measured DXF used by the OM preset starts at a neck opening corner, 9.49935 mm from the centerline. Include that half neck face in unrolling, consistently with the Dreadnought preset. No CNC notch edges are added. Corrected OM developed length is 748.389 mm, approximately 0.632 mm shorter than the PDF, consistent with the approximately 0.7 mm maximum outline difference. One 3657.6 mm back radius and end depths 79.3/104.5 mm give up to approximately 2.5 mm depth difference from the PDF's drafted side profile. This remains calculated geometry, not a literal OM side trace.

## Named presets

The selector lists OM-14, Dreadnought-14, and 00-14, in that order. All default to a single 4572 mm (15 ft) back radius, zero end extensions, and zero plate/trim adjustments by default, using the requested 15 ft default. Validation against the supplied plans explicitly uses their 12 ft arch radius. OM-14: 485.8 mm body, 79.3/104.5 mm finished end depths. Dreadnought-14: 513.3 mm body, 95.3/120.7 mm end depths. 00-14: 500 mm body and the extracted 87.367336/102.400355 mm end depths. Measured outline sources and registration stations are retained.

Startup and Reset share the canonical preset values. Preset selection remains available in literal-trace mode; selecting OM-14 or Dreadnought-14 returns to calculated mode automatically. The explicit 00 literal trace remains available separately.
