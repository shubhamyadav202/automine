import pdfplumber

with pdfplumber.open("C:/Users/satya/Downloads/idealab_reportt.pdf") as pdf:
    with open("friend_report_summary.txt", "w", encoding="utf-8") as f:
        for i in range(len(pdf.pages)):
            txt = pdf.pages[i].extract_text() or ""
            f.write(f"\n{'='*50}\nPAGE {i+1}\n{'='*50}\n")
            f.write(txt)

print("Saved text to friend_report_summary.txt")
