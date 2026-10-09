"""
PDF export.

Generates a REAL structured PDF (via fpdf2) from data the pipeline has
already produced -- no screenshotting, no fake content. English content
always works using fpdf2's built-in core font.

HONEST LIMITATION: fpdf2's built-in core fonts (Helvetica etc.) only
cover Latin-1. Rendering Telugu/Hindi/Tamil/Kannada/Malayalam/Bengali
text in a PDF requires embedding an actual Unicode TTF font that covers
that script (e.g. Noto Sans Telugu, Noto Sans Devanagari -- these are
separate font files per script, there's no single "Noto Sans" that
covers all of them). This sandbox has no such font files available and
no network access to fetch one, so this cannot be faked here.

Rather than silently producing a PDF full of empty boxes for translated
text, this module looks for a font file at the path given by the
PDF_UNICODE_FONT_PATH environment variable (or app/assets/fonts/<lang>.ttf
as a fallback convention) and raises a clear, actionable error if it's
not found -- so the failure is honest and fixable, not silent garbage
output.
"""

import os
from datetime import datetime
from typing import Optional

from fpdf import FPDF


def _seconds_to_timestamp(seconds: float) -> str:
    total = max(0, int(seconds or 0))
    minutes, secs = divmod(total, 60)
    return f"{minutes:02d}:{secs:02d}"


def _find_unicode_font_path(language_code: Optional[str]) -> Optional[str]:
    if not language_code:
        return None
    env_path = os.environ.get("PDF_UNICODE_FONT_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path
    conventional_path = os.path.join(
        os.path.dirname(__file__), "..", "assets", "fonts", f"{language_code}.ttf"
    )
    if os.path.isfile(conventional_path):
        return conventional_path
    return None


def build_report_pdf(
    *,
    filename: str,
    uploaded_at: datetime,
    short_summary: str,
    detailed_summary: str,
    chapters: list[dict],
    key_moments: list[dict],
    keywords: list[dict],
    language_code: Optional[str] = None,
    language_name: Optional[str] = None,
) -> bytes:
    """Build the report PDF and return its raw bytes.

    If language_code is given (a non-English export), a Unicode font
    covering that script must be available -- see module docstring.
    Raises RuntimeError with a clear, actionable message if it isn't,
    rather than producing unreadable output.
    """
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    font_family = "Helvetica"
    if language_code:
        font_path = _find_unicode_font_path(language_code)
        if not font_path:
            raise RuntimeError(
                f"Cannot export a PDF in {language_name or language_code}: "
                f"no Unicode font is available for this script in this "
                f"environment. Add a font file at app/assets/fonts/"
                f"{language_code}.ttf (or set PDF_UNICODE_FONT_PATH) and "
                f"try again. English export works without this."
            )
        pdf.add_font("ReportUnicode", "", font_path)
        font_family = "ReportUnicode"

    def h1(text: str):
        pdf.set_font(font_family, size=18, style="B" if font_family == "Helvetica" else "")
        pdf.cell(0, 12, text, new_x="LMARGIN", new_y="NEXT")

    def h2(text: str):
        pdf.set_font(font_family, size=13, style="B" if font_family == "Helvetica" else "")
        pdf.ln(4)
        pdf.cell(0, 8, text, new_x="LMARGIN", new_y="NEXT")

    def body(text: str):
        pdf.set_font(font_family, size=11)
        pdf.multi_cell(0, 6, text or "Not generated yet.", new_x="LMARGIN", new_y="NEXT")

    h1("CLIPMIND AI")
    pdf.set_font(font_family, size=11)
    pdf.cell(0, 6, "Video Intelligence Report", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.cell(0, 6, f"Video: {filename}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Date: {uploaded_at.strftime('%Y-%m-%d %H:%M UTC')}", new_x="LMARGIN", new_y="NEXT")
    if language_name and language_name != "English":
        pdf.cell(0, 6, f"Language: {language_name}", new_x="LMARGIN", new_y="NEXT")

    h2("SHORT SUMMARY")
    body(short_summary)

    h2("DETAILED SUMMARY")
    body(detailed_summary)

    h2("CHAPTERS")
    if chapters:
        for c in chapters:
            body(f"{_seconds_to_timestamp(c['start_time'])}  {c['title']}")
    else:
        body("")

    h2("KEY MOMENTS")
    if key_moments:
        for m in key_moments:
            label = m.get("label") or m.get("text", "")[:60]
            body(f"{_seconds_to_timestamp(m['start_time'])}  {label}  (importance {round(m.get('importance', 0) * 100)}%)")
    else:
        body("")

    h2("KEYWORDS")
    if keywords:
        body(", ".join(f"#{k['word']}" for k in keywords))
    else:
        body("")

    return bytes(pdf.output())
