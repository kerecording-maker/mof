import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { CcTypeShare, DivisionBudgetExp, ReportData } from "@/lib/report-types";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const FOOTER_Y = PAGE_H - 12;

const TEAL: [number, number, number] = [13, 115, 119];
const ORANGE: [number, number, number] = [230, 140, 40];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

function fmtMoney(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtPkr(n: number): string {
  return `PKR ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function addFooter(doc: jsPDF, page: number, total: number) {
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `Federal Budget Tagging · Cost Center Report · ${format(new Date(), "dd MMM yyyy HH:mm")}`,
    MARGIN,
    FOOTER_Y,
  );
  doc.text(`Page ${page} of ${total}`, PAGE_W - MARGIN, FOOTER_Y, { align: "right" });
}

/** Budget vs expenditure bars (matches dashboard chart). */
function drawDivisionBudgetExpChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  items: DivisionBudgetExp[],
) {
  if (!items.length) return;
  const max = Math.max(...items.flatMap((i) => [i.budget, i.expenditure]), 1);
  const groupW = w / items.length;
  const barW = Math.min(7, groupW / 2.8);

  doc.setFontSize(7);
  items.forEach((item, i) => {
    const gx = x + i * groupW + groupW / 2;
    const budgetH = (item.budget / max) * (h - 14);
    const expH = (item.expenditure / max) * (h - 14);
    doc.setFillColor(...TEAL);
    doc.rect(gx - barW - 1, y + h - budgetH - 10, barW, budgetH, "F");
    doc.setFillColor(...ORANGE);
    doc.rect(gx + 1, y + h - expH - 10, barW, expH, "F");
    doc.setTextColor(...SLATE);
    const lbl = item.name.length > 8 ? `${item.name.slice(0, 8)}…` : item.name;
    doc.text(lbl, gx, y + h - 2, { align: "center" });
  });
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("■ Budget", x, y - 2);
  doc.text("■ Expenditure", x + 28, y - 2);
}

function drawCcTypeLegend(doc: jsPDF, x: number, y: number, shares: CcTypeShare[]) {
  const colors: [number, number, number][] = [
    TEAL,
    [20, 140, 120],
    ORANGE,
    [120, 90, 200],
    [200, 80, 80],
    [80, 130, 200],
    [160, 160, 50],
    [90, 90, 90],
  ];
  doc.setFontSize(8);
  shares.slice(0, 8).forEach((s, i) => {
    const cy = y + i * 11;
    doc.setFillColor(...(colors[i % colors.length] ?? MUTED));
    doc.circle(x, cy - 1.5, 2.5, "F");
    doc.setTextColor(...SLATE);
    doc.text(`${s.name} — ${s.sharePct.toFixed(1)}%`, x + 6, cy);
  });
}

export function generateReportPdf(data: ReportData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const { kpis } = data;
  let page = 1;

  // —— Cover ——
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, PAGE_W, 52, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Federal Budget Tagging", MARGIN, 26);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("Cost Center Budget Report", MARGIN, 38);

  doc.setTextColor(...SLATE);
  doc.setFontSize(11);
  doc.text("Government of Pakistan · Ministry of Finance", MARGIN, 72);
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Reporting period: ${data.periodLabel}`, MARGIN, 82);
  doc.text(`Based on: ${data.sourceLabel}`, MARGIN, 90);
  doc.text(`Generated: ${format(data.generatedAt, "dd MMMM yyyy")}`, MARGIN, 98);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 108, PAGE_W - MARGIN, 108);
  doc.setFontSize(9);
  doc.text("CONFIDENTIAL — For official use only", MARGIN, 116);

  // —— Executive summary + dashboard KPIs ——
  doc.addPage();
  page++;
  doc.setFillColor(245, 248, 250);
  doc.rect(0, 0, PAGE_W, 22, "F");
  doc.setTextColor(...TEAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Executive Summary", MARGIN, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  const summaryLines = doc.splitTextToSize(data.executiveSummary, PAGE_W - MARGIN * 2);
  doc.text(summaryLines, MARGIN, 30);

  const kpiY = 30 + summaryLines.length * 5 + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Dashboard KPIs (from cost center registry)", MARGIN, kpiY);

  autoTable(doc, {
    startY: kpiY + 4,
    head: [["Metric", "Value"]],
    body: [
      ["Total Budget", `${fmtMoney(kpis.totalBudget)} (${fmtPkr(kpis.totalBudget)})`],
      ["Expenditure", `${fmtMoney(kpis.expenditure)} · Utilization ${kpis.utilizationPct.toFixed(1)}%`],
      [
        "Climate-Relevant Budget",
        `${fmtMoney(kpis.climateRelevantBudget)} · ${kpis.climateSharePct.toFixed(1)}% of total`,
      ],
      ["Cost Centers", String(kpis.costCenterCount)],
      ["Divisions / Funds", String(kpis.divisionCount)],
    ],
    theme: "grid",
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: SLATE },
    margin: { left: MARGIN, right: MARGIN },
  });

  // —— Top cost centers ——
  doc.addPage();
  page++;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...TEAL);
  doc.text("Top cost centers by budget", MARGIN, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    "Each row is one cost center entry (DDO + cost center name), same as the dashboard registry.",
    MARGIN,
    26,
  );

  autoTable(doc, {
    startY: 32,
    head: [["DDO", "Cost center", "Division", "Budget", "Expenditure", "Util %", "Climate", "CC Type"]],
    body: data.topCostCenters.map((r) => [
      r.ddoCode,
      r.costCenter.length > 36 ? `${r.costCenter.slice(0, 36)}…` : r.costCenter,
      r.division,
      fmtMoney(r.budget),
      fmtMoney(r.expenditure),
      `${r.utilizationPct.toFixed(0)}%`,
      r.climateRelevance,
      r.ccType,
    ]),
    theme: "striped",
    headStyles: { fillColor: TEAL, fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    margin: { left: MARGIN, right: MARGIN },
  });

  // —— Period comparison (if multi-year) ——
  if (data.comparesPeriods) {
    doc.addPage();
    page++;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...TEAL);
    doc.text("Period comparison (aggregated cost centers)", MARGIN, 18);

    autoTable(doc, {
      startY: 26,
      head: [["Metric", "Previous", "Current", "Difference", "Change %"]],
      body: data.columnComparisons.map((r) => [
        r.column,
        typeof r.previous === "number" && r.previous >= 1e6 ? fmtMoney(r.previous) : String(r.previous),
        typeof r.current === "number" && r.current >= 1e6 ? fmtMoney(r.current) : String(r.current),
        typeof r.difference === "number" && Math.abs(r.difference) >= 1e6
          ? fmtMoney(r.difference)
          : String(r.difference),
        `${r.changePct >= 0 ? "+" : ""}${r.changePct.toFixed(1)}%`,
      ]),
      theme: "striped",
      headStyles: { fillColor: TEAL, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  // —— Divisions chart + CC type distribution ——
  doc.addPage();
  page++;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...TEAL);
  doc.text("Charts (aggregated from cost centers)", MARGIN, 18);

  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text("Top divisions — Budget vs Expenditure", MARGIN, 28);
  drawDivisionBudgetExpChart(
    doc,
    MARGIN,
    32,
    PAGE_W - MARGIN * 2,
    48,
    data.divisionBudgetExp.slice(0, 8),
  );

  doc.text("Climate tag distribution (by CC type, climate-relevant budget)", MARGIN, 92);
  drawCcTypeLegend(doc, MARGIN, 98, data.ccTypeDistribution);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("AI recommendations", MARGIN, 168);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let iy = 176;
  data.insights.forEach((line, i) => {
    const wrapped = doc.splitTextToSize(`${i + 1}. ${line}`, PAGE_W - MARGIN * 2);
    doc.text(wrapped, MARGIN, iy);
    iy += wrapped.length * 4.5 + 2;
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (p > 1) addFooter(doc, p, totalPages);
  }

  return doc.output("blob");
}

export function downloadReportPdf(data: ReportData, fileName?: string) {
  const blob = generateReportPdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName ?? `MOF_Cost_Center_Report_${format(data.generatedAt, "yyyy-MM-dd")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function previewReportPdf(data: ReportData) {
  const blob = generateReportPdf(data);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
