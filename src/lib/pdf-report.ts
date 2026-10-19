// Professional PDF report: header band, KPI cards with titles, vector charts (bar / line / target),
// and a summary table. Everything is drawn in the browser; no data leaves the device.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CHART } from "@/lib/chart-palette";
import { safeFileName, todayStamp, type ExportRow, type ExportSection } from "@/lib/export";

export type Tone = "good" | "warn" | "bad" | "neutral";
export type KpiCard = { label: string; value: string; note?: string; tone?: Tone };
export type ChartSeries = { name: string; color: string; values: (number | null)[]; kind?: "bar" | "line" };
export type ChartSpec = {
  title: string;
  subtitle?: string;
  categories: string[];
  series: ChartSeries[];
  format: "int" | "pct" | "dec1";
  stacked?: boolean;
  /** Single-series bars: one color per category (for example, good/warn/bad by value). */
  barColors?: (string | null)[];
  target?: { value: number; label: string };
};
export type ReportPdf = {
  name: string;
  title: string;
  subtitle: string;
  locale: "es" | "en";
  kpis: KpiCard[];
  charts: ChartSpec[];
  sections: ExportSection[];
};

const NAVY: [number, number, number] = [16, 42, 67];
const TEAL: [number, number, number] = [20, 184, 166];
const GRAY: [number, number, number] = [90, 100, 110];
const LIGHT_GRAY: [number, number, number] = [120, 125, 130];
const CARD: [number, number, number] = [244, 246, 249];
const TONE: Record<Tone, string> = { good: CHART.good, warn: CHART.warn, bad: CHART.bad, neutral: CHART.actual };
const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Helvetica (WinAnsi) cannot draw some Unicode symbols; map them to plain equivalents. */
export function pdfText(s: string): string {
  return s
    .replace(/[\u2212\u2013]/g, "-")
    .replace(/\u2014/g, " - ")
    .replace(/\u2192/g, "->")
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/\u2026/g, "...")
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, "")
    .replace(/[^\x00-\xFF]/g, "")
    .trim();
}

export function formatValue(v: number | null | undefined, format: "int" | "pct" | "dec1", locale: "es" | "en"): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const loc = locale === "es" ? "es-ES" : "en-US";
  if (format === "pct") return `${(v * 100).toLocaleString(loc, { maximumFractionDigits: 1 })}%`;
  if (format === "dec1") return v.toLocaleString(loc, { maximumFractionDigits: 1 });
  return Math.round(v).toLocaleString(loc);
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function setFill(doc: jsPDF, c: [number, number, number]) { doc.setFillColor(c[0], c[1], c[2]); }
function setText(doc: jsPDF, c: [number, number, number]) { doc.setTextColor(c[0], c[1], c[2]); }
function setDraw(doc: jsPDF, c: [number, number, number]) { doc.setDrawColor(c[0], c[1], c[2]); }

