# OM contour reference

Source: user-supplied `0m-14-fret 2d CNC Files.dxf` (Gen One OM-14 CNC plan). DXF INSUNITS=1, inches. The non-cutaway outside Cutout polyline (entity index 146 in the extraction) was used, not its 2 mm inner offset or the cutaway variants. Its 19 outside-half vertices are embedded in om-dxf.js; the full drawing is not bundled.

Circular bulge segments are sampled at a maximum 0.25 mm arc interval, including cardinal extrema, before scaling X from approximately 486.513 mm to 485.8 mm. Y is unchanged. A 0.00003 mm tail overhang is removed to give a single-valued width function. Both sides are mirrored from this half-contour.

Default stations from the neck end:

| Station | X (mm) | Full width (mm) |
|---|---:|---:|
| Neck edge | 0 | 18.9987 |
| Upper bout | 81.0238 | 288.7096 |
| Waist | 162.0503 | 234.3475 |
| Lower bout | 349.5777 | 381.1829 |
| Tail center | 485.8 | 0 |

The neck-end width is the outside contour at the CNC notch mouth, not neck-block width. Developed length follows that outside edge to the tail center. It does not traverse the notch walls or notch floor, or cross the neck face. Default developed length is approximately 738.890 mm; two 15 mm extensions give a 768.890 mm blank. Extensions remain explicit allowances for joining and trimming.

OM uses this measured curve rather than the old radius controls. Editable outline stations remap each measured segment; reset restores the measured default. The old radius controls remain available for Dreadnought. Developed geometry uses the arc-spaced sample locations for OM, avoiding length errors near vertical ends; the existing 480-interval sampling is retained for Dreadnought. Top, side, combined SVGs and tiled printing share the same geometry.
