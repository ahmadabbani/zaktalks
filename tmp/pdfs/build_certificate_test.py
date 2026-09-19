from pathlib import Path

import fitz
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DecodedStreamObject, NameObject


ROOT = Path(__file__).resolve().parents[2]
SOURCE_PDF = Path(r"C:\Users\User\Downloads\Okayness Certification ICD.pdf")
VARIABLE_FONT = ROOT / "tmp" / "pdfs" / "fonts" / "Montserrat-Variable.ttf"
SEMIBOLD_FONT = ROOT / "tmp" / "pdfs" / "fonts" / "Montserrat-SemiBold.ttf"
TEMPLATE_SEMIBOLD_FONT = ROOT / "tmp" / "pdfs" / "fonts" / "Template-Montserrat-SemiBold.cff"
STAGE_PDF = ROOT / "tmp" / "pdfs" / "certificate-stage.pdf"
OUTPUT_PDF = ROOT / "output" / "pdf" / "okayness-certificate-spacing-fixed.pdf"

LEARNER_NAME = "Zak Dakkash"
COURSE_NAME = "Interpersonal Communication Dynamics"
COMPLETION_DATE = "19 September 2026"

DISPLAY_LEARNER_NAME = LEARNER_NAME.upper()
DISPLAY_COURSE_NAME = COURSE_NAME.upper()

TEAL = (34 / 255, 141 / 255, 157 / 255)
def build_fallback_font() -> None:
    font = TTFont(VARIABLE_FONT)
    # Pixel-calibrated against the supplied certificate's embedded SemiBold.
    instantiateVariableFont(font, {"wght": 660}, inplace=False).save(SEMIBOLD_FONT)


def fitted_size(font: fitz.Font, text: str, preferred: float, minimum: float, width: float) -> float:
    size = preferred
    while size > minimum and font.text_length(text, fontsize=size) > width:
        size -= 0.25
    return size


def add_centered_text(
    page: fitz.Page,
    font: fitz.Font,
    text: str,
    center_x: float,
    baseline_y: float,
    preferred_size: float,
    minimum_size: float,
    max_width: float,
    font_name: str = "MontserratSemiBold",
    font_file: Path = SEMIBOLD_FONT,
    color: tuple[float, float, float] = TEAL,
    horizontal_scale: float = 1,
    stroke_width: float = 0,
) -> None:
    size = fitted_size(font, text, preferred_size, minimum_size, max_width)
    x = center_x - font.text_length(text, fontsize=size) / 2
    page.insert_text(
        (x, baseline_y),
        text,
        fontsize=size,
        fontname=font_name,
        fontfile=str(font_file),
        color=color,
        fill=color,
        render_mode=2 if stroke_width > 0 else 0,
        border_width=stroke_width,
        morph=(fitz.Point(center_x, baseline_y), fitz.Matrix(horizontal_scale, 1)),
        overlay=True,
    )


def main() -> None:
    OUTPUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    build_fallback_font()

    document = fitz.open(SOURCE_PDF)
    page = document[0]

    # The course title uses the exact embedded font from the supplied template.
    TEMPLATE_SEMIBOLD_FONT.write_bytes(document.extract_font(6)[3])

    # Cover only the replaceable values. All static labels remain untouched as
    # original PDF artwork, preserving their exact weight and tracking.
    page.draw_rect(fitz.Rect(220, 200, 622, 235.5), color=None, fill=(1, 1, 1), overlay=True)
    page.draw_rect(fitz.Rect(92, 294, 750, 330), color=None, fill=(1, 1, 1), overlay=True)
    page.draw_rect(fitz.Rect(526, 515.25, 677, 533), color=None, fill=(1, 1, 1), overlay=True)

    fallback_semibold = fitz.Font(fontfile=str(SEMIBOLD_FONT))
    template_semibold = fitz.Font(fontfile=str(TEMPLATE_SEMIBOLD_FONT))
    page_width = page.rect.width
    add_centered_text(
        page,
        fallback_semibold,
        DISPLAY_LEARNER_NAME,
        center_x=page_width / 2,
        baseline_y=226.37,
        preferred_size=26,
        minimum_size=18,
        max_width=590,
        horizontal_scale=0.960,
    )
    add_centered_text(
        page,
        fallback_semibold,
        COMPLETION_DATE,
        center_x=601.27,
        baseline_y=527.08,
        preferred_size=13,
        minimum_size=10,
        max_width=145,
        horizontal_scale=0.960,
    )

    document.subset_fonts()
    document.save(STAGE_PDF, garbage=4, deflate=True)
    document.close()

    # Repaint the course title using the template's original font resource and
    # exact TJ kerning sequence. These pair-specific adjustments cannot be
    # reproduced faithfully with a single CSS-style letter-spacing value.
    reader = PdfReader(STAGE_PDF)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    output_page = writer.pages[0]
    exact_course_stream = DecodedStreamObject()
    exact_course_stream.set_data(
        b"q\n"
        b"1 1 1 rg\n"
        b"92 265.276 658 36 re f\n"
        b"Q\n"
        b"BT\n"
        b"0.804 0.294 0.345 0.02 k\n"
        b"/T1_1 1 Tf\n"
        b"26 0 0 26 111.7427 274.8164 Tm\n"
        b"[(INTERPERSONAL C)14 (OMMUNIC)7.1 (A)73 (TION D)2 (YNAMICS)]TJ\n"
        b"ET\n"
    )
    exact_course_ref = writer._add_object(exact_course_stream)
    existing_contents = output_page.get("/Contents")
    if isinstance(existing_contents, ArrayObject):
        existing_contents.append(exact_course_ref)
    else:
        output_page[NameObject("/Contents")] = ArrayObject([existing_contents, exact_course_ref])

    with OUTPUT_PDF.open("wb") as output_stream:
        writer.write(output_stream)

    STAGE_PDF.unlink(missing_ok=True)

    verification = fitz.open(OUTPUT_PDF)
    extracted = verification[0].get_text("text")
    for expected in (DISPLAY_LEARNER_NAME, DISPLAY_COURSE_NAME, COMPLETION_DATE):
        if expected not in extracted:
            raise RuntimeError(f"Generated value is missing: {expected}")
    verification.close()

    print(OUTPUT_PDF)


if __name__ == "__main__":
    main()
