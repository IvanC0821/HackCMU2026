"""Build fictional, course-specific formatting examples for the instructor demo."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
import subprocess

OUT = Path(__file__).resolve().parents[1] / 'output' / 'pdf' / 'homework-1'
OUT.mkdir(parents=True, exist_ok=True)
INK, MUTED, TEAL, RED = map(HexColor, ['#25292b', '#626a6e', '#1a505a', '#b32934'])

def text(pdf, x, y, line, size=11, bold=False, color=INK):
    pdf.setFillColor(color)
    pdf.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
    pdf.drawString(x, y, line)

def base(pdf, page, kind):
    text(pdf, 54, 748, 'HOMEWORK 1', 10, True, TEAL)
    text(pdf, 430, 748, 'Demo classroom', 10, False, MUTED)
    pdf.setStrokeColor(HexColor('#d8dcde'))
    pdf.line(54, 730, 558, 730)
    text(pdf, 54, 697, 'Linear systems' if page == 1 else 'Proof by induction', 20, True)
    text(pdf, 54, 672, f'Question {page}  /  10 points  /  {kind}', 10, False, MUTED)
    text(pdf, 54, 40, 'Fictional teaching example. Not a CMU assignment or grading policy.', 8, False, MUTED)
    text(pdf, 528, 40, f'{page} / 2', 9, False, MUTED)

def question(pdf, page):
    if page == 1:
        text(pdf, 54, 628, 'Solve this system using row reduction. Show and label each row operation.')
        text(pdf, 54, 608, 'Write the final answer as a column vector.')
        text(pdf, 220, 564, '2x + y = 5', 16)
        text(pdf, 220, 537, 'x - y = 1', 16)
    else:
        text(pdf, 54, 628, 'Prove the following statement for every integer n >= 1 by induction.')
        text(pdf, 160, 580, '1 + 3 + ... + (2n - 1) = n^2', 16)
        text(pdf, 54, 536, 'State the inductive hypothesis for arbitrary k >= 1 and finish with an')
        text(pdf, 54, 516, 'explicit conclusion that the statement holds for every integer n >= 1.')

def matrix(pdf, x, y, values, size=12):
    pdf.setStrokeColor(INK)
    pdf.setLineWidth(.8)
    pdf.lines([(x + 5, y + 8, x, y + 8), (x, y + 8, x, y - 32), (x, y - 32, x + 5, y - 32),
               (x + 97, y + 8, x + 102, y + 8), (x + 102, y + 8, x + 102, y - 32), (x + 102, y - 32, x + 97, y - 32),
               (x + 65, y + 5, x + 65, y - 29)])
    for row, nums in enumerate(values):
        for col, value in enumerate(nums):
            text(pdf, x + 12 + col * 30, y - row * 23, str(value), size)

def student(pdf, page, graded=False):
    text(pdf, 54, 472, 'Submitted work', 11, True)
    if page == 1:
        matrix(pdf, 86, 421, [[2, 1, 5], [1, -1, 1]])
        text(pdf, 225, 407, '---->', 14)
        matrix(pdf, 298, 421, [[1, 0, 2], [0, 1, 1]])
        text(pdf, 86, 333, 'x = 2, y = 1', 15)
        if graded:
            text(pdf, 54, 263, '-2  Row operations are not shown or labeled.', 11, True, RED)
            text(pdf, 54, 238, '-1  The final answer must be a column vector.', 11, True, RED)
            text(pdf, 54, 198, 'The numerical answer is correct. Score: 7 / 10', 11, True)
    else:
        lines = ['For n = 1, the sum is 1 = 1^2.',
                 'Assume the claim is true for an arbitrary integer k >= 1.',
                 'Then 1 + 3 + ... + (2k - 1) = k^2.',
                 'Adding the next odd number gives',
                 'k^2 + (2k + 1) = k^2 + 2k + 1 = (k + 1)^2.']
        for i, line in enumerate(lines):
            text(pdf, 66, 434 - i * 30, line)
        if graded:
            text(pdf, 54, 235, '-1  Add the explicit conclusion for all integers n >= 1.', 11, True, RED)
            text(pdf, 54, 197, 'The inductive step is correct. Score: 9 / 10', 11, True)

def solution(pdf, page):
    text(pdf, 54, 472, 'Instructor worked solution', 11, True)
    if page == 1:
        rows = [('Start', [[2, 1, 5], [1, -1, 1]]),
                ('Swap R1 and R2', [[1, -1, 1], [2, 1, 5]]),
                ('R2 <- R2 - 2R1', [[1, -1, 1], [0, 3, 3]]),
                ('R2 <- (1/3)R2', [[1, -1, 1], [0, 1, 1]]),
                ('R1 <- R1 + R2', [[1, 0, 2], [0, 1, 1]])]
        for i, (label, values) in enumerate(rows):
            y = 426 - i * 62
            text(pdf, 66, y - 8, label, 11)
            matrix(pdf, 300, y, values, 11)
        text(pdf, 66, 96, 'Therefore, the solution vector is', 11)
        pdf.setStrokeColor(INK)
        pdf.lines([(259,112,255,112),(255,112,255,72),(255,72,259,72),
                   (289,112,293,112),(293,112,293,72),(293,72,289,72)])
        text(pdf, 269, 99, '2', 12)
        text(pdf, 269, 80, '1', 12)
    else:
        lines = [('Base case', True), ('At n = 1, the sum is 1 = 1^2, so the statement holds.', False),
                 ('Inductive hypothesis', True), ('Assume the statement holds for an arbitrary integer k >= 1.', False),
                 ('Inductive step', True), ('Add the next odd number, 2k + 1, to the sum for k:', False),
                 ('k^2 + (2k + 1) = (k + 1)^2.', False),
                 ('Conclusion', True), ('By induction, the statement holds for every integer n >= 1.', False)]
        for i, (line, bold) in enumerate(lines):
            text(pdf, 66, 439 - i * 31, line, 11, bold)

for name, label in [('questions', 'Blank assignment'), ('instructor-solution', 'Instructor reference'),
                    ('past-graded', 'Previously graded example'), ('student-submission', 'Sample student')]:
    pdf = canvas.Canvas(str(OUT / f'{name}.pdf'), pagesize=letter, invariant=1)
    pdf.setTitle(f'Homework 1 - {label}')
    pdf.setAuthor('Verity sample classroom')
    for page in (1, 2):
        base(pdf, page, label)
        question(pdf, page)
        if name == 'instructor-solution': solution(pdf, page)
        elif name != 'questions': student(pdf, page, name == 'past-graded')
        pdf.showPage()
    pdf.save()
    subprocess.run(['pdftoppm', '-scale-to', '1200', '-png', str(OUT / f'{name}.pdf'), str(OUT / name)], check=True)
print(f'Created four two-page sample PDFs and page previews in {OUT}')
