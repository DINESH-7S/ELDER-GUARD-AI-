import sys
sys.path.insert(0, r'E:\Elder_guard\docs\report')
from lib import *
import part1, part2

sec0 = doc.sections[0]
pg = OxmlElement('w:pgNumType'); pg.set(qn('w:fmt'), 'lowerRoman'); pg.set(qn('w:start'), '1')
sec0._sectPr.append(pg)
footer_number(sec0)
part1.front()
sec1 = new_section('decimal', 1)
footer_number(sec1)
part1.ch1_to_4()
part1.ch5_to_6()
part2.ch7_to_9()
part2.ch10_to_13()
part2.appendices()
out = r'E:\Elder_guard\docs\report\ElderGuard_Mini_Project_Report.docx'
doc.save(out)
print('saved', out)
