from pypdf import PdfWriter

pdf = PdfWriter()
pdf.add_blank_page(width=8.5 * 72, height=11 * 72)
pdf.add_blank_page(width=8.5 * 72, height=11 * 72)
with open("dummy.pdf", "wb") as f:
    pdf.write(f)
