// POST /api/export-cross-analysis-pdf
// Body: the crossData object from /api/prompt-cross-analysis
// Returns a styled PDF as a download

import PDFDocument from "pdfkit";

const PURPLE      = "#5c4eb5";
const DARK        = "#1a1733";
const GRAY        = "#6b6480";
const LIGHT_GRAY  = "#9b8fcf";
const RED         = "#c0392b";
const AMBER       = "#b35c00";
const GREEN       = "#1a6e42";
const GOLD        = "#7a5700";
const WHITE       = "#ffffff";

const DIFF_COLORS = ["#e74c3c", "#e67e22", "#2a7fd4", "#1a6e42", "#7a5700"];
const COHORT_NAMES = { 1: "Edison", 2: "Hopper", 3: "Bardeen", 4: "Lawrence", 5: "Morrison" };

function hexToRGB(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function drawRect(doc, x, y, w, h, hex, radius = 0) {
  doc.save().fillColor(hexToRGB(hex)).roundedRect(x, y, w, h, radius).fill().restore();
}

function drawSection(doc, title, color, bg, items, renderItem, pageW, margin) {
  const contentW = pageW - margin * 2;

  // Section header
  drawRect(doc, margin, doc.y, contentW, 34, bg, 8);
  doc.fillColor(hexToRGB(color)).font("Helvetica-Bold").fontSize(12)
    .text(title, margin + 14, doc.y - 30, { width: contentW - 28 });
  doc.moveDown(0.8);

  items.forEach((item, i) => {
    const startY = doc.y;
    renderItem(doc, item, i, margin, contentW, startY);
    doc.moveDown(0.5);

    // Page overflow check
    if (doc.y > doc.page.height - 100) doc.addPage();
  });

  doc.moveDown(0.5);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const data = req.body;
  if (!data) return res.status(400).json({ error: "No data provided" });

  const doc = new PDFDocument({ margin: 0, size: "LETTER", bufferPages: true });
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 48;
  const contentW = pageW - margin * 2;

  const chunks = [];
  doc.on("data", c => chunks.push(c));

  // ── Cover header ──────────────────────────────────────────────────────────
  drawRect(doc, 0, 0, pageW, 110, "#0f0729");
  doc.fillColor(hexToRGB(WHITE)).font("Helvetica-Bold").fontSize(22)
    .text("Uplift Mentorship Program", margin, 28, { width: contentW });
  doc.font("Helvetica").fontSize(13).fillColor([180, 170, 220])
    .text("Cross-Cohort Analysis Report", margin, 56, { width: contentW });

  const genAt = data.generatedAt
    ? new Date(data.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  doc.fontSize(10).fillColor([140, 130, 180])
    .text(`Generated ${genAt}`, margin, 80, { width: contentW });

  doc.y = 130;

  // Response counts summary bar
  if (data.responseCounts) {
    drawRect(doc, margin, doc.y, contentW, 32, "#f3f0ff", 8);
    const countText = Object.entries(data.responseCounts)
      .map(([c, n]) => `${COHORT_NAMES[c] || c}: ${n} responses`)
      .join("   ·   ");
    doc.fillColor(hexToRGB(PURPLE)).font("Helvetica").fontSize(9.5)
      .text(countText, margin + 12, doc.y - 24, { width: contentW - 24 });
    doc.moveDown(1.2);
  }

  doc.moveDown(0.5);

  // ── KEY DIFFERENCES ───────────────────────────────────────────────────────
  if (data.differences?.length > 0) {
    drawRect(doc, margin, doc.y, contentW, 36, "#fff0f0", 8);
    doc.fillColor(hexToRGB(RED)).font("Helvetica-Bold").fontSize(12)
      .text("⚡  Key Differences Between Cohorts", margin + 14, doc.y - 28, { width: contentW - 28 });
    doc.moveDown(1);

    data.differences.forEach((d, i) => {
      if (doc.y > pageH - 120) doc.addPage();
      const accentColor = DIFF_COLORS[i % DIFF_COLORS.length];

      // Left accent bar
      doc.save().fillColor(hexToRGB(accentColor)).rect(margin, doc.y, 3, 42).fill().restore();

      // Cohort pills
      let pillX = margin + 12;
      const pillY = doc.y;
      doc.font("Helvetica-Bold").fontSize(11).fillColor(hexToRGB(DARK))
        .text(d.title, margin + 12, pillY, { width: contentW - 80 });

      if (d.cohorts?.length) {
        d.cohorts.forEach(cohort => {
          const pillW = doc.widthOfString(cohort) + 12;
          drawRect(doc, pageW - margin - (d.cohorts.length * 65), pillY - 1, pillW, 14, "#f3f0ff", 3);
          doc.fillColor(hexToRGB(PURPLE)).font("Helvetica-Bold").fontSize(8)
            .text(cohort, pageW - margin - (d.cohorts.length * 65) + 4, pillY + 2);
        });
      }

      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(10).fillColor(hexToRGB(GRAY))
        .text(d.description, margin + 12, doc.y, { width: contentW - 20, lineGap: 2 });
      doc.moveDown(0.8);
    });

    doc.moveDown(0.4);
  }

  // ── SHARED THEMES ─────────────────────────────────────────────────────────
  if (data.similarities?.length > 0) {
    if (doc.y > pageH - 160) doc.addPage();
    drawRect(doc, margin, doc.y, contentW, 36, "#1a0e4f", 8);
    doc.fillColor(hexToRGB(WHITE)).font("Helvetica-Bold").fontSize(12)
      .text("🔗  Shared Across All Cohorts", margin + 14, doc.y - 28, { width: contentW - 28 });
    doc.moveDown(1);

    data.similarities.forEach((s, i) => {
      if (doc.y > pageH - 100) doc.addPage();
      drawRect(doc, margin, doc.y, contentW, 1, "#e8e4f5");

      doc.font("Helvetica-Bold").fontSize(11).fillColor(hexToRGB(DARK))
        .text(s.title, margin + 6, doc.y + 6, { width: contentW - 12 });
      doc.moveDown(0.25);
      doc.font("Helvetica").fontSize(10).fillColor(hexToRGB(GRAY))
        .text(s.description, margin + 6, doc.y, { width: contentW - 12, lineGap: 2 });
      doc.moveDown(0.7);
    });

    doc.moveDown(0.4);
  }

  // ── COHORT SPOTLIGHTS ────────────────────────────────────────────────────
  if (data.cohortHighlights?.length > 0) {
    if (doc.y > pageH - 160) doc.addPage();
    drawRect(doc, margin, doc.y, contentW, 36, "#0f0729", 8);
    doc.fillColor(hexToRGB(WHITE)).font("Helvetica-Bold").fontSize(12)
      .text("🏆  Cohort Spotlights", margin + 14, doc.y - 28, { width: contentW - 28 });
    doc.moveDown(1);

    const SPOTLIGHT_COLORS = ["#2a4db5", "#5c4eb5", "#a0286e", "#1a6e42", "#7a5700"];
    const SPOTLIGHT_BG     = ["#f0f4ff", "#f5f0ff", "#fff0f8", "#f0fff8", "#fffbf0"];

    data.cohortHighlights.forEach((h, i) => {
      if (doc.y > pageH - 110) doc.addPage();
      const col = SPOTLIGHT_COLORS[i % SPOTLIGHT_COLORS.length];
      const bg  = SPOTLIGHT_BG[i % SPOTLIGHT_BG.length];
      const cardH = 64;

      drawRect(doc, margin, doc.y, contentW, cardH, bg, 8);

      // Cohort name label
      doc.font("Helvetica-Bold").fontSize(8).fillColor(hexToRGB(col))
        .text(h.cohort.toUpperCase(), margin + 14, doc.y - cardH + 10, { width: contentW - 28 });

      // Headline
      doc.font("Helvetica-Bold").fontSize(11).fillColor(hexToRGB(col))
        .text(h.headline, margin + 14, doc.y - cardH + 22, { width: contentW - 28 });

      // Description
      doc.font("Helvetica").fontSize(9.5).fillColor(hexToRGB(col))
        .text(h.description, margin + 14, doc.y - cardH + 36, { width: contentW - 28, lineGap: 1.5 });

      doc.y = doc.y + 8;
      doc.moveDown(0.6);
    });

    doc.moveDown(0.4);
  }

  // ── STANDOUT COHORTS ──────────────────────────────────────────────────────
  if (data.standouts?.length > 0) {
    if (doc.y > pageH - 160) doc.addPage();
    drawRect(doc, margin, doc.y, contentW, 36, "#fffbe6", 8);
    doc.save().strokeColor(hexToRGB("#f5d97a")).lineWidth(1)
      .roundedRect(margin, doc.y - 36, contentW, 36, 8).stroke().restore();
    doc.fillColor(hexToRGB(GOLD)).font("Helvetica-Bold").fontSize(12)
      .text("🌟  Standout Cohorts", margin + 14, doc.y - 62, { width: contentW - 28 });
    doc.moveDown(1);

    data.standouts.forEach((s, i) => {
      if (doc.y > pageH - 100) doc.addPage();
      doc.font("Helvetica-Bold").fontSize(11).fillColor(hexToRGB(GOLD))
        .text(`${s.cohort}`, margin + 6, doc.y, { continued: true })
        .font("Helvetica").fontSize(10).fillColor(hexToRGB(AMBER))
        .text(`  —  ${s.title}`);
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(10).fillColor(hexToRGB(GOLD))
        .text(s.description, margin + 6, doc.y, { width: contentW - 12, lineGap: 2 });
      doc.moveDown(0.8);
    });

    doc.moveDown(0.4);
  }

  // ── RECOMMENDATIONS ───────────────────────────────────────────────────────
  if (data.recommendations?.length > 0) {
    if (doc.y > pageH - 160) doc.addPage();
    drawRect(doc, margin, doc.y, contentW, 36, "#e8f8f0", 8);
    doc.fillColor(hexToRGB(GREEN)).font("Helvetica-Bold").fontSize(12)
      .text("📋  Program Recommendations", margin + 14, doc.y - 28, { width: contentW - 28 });
    doc.moveDown(1);

    data.recommendations.forEach((r, i) => {
      if (doc.y > pageH - 120) doc.addPage();
      const isAll = r.scope === "all";
      const scopeColor = isAll ? PURPLE : GREEN;
      const scopeLabel = isAll ? "All cohorts" : "Cohort-specific";
      const scopeBg = isAll ? "#f3f0ff" : "#e8faf7";

      // Number circle
      doc.save().fillColor(hexToRGB(PURPLE)).circle(margin + 8, doc.y + 6, 8).fill()
        .fillColor(hexToRGB(WHITE)).font("Helvetica-Bold").fontSize(8)
        .text(`${i + 1}`, margin + 5, doc.y + 2).restore();

      // Scope pill
      const pillW = doc.widthOfString(scopeLabel) + 12;
      drawRect(doc, pageW - margin - pillW - 2, doc.y - 1, pillW, 14, scopeBg, 3);
      doc.fillColor(hexToRGB(scopeColor)).font("Helvetica-Bold").fontSize(8)
        .text(scopeLabel, pageW - margin - pillW + 4, doc.y - 13);

      doc.font("Helvetica-Bold").fontSize(11).fillColor(hexToRGB(DARK))
        .text(r.title, margin + 22, doc.y - 14, { width: contentW - pillW - 30 });
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(10).fillColor(hexToRGB(GRAY))
        .text(r.description, margin + 22, doc.y, { width: contentW - 30, lineGap: 2 });
      doc.moveDown(0.8);
    });
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    drawRect(doc, 0, pageH - 28, pageW, 28, "#0f0729");
    doc.fillColor([140, 130, 180]).font("Helvetica").fontSize(8)
      .text("Uplift Mentorship Program · Internal Use Only", margin, pageH - 18, { width: contentW / 2 });
    doc.text(`Page ${i + 1} of ${range.count}`, margin + contentW / 2, pageH - 18, { width: contentW / 2, align: "right" });
  }

  doc.end();

  await new Promise(resolve => doc.once("end", resolve));
  const pdfBuffer = Buffer.concat(chunks);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="uplift-cross-analysis-${new Date().toISOString().slice(0,10)}.pdf"`);
  res.setHeader("Content-Length", pdfBuffer.length);
  return res.status(200).send(pdfBuffer);
}
