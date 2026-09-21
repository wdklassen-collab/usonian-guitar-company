#!/usr/bin/env python3
"""Generate the printable four-string bass nut-spacing guide."""

from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch, mm
from reportlab.pdfgen import canvas


OUTPUT = Path(__file__).resolve().parents[1] / "public" / "nut-spacing-guides" / "usonian_4_string_bass_nut_spacing_guide.pdf"

# Standard light-gauge four-string set, bass-to-treble, in inches.
# The guide equalizes the open space between adjacent string edges.
STRING_DIAMETERS = (0.105, 0.085, 0.065, 0.045)
NUT_WIDTHS = (1.500, 1.5625, 1.625, 1.6875, 1.750)
EDGE_INSET = 0.125


def positions_for(nut_width: float) -> list[float]:
    span = nut_width - (2 * EDGE_INSET)
    half_diameter_sums = [
        (STRING_DIAMETERS[index] + STRING_DIAMETERS[index + 1]) / 2
        for index in range(3)
    ]
    clear_space = (span - sum(half_diameter_sums)) / 3
    gaps = [clear_space + value for value in half_diameter_sums]
    positions = [0.0]
    for gap in gaps:
        positions.append(positions[-1] + gap)
    return positions


def draw_centered(c: canvas.Canvas, text: str, x: float, y: float, font: str, size: float) -> None:
    c.setFont(font, size)
    c.drawCentredString(x, y, text)


def metric_label(inches: float) -> str:
    value = (Decimal(str(inches)) * Decimal("25.4")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"{value} mm"


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=letter)
    page_width, _ = letter

    c.setTitle("Usonian 4-String Bass Nut Spacing Guide")
    c.setAuthor("Usonian Guitar Co.")
    draw_centered(c, "USONIAN 4-STRING BASS NUT SPACING GUIDE", page_width / 2, 10.45 * inch, "Helvetica-Bold", 15)
    draw_centered(c, "Electric bass", page_width / 2, 10.12 * inch, "Helvetica", 9)
    draw_centered(c, "Print at 100% / Actual Size - do not fit to page", page_width / 2, 9.88 * inch, "Helvetica", 8)

    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(0.65 * inch, 9.46 * inch, "INSTRUCTIONS")
    instructions = [
        "1. First attach the two outside strings to the instrument and lightly tension them. Mark the locations",
        "   of the two outside-string centers on the nut.",
        "2. Hold the nut with its top edge facing down and slide it down the page.",
        "3. Align the marked outside-string centers with the two outside guide lines.",
        "4. Mark the remaining strings where the guide lines cross the nut.",
    ]
    c.setFont("Helvetica", 8)
    y = 9.20 * inch
    for line in instructions:
        c.drawString(0.65 * inch, y, line)
        y -= 0.20 * inch

    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(0.65 * inch, 7.98 * inch, "BASS / LOW")
    c.drawRightString(page_width - 0.65 * inch, 7.98 * inch, "TREBLE / HIGH")

    top_y = 7.65 * inch
    bottom_y = 1.55 * inch
    center_x = page_width / 2
    top_positions = positions_for(NUT_WIDTHS[0])
    bottom_positions = positions_for(NUT_WIDTHS[-1])
    top_span = top_positions[-1]
    bottom_span = bottom_positions[-1]

    def page_x(relative: float, span: float) -> float:
        return center_x + (relative - span / 2) * inch

    c.setLineWidth(0.65)
    for index in range(4):
        c.line(
            page_x(top_positions[index], top_span),
            top_y,
            page_x(bottom_positions[index], bottom_span),
            bottom_y,
        )

    # Nut-width reference lines; each label is the physical nut width, not E-to-G span.
    for nut_width in NUT_WIDTHS:
        fraction = (nut_width - NUT_WIDTHS[0]) / (NUT_WIDTHS[-1] - NUT_WIDTHS[0])
        y = top_y + (bottom_y - top_y) * fraction
        positions = positions_for(nut_width)
        span = positions[-1]
        left = page_x(positions[0], span) - 0.16 * inch
        right = page_x(positions[-1], span) + 0.16 * inch
        c.setDash(4, 4)
        c.setLineWidth(0.35)
        c.line(left, y, right, y)
        c.setDash()
        c.setFont("Helvetica", 7)
        c.drawRightString(left - 0.10 * inch, y - 2.5, metric_label(nut_width))

    def draw_gap_values(positions: list[float], span: float, y: float, above: bool) -> None:
        c.setFont("Helvetica", 6.5)
        for index in range(3):
            midpoint = (positions[index] + positions[index + 1]) / 2
            value = (positions[index + 1] - positions[index]) * 25.4
            label_y = y + (8 if above else -13)
            draw_centered(c, f"{value:.2f}", page_x(midpoint, span), label_y, "Helvetica", 6.5)

    draw_gap_values(top_positions, top_span, top_y, True)
    draw_gap_values(bottom_positions, bottom_span, bottom_y, False)

    c.setFont("Helvetica", 7)
    for index, position in enumerate(bottom_positions):
        draw_centered(c, str(4 - index), page_x(position, bottom_span), bottom_y - 27, "Helvetica", 7)
    draw_centered(c, "Top and bottom values are center-to-center string spacing in millimeters.", center_x, bottom_y - 41, "Helvetica", 7)
    draw_centered(c, "Outside string centers are 3.18 mm (1/8 in.) from each nut edge.", center_x, bottom_y - 53, "Helvetica", 7)

    verification_x = 0.90 * inch
    verification_y = 0.63 * inch
    c.setLineWidth(0.6)
    c.line(verification_x, verification_y, verification_x + 50 * mm, verification_y)
    c.line(verification_x, verification_y - 5, verification_x, verification_y + 5)
    c.line(verification_x + 50 * mm, verification_y - 5, verification_x + 50 * mm, verification_y + 5)
    draw_centered(c, "50 mm verification line", verification_x + 25 * mm, verification_y + 9, "Helvetica", 7)

    c.setFont("Helvetica", 7)
    c.drawRightString(page_width - 0.65 * inch, 0.30 * inch, "Usonian Guitar Co.")
    c.save()


if __name__ == "__main__":
    main()
