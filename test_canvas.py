import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8.5)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Header (Top)
        self.drawString(36, 756, "DWM Project: AutoMiner Pro - Interactive Data Mining Workbench")
        page_str = f"Page {self._pageNumber}"
        self.drawRightString(576, 756, page_str)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.6)
        self.line(36, 750, 576, 750)
        
        # Footer (Bottom)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.6)
        self.line(36, 42, 576, 42)
        self.drawString(36, 30, "AutoMiner Pro • Next-Gen Data Warehousing & Mining Laboratory Documentation")
        self.drawRightString(576, 30, f"{self._pageNumber} of {page_count}")
        self.restoreState()

print("NumberedCanvas definition verified!")
