import pdfplumber
import os

candidates = [
    "C:/Users/satya/Downloads/Capture_Project_Documentation.pdf",
    "C:/Users/satya/Downloads/GitMind_Architecture_and_Specification_Manual.pdf",
    "C:/Users/satya/Downloads/idealab_reportt.pdf",
    "C:/Users/satya/Downloads/VayuRakshak_AI_Problem_Statement.pdf"
]

for path in candidates:
    if os.path.exists(path):
        print("="*60)
        print(f"FILE: {os.path.basename(path)}")
        try:
            with pdfplumber.open(path) as pdf:
                print(f"Total Pages: {len(pdf.pages)}")
                for i in range(min(4, len(pdf.pages))):
                    txt = pdf.pages[i].extract_text()
                    print(f"--- PAGE {i+1} ---")
                    if txt:
                        lines = [line.strip() for line in txt.split("\n") if line.strip()]
                        print("\n".join(lines[:15]))
                    else:
                        print("[No text found or scanned image]")
        except Exception as e:
            print(f"Error reading {path}: {e}")