function header(doc: jsPDF, title: string, subtitle: string, first: boolean): number {
  const pageW = doc.internal.pageSize.getWidth();
  setFill(doc, NAVY);
  doc.rect(0, 0, pageW, first ? 36 : 14, "F");
  setFill(doc, TEAL);
  doc.rect(0, first ? 36 : 14, pageW, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(first ? 17 : 11);
  doc.setTextColor(255, 255, 255);
  doc.text(pdfText(title), MARGIN, first ? 15 : 9);
  if (first) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(205, 225, 235);
    const lines = doc.splitTextToSize(pdfText(subtitle), CONTENT_W - 40);
    doc.text(lines.slice(0, 2), MARGIN, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
    doc.text("WFM RESCUE", pageW - MARGIN, 9, { align: "right" });
    return 46;
  }
  return 22;
}

function drawKpis(doc: jsPDF, kpis: KpiCard[], y: number, locale: "es" | "en"): number {
  if (kpis.length === 0) return y;
  const cols = 3;
  const gap = 4;
  const w = (CONTENT_W - gap * (cols - 1)) / cols;
  const h = 25;
  let row = 0;
  kpis.forEach((k, i) => {
    const col = i % cols;
    if (col === 0 && i > 0) row++;
    const x = MARGIN + col * (w + gap);
    const top = y + row * (h + gap);
    setFill(doc, CARD);
    doc.roundedRect(x, top, w, h, 2, 2, "F");
    setFill(doc, rgb(TONE[k.tone ?? "neutral"]));
    doc.rect(x, top + 2, 1.2, h - 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    setText(doc, GRAY);
    doc.text(pdfText(k.label).toUpperCase(), x + 4, top + 6);
    doc.setFontSize(14);
    setText(doc, NAVY);
    doc.text(pdfText(k.value), x + 4, top + 14.5);
    if (k.note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      setText(doc, LIGHT_GRAY);
      const note = doc.splitTextToSize(pdfText(k.note), w - 8)[0] ?? "";
      doc.text(note, x + 4, top + 20.5);
    }
  });
  void locale;
  return y + (row + 1) * (h + gap) + 2;
}

const CHART_H = 92;

function drawChart(doc: jsPDF, c: ChartSpec, x: number, y: number, w: number, locale: "es" | "en") {
  // Title and legend
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, NAVY);
  doc.text(pdfText(c.title), x, y + 4);
  if (c.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    setText(doc, GRAY);
    doc.text(pdfText(c.subtitle), x, y + 9);
  }
  let lx = x;
  const ly = y + 14;
  doc.setFontSize(7.2);
  c.series.forEach((s) => {
    setFill(doc, rgb(s.color));
    doc.rect(lx, ly - 2.4, 3, 2.6, "F");
    setText(doc, GRAY);
    doc.setFont("helvetica", "normal");
    doc.text(pdfText(s.name), lx + 4.5, ly);
    lx += 4.5 + doc.getTextWidth(pdfText(s.name)) + 6;
  });
  if (c.target) {
    setDraw(doc, rgb(CHART.target));
    doc.setLineDashPattern([1.2, 1.2], 0);
    doc.line(lx, ly - 1.2, lx + 6, ly - 1.2);
    doc.setLineDashPattern([], 0);
    setText(doc, GRAY);
    doc.text(pdfText(c.target.label), lx + 7.5, ly);
  }

  // Plot area
  const left = x + 16;
  const plotW = w - 18;
  const top = y + 20;
  const plotH = CHART_H - 36;
  const n = Math.max(1, c.categories.length);
  const stackSum = (i: number) => c.series.filter((s) => s.kind !== "line").reduce((a, s) => a + (s.values[i] ?? 0), 0);
  let maxV = 0;
  let minV = 0;
  c.categories.forEach((_, i) => {
    if (c.stacked) maxV = Math.max(maxV, stackSum(i));
    c.series.forEach((s) => {
      const v = s.values[i];
      if (v !== null && v !== undefined && Number.isFinite(v)) {
        if (!c.stacked) maxV = Math.max(maxV, v);
        minV = Math.min(minV, v);
      }
    });
  });
  if (c.target) maxV = Math.max(maxV, c.target.value);
  if (c.format === "pct" && maxV <= 1.2) maxV = Math.max(maxV, 1);
  if (maxV <= 0) maxV = 1;
  maxV *= 1.08;
  const span = maxV - minV;
  const yOf = (v: number) => top + plotH - ((v - minV) / span) * plotH;

  // Grid and y labels
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  for (let t = 0; t <= 4; t++) {
    const v = minV + (span * t) / 4;
    const gy = yOf(v);
    setDraw(doc, [226, 232, 240]);
    doc.setLineWidth(0.15);
    doc.line(left, gy, left + plotW, gy);
    setText(doc, LIGHT_GRAY);
    doc.text(formatValue(v, c.format, locale), left - 2, gy + 1.2, { align: "right" });
  }

  // Bars
  const slot = plotW / n;
  const bars = c.series.filter((s) => s.kind !== "line");
  const groupW = slot * 0.72;
  c.categories.forEach((_, i) => {
    const gx = left + i * slot + (slot - groupW) / 2;
    if (c.stacked) {
      let base = 0;
      bars.forEach((s) => {
        const v = s.values[i] ?? 0;
        if (v <= 0) return;
        const y1 = yOf(base + v);
        const y0 = yOf(base);
        setFill(doc, rgb(s.color));
        doc.rect(gx, y1, groupW, y0 - y1, "F");
        base += v;
      });
    } else if (bars.length === 1 && c.barColors) {
      const v = bars[0].values[i];
      if (v !== null && v !== undefined && Number.isFinite(v)) {
        const y0 = yOf(Math.max(0, minV));
        const y1 = yOf(v);
        setFill(doc, rgb(c.barColors[i] ?? bars[0].color));
        doc.rect(gx, Math.min(y0, y1), groupW, Math.abs(y0 - y1), "F");
      }
    } else {
      const bw = groupW / Math.max(1, bars.length);
      bars.forEach((s, si) => {
        const v = s.values[i];
        if (v === null || v === undefined || !Number.isFinite(v)) return;
        const y0 = yOf(Math.max(0, minV));
        const y1 = yOf(v);
        setFill(doc, rgb(s.color));
        doc.rect(gx + si * bw, Math.min(y0, y1), bw * 0.9, Math.abs(y0 - y1), "F");
      });
    }
  });

  // Lines (broken at nulls)
  c.series.filter((s) => s.kind === "line").forEach((s) => {
    setDraw(doc, rgb(s.color));
    doc.setLineWidth(0.7);
    let prev: [number, number] | null = null;
    c.categories.forEach((_, i) => {
      const v = s.values[i];
      if (v === null || v === undefined || !Number.isFinite(v)) { prev = null; return; }
      const px = left + i * slot + slot / 2;
      const py = yOf(v);
      if (prev) doc.line(prev[0], prev[1], px, py);
      prev = [px, py];
    });
  });

  // Target line
  if (c.target) {
    setDraw(doc, rgb(CHART.target));
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([1.5, 1.2], 0);
    const ty = yOf(c.target.value);
    doc.line(left, ty, left + plotW, ty);
    doc.setLineDashPattern([], 0);
  }

  // X labels (thinned so they never overlap)
  const step = Math.ceil(n / 16);
  doc.setFontSize(6.2);
  setText(doc, LIGHT_GRAY);
  c.categories.forEach((cat, i) => {
    if (i % step !== 0) return;
    const cx = left + i * slot + slot / 2;
    doc.text(pdfText(cat).slice(0, 10), cx, top + plotH + 4.5, { align: "center" });
  });
  setDraw(doc, [180, 188, 198]);
  doc.setLineWidth(0.2);
  doc.line(left, top + plotH, left + plotW, top + plotH);
}

function ensureSpace(doc: jsPDF, y: number, need: number, title: string, subtitle: string): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - 18) {
    doc.addPage();
    return header(doc, title, subtitle, false) + 4;
  }
  return y;
}

