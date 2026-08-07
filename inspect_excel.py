import os
import xlrd
from pathlib import Path
p = Path(r'docs/+Form 9440 #1 CITRIC ACID PASSIVATION.xls')
print('exists', p.exists(), 'size', p.stat().st_size if p.exists() else None)
wb = xlrd.open_workbook(p)
print('sheets', wb.sheet_names())
for name in wb.sheet_names():
    ws = wb.sheet_by_name(name)
    print('--- SHEET', name, 'rows', ws.nrows, 'cols', ws.ncols)
    for r in range(min(ws.nrows, 30)):
        row = []
        for c in range(min(ws.ncols, 20)):
            v = ws.cell_value(r,c)
            if isinstance(v, float):
                if v.is_integer():
                    v = int(v)
            row.append(v)
        print(r, row)
    print()
