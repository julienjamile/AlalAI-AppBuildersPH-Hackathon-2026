import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_evacuation_pdf(camp_name: str, stats: dict, households: list, alerts: list) -> bytes:
    """
    Generates an official MDRRMO/MSWDO Evacuation Center Status Report PDF
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#223d65'),
        alignment=1 # Center
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#66736A'),
        alignment=1
    )
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#29445F'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#29445F')
    )

    story = []

    # Header
    story.append(Paragraph("ALALAI — KALINGA KAHIT WALANG SIGNAL", title_style))
    story.append(Paragraph(f"Disaster Evacuation Status & Needs Report · {camp_name}", subtitle_style))
    story.append(Paragraph(f"Generated on {datetime.now(timezone.utc).strftime('%B %d, %Y %H:%M UTC')} · Taga-alalAI Local AI Hub", subtitle_style))
    story.append(Spacer(1, 0.2 * inch))

    # Summary Stats Table
    stats_data = [
        ["Total Families", "Total Individuals", "Pending Reviews", "Critical Low-Stock"],
        [
            str(stats.get("total_families", 0)),
            str(stats.get("total_individuals", 0)),
            str(stats.get("pending_reviews", 0)),
            str(stats.get("low_stock_items", 0))
        ]
    ]
    stats_table = Table(stats_data, colWidths=[1.8 * inch, 1.8 * inch, 1.8 * inch, 1.8 * inch])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#223d65')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#EAF1E9')),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 16),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDE4DB')),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 0.2 * inch))

    # Low-Stock & Supply Alerts
    story.append(Paragraph("Abiso: Critical Supply Alerts & Predictions", h2_style))
    if alerts:
        alert_rows = [["Item", "Remaining", "Burn Est.", "Status", "Action"]]
        for a in alerts:
            alert_rows.append([
                a.get("name", ""),
                a.get("quantity", ""),
                f"~{a.get('runout_hours', 0)} hrs",
                a.get("status", ""),
                "Resupply Requested" if a.get("urgency") == "urgent" else "Monitoring"
            ])
        alert_table = Table(alert_rows, colWidths=[2.0 * inch, 1.5 * inch, 1.2 * inch, 1.2 * inch, 1.3 * inch])
        alert_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#A95B16')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDE4DB')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
        ]))
        story.append(alert_table)
    else:
        story.append(Paragraph("All essential supplies within safe buffer levels.", body_style))

    story.append(Spacer(1, 0.2 * inch))

    # Registered Households Sample List
    story.append(Paragraph("Recent Registered Households (Kard AlalAI Log)", h2_style))
    hh_rows = [["ID / QR", "Representative", "B-Date", "Size", "Vulnerabilities", "Status"]]
    for h in households[:15]:
        vulnerabilities = []
        if getattr(h, "has_infant", False): vulnerabilities.append("Baby")
        if getattr(h, "has_senior", False): vulnerabilities.append("Senior")
        if getattr(h, "has_medical_needs", False): vulnerabilities.append("Medical")
        vuln_text = ", ".join(vulnerabilities) if vulnerabilities else "None"

        hh_rows.append([
            getattr(h, "id", "")[-7:],
            getattr(h, "representative_name", "")[:20],
            getattr(h, "birthdate", ""),
            str(getattr(h, "members_count", 1)),
            vuln_text,
            getattr(h, "status", "registered").title()
        ])
    
    hh_table = Table(hh_rows, colWidths=[1.1 * inch, 2.0 * inch, 1.0 * inch, 0.6 * inch, 1.5 * inch, 1.0 * inch])
    hh_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#29445F')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDE4DB')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
    ]))
    story.append(hh_table)

    story.append(Spacer(1, 0.25 * inch))
    story.append(Paragraph("Confidential — For MDRRMO, MSWDO & Evacuation Command Center authorized personnel only. Processed offline via Taga-alalAI local AI hub.", subtitle_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
