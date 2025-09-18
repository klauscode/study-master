import sys
from pathlib import Path

try:
    import PyPDF2
except Exception:
    print('NO_PYPDF2')
    sys.exit(2)

def main():
    p = Path('edital.pdf')
    if not p.exists():
        print('MISSING_PDF')
        sys.exit(3)

    reader = PyPDF2.PdfReader(str(p))
    start, end = 32, 46
    text = []
    for i in range(start, min(end + 1, len(reader.pages))):
        page = reader.pages[i]
        text.append(page.extract_text() or '')
    out = '\n\n'.join(text)

    out_path = Path('data') / 'edital.math.txt'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(out, encoding='utf-8')
    print(f'WROTE:{out_path.as_posix()}')

if __name__ == '__main__':
    main()
