import pdfplumber

with pdfplumber.open("C:/Users/satya/Downloads/idealab_reportt.pdf") as pdf:
    print(f"Total Pages in friend's report: {len(pdf.pages)}")
    for i, p in enumerate(pdf.pages):
        txt = p.extract_text() or ""
        first_line = txt.split("\n")[0] if txt else "[EMPTY]"
        print(f"Page {i+1}: {first_line[:60]} (Chars: {len(txt)})")
