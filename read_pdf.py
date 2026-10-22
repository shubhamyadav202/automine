import os
import sys

print("Checking PDF packages...")
for pkg in ['pypdf', 'pypdf2', 'pymupdf', 'fitz', 'pdfplumber', 'reportlab']:
    try:
        __import__(pkg)
        print("Installed:", pkg)
    except ImportError:
        pass
