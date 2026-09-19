from pathlib import Path

import fitz
import numpy as np
from PIL import Image, ImageChops, ImageStat


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(r"C:\Users\User\Downloads\Okayness Certification ICD.pdf")
FONT_PATH = ROOT / "tmp" / "pdfs" / "fonts" / "Template-Montserrat-SemiBold.cff"
TEXT = "INTERPERSONAL COMMUNICATION DYNAMICS"
TEAL = (34 / 255, 141 / 255, 157 / 255)
ZOOM = 3
CROP = (88 * ZOOM, 292 * ZOOM, 754 * ZOOM, 332 * ZOOM)


def image_for_page(page: fitz.Page) -> Image.Image:
    pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def teal_pixels(image: Image.Image) -> int:
    values = np.array(image.crop(CROP))
    mask = (
        (values[:, :, 0] < 100)
        & (values[:, :, 1] > 90)
        & (values[:, :, 1] < 190)
        & (values[:, :, 2] > 100)
        & (values[:, :, 2] < 200)
    )
    return int(mask.sum())


def main() -> None:
    source = fitz.open(SOURCE)
    FONT_PATH.write_bytes(source.extract_font(6)[3])
    target = image_for_page(source[0])
    target_teal = teal_pixels(target)
    source.close()

    font = fitz.Font(fontfile=str(FONT_PATH))
    width = font.text_length(TEXT, fontsize=26)
    results = []

    for border_width in (0, 0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06):
        document = fitz.open(SOURCE)
        page = document[0]
        page.draw_rect(fitz.Rect(92, 294, 750, 330), color=None, fill=(1, 1, 1), overlay=True)
        center_x = page.rect.width / 2
        baseline = 320.4596
        page.insert_text(
            (center_x - width / 2, baseline),
            TEXT,
            fontsize=26,
            fontname="TemplateMontserratSemiBold",
            fontfile=str(FONT_PATH),
            color=TEAL,
            fill=TEAL,
            render_mode=0 if border_width == 0 else 2,
            border_width=border_width,
            morph=(fitz.Point(center_x, baseline), fitz.Matrix(0.995975, 1)),
            overlay=True,
        )
        candidate = image_for_page(page)
        difference = ImageChops.difference(target.crop(CROP), candidate.crop(CROP))
        score = sum(ImageStat.Stat(difference).mean) / 3
        pixels = teal_pixels(candidate)
        results.append((score, border_width, pixels, pixels / target_teal))
        document.close()

    for score, border, pixels, ratio in sorted(results):
        print(f"score={score:.6f} border={border:.3f} teal_pixels={pixels} ratio={ratio:.6f}")


if __name__ == "__main__":
    main()
