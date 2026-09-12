"""Generate reproducible, fictional PDF fixtures for the local guided sample."""

from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend" / "output" / "pdf"


def write_pdf(filename, title, lines):
    OUT.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUT / filename), pagesize=letter, invariant=1)
    pdf.setTitle(title)
    pdf.setAuthor("Sample classroom")
    pdf.setSubject("Fictional math homework for local workflow testing")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(54, 736, title)
    pdf.setFont("Helvetica", 11)
    y = 704
    for line in lines:
        pdf.drawString(54, y, line)
        y -= 23
    pdf.setFont("Helvetica", 9)
    pdf.drawString(54, 40, "Fictional test material - page 1 of 1")
    pdf.save()


def main():
    write_pdf(
        "sample-homework.pdf",
        "Sample homework: induction",
        [
            "Question: Prove that 1 + 2 + ... + n = n(n + 1) / 2 for every integer n >= 1.",
            "",
            "Student's submitted proof:",
            "1. Base case: for n = 1, both sides equal 1.",
            "2. Assume the formula is true for k + 1.",
            "3. Therefore it is true for k + 1, which completes the induction.",
            "",
            "This submission intentionally contains a mistake for testing.",
        ],
    )
    write_pdf(
        "sample-answer-key.pdf",
        "Sample answer key: induction",
        [
            "Question: Prove that 1 + 2 + ... + n = n(n + 1) / 2 for every integer n >= 1.",
            "",
            "One valid proof:",
            "1. For n = 1, both sides equal 1.",
            "2. Assume 1 + ... + k = k(k + 1) / 2 for an arbitrary integer k >= 1.",
            "3. Add k + 1: 1 + ... + k + (k + 1) = k(k + 1) / 2 + (k + 1).",
            "4. Factor the right-hand side to obtain (k + 1)(k + 2) / 2.",
            "5. The k + 1 case follows, so the claim holds by induction.",
            "",
            "Sample rubric: base case 2 points; valid inductive step 8 points.",
            "The example submission earns 2/10 after teacher approval.",
            "Its mistake is assuming the k + 1 conclusion instead of deriving it.",
            "Accept other complete, mathematically valid proofs.",
        ],
    )
    print(f"Generated sample-homework.pdf and sample-answer-key.pdf in {OUT}")


if __name__ == "__main__":
    main()