/** Builds and downloads the PDF. Sections become tables after the charts. */
export function downloadReportPdf(r: ReportPdf) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = header(doc, r.title, r.subtitle, true) + 6;
  y = drawKpis(doc, r.kpis, y, r.locale);
  y += 2;

  for (const c of r.charts) {
    y = ensureSpace(doc, y, CHART_H + 4, r.title, r.subtitle);
    drawChart(doc, c, MARGIN, y, CONTENT_W, r.locale);
    y += CHART_H + 4;
  }

  for (const s of r.sections) {
    const headers = Array.from(new Set(s.rows.flatMap((row: ExportRow) => Object.keys(row))));
    y = ensureSpace(doc, y, 22, r.title, r.subtitle);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(doc, NAVY);
    doc.text(pdfText(s.title), MARGIN, y + 4);
    y += 7;
    if (headers.length === 0 || s.rows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setText(doc, GRAY);
      doc.text("—", MARGIN, y + 4);
      y += 10;
      continue;
    }
    const body = s.rows.slice(0, 1000).map((row) =>
      headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return "";
        if (typeof v === "number") return formatValue(v, Number.isInteger(v) ? "int" : "dec1", r.locale);
        return pdfText(String(v));
      }),
    );
    autoTable(doc, {
      startY: y,
      head: [headers.map((h) => pdfText(h))],
      body,
      margin: { left: MARGIN, right: MARGIN, bottom: 16 },
      styles: { fontSize: 6.8, cellPadding: 1.3, overflow: "linebreak", textColor: [40, 48, 58] },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 248, 251] },
    });
    const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    y = (last?.finalY ?? y) + 8;
    if (s.rows.length > 1000) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      setText(doc, GRAY);
      doc.text(r.locale === "es" ? `... ${s.rows.length - 1000} filas más: use CSV o XLSX.` : `... ${s.rows.length - 1000} more rows: use CSV or XLSX.`, MARGIN, y);
      y += 5;
    }
  }

  const pages = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const footer = r.locale === "es"
    ? "WFM Rescue · Datos procesados en el navegador · Demo ilustrativa"
    : "WFM Rescue · Data processed in your browser · Illustrative demo";
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    setDraw(doc, [220, 226, 234]);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pageH - 12, pageW - MARGIN, pageH - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(doc, LIGHT_GRAY);
    doc.text(footer, MARGIN, pageH - 7.5);
    doc.text(`${i} / ${pages}`, pageW - MARGIN, pageH - 7.5, { align: "right" });
  }
  doc.save(`${safeFileName(r.name)}-${todayStamp()}.pdf`);
}
