# Spherical back comparison branch

The back rim is the lower intersection with one sphere whose center is on the body symmetry plane. Two circles in the longitudinal/depth plane locate the center from the radius, end half-widths, body length, and finished end depths. Every sampled rim point is evaluated on that same sphere. Side X remains accumulated top-view perimeter distance, appropriate to the flat top datum and vertical sides.

Finished depths are measured at the outline ends. Side cutting depth equals finished depth minus top thickness minus back thickness plus trimming allowance. Defaults keep all three adjustments at zero to preserve the existing depth convention. This model assumes a flat top edge, vertical sides, and constant vertical plate deductions; it does not model a radiused top, plate-normal offsets, or flared sides.

SVG, combined SVG, and tiled print share the same side geometry. Blue lines locate bouts and waist along the developed perimeter. Inch stations count from the body tail, excluding extensions. The dashed back line is a straight taper comparison, not a cutting line.

## 00 plan comparison

The comparison preset uses provisional readings from the supplied raster image: body length 500 mm; full widths 279.6 / 229.8 / 355.6 mm; stations 81 / 186 / 356 mm from the neck; finished end depths 87.4 / 102.3 mm; zero extensions. Its 15 ft radius is an assumption. It reshapes the measured OM contour and is not a traced 00 outline. Calculated side length is 739.688 mm, compared with the reference's 730 mm. Do not globally rescale the side to force that length: that would change registration positions. Exact matching needs a calibrated outline and the actual back radius/top geometry.

## Deployment isolation

The route bundles sources from the checkout with Vite raw imports. It does not fetch mutable main-branch scripts at request time, so each branch preview tests its own code. Use the Cloudflare Workers build check's preview URL for this branch. Production is updated only through the production workflow after merge.

## Checks

Run `node --test tests/om-dxf.test.mjs tests/side-print.test.mjs` from the repository root. Tests cover measured OM and Dreadnought perimeter regressions, common-sphere geometry, end depths, large-radius behavior, invalid dimensions, thickness and trim deductions, SVG extensions and marks, portrait tiling, and offline route composition. The Cloudflare build verifies raw imports and Worker compilation.
