# Back geometry and supplied 00 plan

## Calculation

With longitudinal radius set to zero, the back rim is the lower intersection with one sphere fitted to the outline end depths. A separate positive longitudinal radius selects two circular cross sections: a longitudinal arc fitted to end depths with a transverse circular sag deduction. This allows plans that specify different radii in the two directions. These are distinct models; neither is automatically a literal reproduction of a drafted side contour.

Side X is accumulated top-view perimeter distance. The top edge is flat; sides are vertical. Cutting depth subtracts top and back thicknesses and adds trimming allowance. These are constant vertical deductions, not plate-normal offsets. All three default to zero. Bout and waist marks use developed distance. Inch stations start at the body tail, excluding extensions. The dashed line is a straight taper comparison.

## Binder00-14.pdf reference

Numeric polylines were extracted directly from sheet 05 at 25.4/72 mm per PDF point. No PDF page, artwork, notes, or photographs are bundled. The body outline is calibrated to its printed 500 mm length. A 0.155 mm neck-front overhang is omitted for a single-valued width function. Its resulting half-perimeter is 729.491 mm. Body widths from this template are 251.156 / 211.824 / 357.446 mm; these differ slightly from dimension text on other sheets.

The transverse back arch is labeled R3657.6 mm (12 ft) on sheets 02 and 05. The longitudinal back arc is labeled R4605.3 mm on sheet 02. The measured 00 preset uses both radii, replacing the earlier assumed 15 ft sphere and screenshot estimates.

The drawn side polyline is 729.967545 mm long, with end depths 87.367336 and 102.400355 mm. The printed labels say 730, 87.4, and 102.3 mm. Preserve these small drafting discrepancies rather than silently distorting the source curve. The reference has a conspicuous local kink at s348.966942, depth100.200360 mm. A calculated smooth surface need not reproduce that kink.

## Literal plan trace

Selecting `00 plan trace (literal template)` reproduces that exact side polyline in physical millimeters. Body geometry, end depths, and radius controls are locked to the source; plate deductions, trimming allowance, and end extensions remain adjustable. Switching back to calculated mode unlocks geometry. Reset retains the selected mode.

The literal side drawing has its own developed length, independent of the perimeter measured in the separate top drawing. The top view retains the full measured body polyline. The trace mode's side length is not claimed to be a newly calculated perimeter or a validated sphere intersection. This distinction matters for the approximately 0.48 mm difference between the two drawings.

## Deployment and checks

The route bundles sources from its checkout; branch previews never fetch mutable main-branch scripts. Run `node --test tests/om-dxf.test.mjs tests/side-print.test.mjs` from the repository root. Checks cover OM and Dreadnought regressions, spherical geometry, large-radius behavior, invalid dimensions, thickness and trim deductions, input summaries, measured 00 dimensions, literal trace coordinates, exports, and portrait tiling.
