"""Create six one-page PDFs from the same structured cases the app checks."""
import json
import subprocess
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter

OUT = Path(__file__).resolve().parents[1] / 'output' / 'pdf' / 'row-case'
data = json.loads((OUT / 'source.json').read_text())
INK = HexColor('#25292b')
MUTED = HexColor('#586367')
TEAL = HexColor('#1a505a')

def text(pdf, x, y, value, size=11, bold=False, color=INK):
    pdf.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
    pdf.setFillColor(color)
    pdf.drawString(x, y, str(value))

def matrix(pdf, x, y, rows):
    pdf.setStrokeColor(INK)
    pdf.setLineWidth(.8)
    pdf.lines([(x+5,y+8,x,y+8),(x,y+8,x,y-32),(x,y-32,x+5,y-32),
               (x+137,y+8,x+142,y+8),(x+142,y+8,x+142,y-32),(x+142,y-32,x+137,y-32),
               (x+92,y+5,x+92,y-29)])
    for i,row in enumerate(rows):
        for j,value in enumerate(row):
            text(pdf,x+12+j*45,y-i*23,value)

def op_text(op):
    if not op: return 'Intermediate work not supplied'
    target=op['target']+1
    if op['type']=='swap': return f'Swap R{target} and R{op["source"]+1}'
    if op['type']=='scale': return f'R{target} <- ({op["factor"]}) R{target}'
    return f'R{target} <- R{target} + ({op["factor"]}) R{op["source"]+1}'

for name,title,case in [('questions','Blank assignment',None),('solution','Professor solution','corrected'),
                        ('past-graded','Past graded example','incomplete'),('incomplete','Incomplete work','incomplete'),
                        ('corrected','Corrected work','corrected'),('alternative','Valid alternative','alternative')]:
    pdf=canvas.Canvas(str(OUT/f'{name}.pdf'),pagesize=letter,invariant=1)
    pdf.setTitle(f'Homework 1 - {title}')
    pdf.setAuthor('Verity demo classroom')
    text(pdf,54,748,'Homework 1',11,True,TEAL)
    text(pdf,400,748,title,10,False,MUTED)
    pdf.setStrokeColor(HexColor('#dce2e3'));pdf.line(54,732,558,732)
    text(pdf,54,697,'Solving a linear system',20,True)
    text(pdf,54,671,'Question 1 / 10 points',10,False,MUTED)
    text(pdf,54,633,'Solve 2x + y = 5 and x - y = 1 using row reduction.')
    text(pdf,54,613,'Show the intermediate operations.')
    if case:
        work=data['cases'][case]
        for i,m in enumerate(work['matrices']):
            y=555-i*86
            text(pdf,54,y-8,'Starting matrix' if i==0 else op_text(work['operations'][i-1]),10)
            matrix(pdf,360,y,m)
        text(pdf,54,110 if len(work['matrices'])>2 else 364,'Final answer: x = 2, y = 1',12,True)
    if name=='past-graded':
        text(pdf,54,286,'-2 points: intermediate operations are missing.',11,True,HexColor('#815300'))
        text(pdf,54,262,'Correct reduced form and final values. Score: 8 / 10',11,True)
        text(pdf,54,226,'Demo rubric: row work 8 points; final values 2 points.',10,False,MUTED)
    if name=='solution':
        text(pdf,54,80,'Equivalent valid row-reduction sequences are accepted.',10,False,MUTED)
    if name=='questions':
        text(pdf,54,553,'Show your work below.',10,False,MUTED)
    text(pdf,54,35,'Fictional demo. Not an actual CMU assignment or approved course policy.',8,False,MUTED)
    pdf.showPage();pdf.save()
    subprocess.run(['pdftoppm','-scale-to','1000','-png',str(OUT/f'{name}.pdf'),str(OUT/name)],check=True)
print('Built six one-page row-reduction PDFs and matching PNG previews.')
