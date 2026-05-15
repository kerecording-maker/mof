import { endOfMonth, format, isValid, startOfMonth, subMonths } from "date-fns";

import type { BudgetEntry } from "@/lib/budget-types";
import {
  columnNumericValues,
  findColumnByKeywords,
  getSheetMatrix,
  headerRow,
  type ParsedWorkbook,
  type SheetMatrix,
} from "@/lib/excel-workbook";
import { mean, pctChange, sum } from "@/lib/compare-stats";
import type {
  CcTypeShare,
  ColumnComparisonRow,
  CostCenterReportRow,
  DashboardKpis,
  DateParts,
  DepartmentShare,
  DivisionBudgetExp,
  PeriodTotals,
  ReportConfig,
  ReportData,
  ReportPeriodType,
  TrendPoint,
} from "@/lib/report-types";

export function datePartsToDate(p: DateParts): Date {
  const d = new Date(p.year, p.month - 1, p.day);
  return isValid(d) ? d : new Date();
}

export function formatDateParts(p: DateParts): string {
  return format(datePartsToDate(p), "dd MMM yyyy");
}

export function autoRangeForPeriod(type: ReportPeriodType): { from: DateParts; to: DateParts } {
  const to = new Date();
  const toParts: DateParts = {
    day: to.getDate(),
    month: to.getMonth() + 1,
    year: to.getFullYear(),
  };
  let monthsBack = 3;
  if (type === "three_months") monthsBack = 3;
  else if (type === "six_months") monthsBack = 6;
  else if (type === "yearly") monthsBack = 12;
  else if (type === "quarterly") monthsBack = 3;
  else return { from: toParts, to: toParts };

  const fromDate = startOfMonth(subMonths(endOfMonth(to), monthsBack - 1));
  return {
    from: {
      day: fromDate.getDate(),
      month: fromDate.getMonth() + 1,
      year: fromDate.getFullYear(),
    },
    to: toParts,
  };
}

/** Date range aligned to years present in the cost center registry (not wall-clock today). */
export function autoRangeForEntries(
  entries: BudgetEntry[],
  type: ReportPeriodType,
): { from: DateParts; to: DateParts } {
  const years = [...new Set(entries.map((e) => e.year))].filter(Number.isFinite).sort((a, b) => a - b);
  if (!years.length) return autoRangeForPeriod(type);

  const minY = years[0];
  const maxY = years[years.length - 1];
  const fullRange = {
    from: { day: 1, month: 1, year: minY },
    to: { day: 31, month: 12, year: maxY },
  };

  if (type === "dashboard" || years.length === 1) return fullRange;

  if (type === "custom") return fullRange;

  const targetYear = maxY;
  return {
    from: { day: 1, month: 1, year: targetYear },
    to: { day: 31, month: 12, year: targetYear },
  };
}

function rowInRange(
  row: unknown[],
  from: Date,
  to: Date,
  monthCol: number,
  yearCol: number,
): boolean {
  if (monthCol < 0 && yearCol < 0) return true;
  const y = yearCol >= 0 ? Number(row[yearCol]) : from.getFullYear();
  const m = monthCol >= 0 ? Number(row[monthCol]) : 1;
  if (!Number.isFinite(y) || !Number.isFinite(m)) return true;
  const d = new Date(y, m - 1, 15);
  return d >= startOfMonth(from) && d <= endOfMonth(to);
}

function matchesFilter(value: string, filter: string): boolean {
  if (!filter || filter === "all") return true;
  return value.toLowerCase().includes(filter.toLowerCase());
}

function filterMatrix(
  matrix: SheetMatrix,
  config: ReportConfig,
): SheetMatrix {
  if (!matrix.length) return matrix;
  const headers = headerRow(matrix);
  const deptCol = findColumnByKeywords(headers, ["department", "dept", "division"]);
  const headCol = findColumnByKeywords(headers, ["budget head", "head", "category"]);
  const regionCol = findColumnByKeywords(headers, ["region"]);
  const sectorCol = findColumnByKeywords(headers, ["sector"]);
  const monthCol = findColumnByKeywords(headers, ["month"]);
  const yearCol = findColumnByKeywords(headers, ["fiscal", "year", "fy"]);

  const from = datePartsToDate(config.from);
  const to = datePartsToDate(config.to);
  const { department, budgetCategory, region, sector } = config.filters;

  const out: SheetMatrix = [matrix[0]];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!rowInRange(row, from, to, monthCol, yearCol)) continue;
    if (deptCol >= 0 && !matchesFilter(String(row[deptCol] ?? ""), department)) continue;
    if (headCol >= 0 && !matchesFilter(String(row[headCol] ?? ""), budgetCategory)) continue;
    if (regionCol >= 0 && !matchesFilter(String(row[regionCol] ?? ""), region)) continue;
    if (sectorCol >= 0 && !matchesFilter(String(row[sectorCol] ?? ""), sector)) continue;
    out.push(row);
  }
  return out.length > 1 ? out : matrix;
}

function totalsFromValues(allocation: number[], utilization: number[], remaining: number[]) {
  const alloc = sum(allocation);
  const util = sum(utilization);
  const rem = sum(remaining.length ? remaining : allocation.map((a, i) => a - (utilization[i] ?? 0)));
  return { allocation: alloc, utilization: util, remaining: rem };
}

function buildPeriodTotals(
  prevAlloc: number[],
  prevUtil: number[],
  prevRem: number[],
  curAlloc: number[],
  curUtil: number[],
  curRem: number[],
): { previous: PeriodTotals; current: PeriodTotals } {
  const previous = totalsFromValues(prevAlloc, prevUtil, prevRem);
  const current = totalsFromValues(curAlloc, curUtil, curRem);
  return {
    previous: {
      ...previous,
      growthPct: growthRate(prevAlloc, curAlloc),
      variancePct: pctChange(previous.utilization, current.utilization),
    },
    current: {
      ...current,
      growthPct: growthRate(prevAlloc, curAlloc),
      variancePct: pctChange(mean(prevUtil) || 0, mean(curUtil) || 0),
    },
  };
}

function growthRate(prev: number[], cur: number[]): number {
  const a = sum(prev);
  const b = sum(cur);
  return pctChange(a, b);
}

function splitRows(matrix: SheetMatrix): { prev: SheetMatrix; cur: SheetMatrix } {
  const data = matrix.slice(1);
  if (data.length < 2) {
    return { prev: [matrix[0], ...data], cur: [matrix[0], ...data] };
  }
  const mid = Math.floor(data.length / 2);
  return {
    prev: [matrix[0], ...data.slice(0, mid)],
    cur: [matrix[0], ...data.slice(mid)],
  };
}

function columnComparisons(matrix: SheetMatrix): ColumnComparisonRow[] {
  const headers = headerRow(matrix);
  const defs: { label: string; keywords: string[] }[] = [
    { label: "Allocated Budget", keywords: ["allocated", "allocation"] },
    { label: "Approved Budget", keywords: ["approved"] },
    { label: "Utilized Budget", keywords: ["utilized", "utilization", "expenditure"] },
    { label: "Remaining Budget", keywords: ["remaining", "balance"] },
    { label: "Variance", keywords: ["variance"] },
  ];
  const { prev, cur } = splitRows(matrix);
  return defs
    .map(({ label, keywords }) => {
      const col = findColumnByKeywords(headers, keywords);
      if (col < 0) return null;
      const p = sum(columnNumericValues(prev, col));
      const c = sum(columnNumericValues(cur, col));
      return {
        column: label,
        previous: p,
        current: c,
        difference: c - p,
        changePct: pctChange(p, c),
      };
    })
    .filter((x): x is ColumnComparisonRow => x !== null);
}

function departmentShares(matrix: SheetMatrix): DepartmentShare[] {
  const headers = headerRow(matrix);
  const deptCol = findColumnByKeywords(headers, ["department", "dept", "division"]);
  const allocCol = findColumnByKeywords(headers, ["allocated", "allocation"]);
  const utilCol = findColumnByKeywords(headers, ["utilized", "utilization", "expenditure"]);
  if (deptCol < 0 || allocCol < 0) return [];

  const map = new Map<string, { allocation: number; utilization: number }>();
  for (let r = 1; r < matrix.length; r++) {
    const name = String(matrix[r][deptCol] ?? "Unknown").trim() || "Unknown";
    const a = Number(matrix[r][allocCol]) || 0;
    const u = utilCol >= 0 ? Number(matrix[r][utilCol]) || 0 : 0;
    const cur = map.get(name) ?? { allocation: 0, utilization: 0 };
    cur.allocation += a;
    cur.utilization += u;
    map.set(name, cur);
  }
  const total = sum([...map.values()].map((v) => v.allocation));
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      allocation: v.allocation,
      utilization: v.utilization,
      sharePct: total ? (v.allocation / total) * 100 : 0,
    }))
    .sort((a, b) => b.allocation - a.allocation)
    .slice(0, 8);
}

function trendFromMatrix(matrix: SheetMatrix): TrendPoint[] {
  const headers = headerRow(matrix);
  const monthCol = findColumnByKeywords(headers, ["month"]);
  const allocCol = findColumnByKeywords(headers, ["allocated", "allocation"]);
  const utilCol = findColumnByKeywords(headers, ["utilized", "utilization"]);
  if (monthCol < 0 || allocCol < 0) return [];

  const map = new Map<string, { allocation: number; utilization: number }>();
  for (let r = 1; r < matrix.length; r++) {
    const label = `M${matrix[r][monthCol]}`;
    const a = Number(matrix[r][allocCol]) || 0;
    const u = utilCol >= 0 ? Number(matrix[r][utilCol]) || 0 : 0;
    const cur = map.get(label) ?? { allocation: 0, utilization: 0 };
    cur.allocation += a;
    cur.utilization += u;
    map.set(label, cur);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

export function buildDashboardKpis(entries: BudgetEntry[]): DashboardKpis {
  const totalBudget = sum(entries.map((e) => e.originalBudget));
  const expenditure = sum(entries.map((e) => e.expenditure));
  const climateRelevantBudget = sum(entries.map((e) => e.relevantCCBE));
  return {
    totalBudget,
    expenditure,
    climateRelevantBudget,
    costCenterCount: entries.length,
    divisionCount: new Set(entries.map((e) => e.description).filter(Boolean)).size,
    utilizationPct: totalBudget ? (expenditure / totalBudget) * 100 : 0,
    climateSharePct: totalBudget ? (climateRelevantBudget / totalBudget) * 100 : 0,
  };
}

function buildTopCostCenters(entries: BudgetEntry[], limit = 12): CostCenterReportRow[] {
  return [...entries]
    .sort((a, b) => b.originalBudget - a.originalBudget)
    .slice(0, limit)
    .map((e) => ({
      ddoCode: e.ddoCode || "—",
      costCenter: e.costCenter || "—",
      division:
        e.description.length > 32 ? `${e.description.slice(0, 32)}…` : e.description || "—",
      ccType: e.ccType || "—",
      climateRelevance: e.ccRelevance || "—",
      budget: e.originalBudget,
      expenditure: e.expenditure,
      utilizationPct: e.originalBudget ? (e.expenditure / e.originalBudget) * 100 : 0,
    }));
}

function buildDivisionBudgetExp(entries: BudgetEntry[], limit = 10): DivisionBudgetExp[] {
  const map = new Map<string, { budget: number; expenditure: number }>();
  for (const e of entries) {
    const name = e.description || "Unknown";
    const cur = map.get(name) ?? { budget: 0, expenditure: 0 };
    cur.budget += e.originalBudget;
    cur.expenditure += e.expenditure;
    map.set(name, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      name: name.length > 28 ? `${name.slice(0, 28)}…` : name,
      budget: v.budget,
      expenditure: v.expenditure,
    }))
    .sort((a, b) => b.budget - a.budget)
    .slice(0, limit);
}

function buildCcTypeDistribution(entries: BudgetEntry[]): CcTypeShare[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.ccType && e.relevantCCBE > 0) {
      map.set(e.ccType, (map.get(e.ccType) || 0) + e.relevantCCBE);
    }
  }
  const total = sum([...map.values()]);
  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      value,
      sharePct: total ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function generateExecutiveSummary(
  data: Omit<ReportData, "executiveSummary" | "insights">,
): string {
  const { kpis, topCostCenters, divisionBudgetExp, comparesPeriods } = data;
  const topCc = topCostCenters[0];
  const topDiv = divisionBudgetExp[0];

  let text = `This report is built from ${kpis.costCenterCount.toLocaleString()} cost center entries (${kpis.divisionCount} divisions) in the Federal Budget Dashboard registry for ${data.periodLabel}. `;
  text += `Total budget is ${fmtCompact(kpis.totalBudget)} PKR with ${kpis.utilizationPct.toFixed(1)}% utilization and ${kpis.climateSharePct.toFixed(1)}% climate-relevant allocation. `;

  if (comparesPeriods) {
    const g = data.current.growthPct;
    const dir = g >= 0 ? "increased" : "decreased";
    text += `Compared to the prior period in this range, aggregate budget ${dir} by ${Math.abs(g).toFixed(1)}%. `;
  }

  if (topCc) {
    text += `Largest cost center by budget: ${topCc.ddoCode} (${fmtCompact(topCc.budget)} PKR). `;
  }
  if (topDiv) {
    text += `${topDiv.name} leads divisions with ${fmtCompact(topDiv.budget)} PKR budget.`;
  }
  return text.trim();
}

function fmtCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function generateInsights(data: {
  kpis: DashboardKpis;
  topCostCenters: CostCenterReportRow[];
  divisionBudgetExp: DivisionBudgetExp[];
  comparesPeriods: boolean;
  current: PeriodTotals;
}): string[] {
  const insights: string[] = [];
  const { kpis } = data;

  if (kpis.utilizationPct < 75) {
    insights.push(
      `Across ${kpis.costCenterCount.toLocaleString()} cost centers, overall utilization is ${kpis.utilizationPct.toFixed(1)}% — significant budget remains unspent.`,
    );
  }

  const underused = data.topCostCenters.filter(
    (cc) => cc.budget > 0 && cc.utilizationPct < 50,
  );
  if (underused.length >= 3) {
    insights.push(
      `${underused.length} of the top cost centers show utilization below 50% — candidates for execution review.`,
    );
  }

  for (const d of data.divisionBudgetExp.slice(0, 3)) {
    if (d.budget > 0 && d.expenditure / d.budget < 0.7) {
      insights.push(
        `${d.name}: division-level utilization ${((d.expenditure / d.budget) * 100).toFixed(0)}% across its cost centers.`,
      );
    }
  }

  if (kpis.climateSharePct < 2) {
    insights.push(
      `Climate-relevant budget is ${kpis.climateSharePct.toFixed(1)}% of total — review tagging on high-spend cost centers.`,
    );
  }

  if (data.comparesPeriods && data.current.growthPct > 8) {
    insights.push("Period-over-period budget growth exceeds 8% — validate new cost center allocations.");
  }

  if (!insights.length) {
    insights.push(
      `Cost center execution is stable across ${kpis.costCenterCount.toLocaleString()} registry entries.`,
    );
  }
  return insights.slice(0, 5);
}

export function buildReportFromWorkbook(
  wb: ParsedWorkbook,
  config: ReportConfig,
): ReportData {
  const matrix = filterMatrix(getSheetMatrix(wb, config.sheetName), config);
  const headers = headerRow(matrix);
  const allocCol = findColumnByKeywords(headers, ["allocated", "allocation", "original budget", "budget"]);
  const utilCol = findColumnByKeywords(headers, ["utilized", "utilization", "expenditure"]);
  const remCol = findColumnByKeywords(headers, ["remaining", "balance"]);

  const { prev, cur } = splitRows(matrix);
  const { previous, current } = buildPeriodTotals(
    columnNumericValues(prev, allocCol),
    columnNumericValues(prev, utilCol),
    columnNumericValues(prev, remCol),
    columnNumericValues(cur, allocCol),
    columnNumericValues(cur, utilCol),
    columnNumericValues(cur, remCol),
  );

  const periodLabel = `${formatDateParts(config.from)} – ${formatDateParts(config.to)}`;
  const base = {
    generatedAt: new Date(),
    periodLabel,
    config,
    previous,
    current,
    columnComparisons: columnComparisons(matrix),
    departmentShares: departmentShares(matrix),
    trend: trendFromMatrix(matrix),
    sourceLabel: wb.fileName,
    entryCount: Math.max(0, matrix.length - 1),
    kpis: {
      totalBudget: 0,
      expenditure: 0,
      climateRelevantBudget: 0,
      costCenterCount: 0,
      divisionCount: 0,
      utilizationPct: 0,
      climateSharePct: 0,
    },
    topCostCenters: [],
    divisionBudgetExp: [],
    ccTypeDistribution: [],
    comparesPeriods: false,
  };
  const executiveSummary = generateExecutiveSummary(base);
  const insights = generateInsights(base);
  return { ...base, executiveSummary, insights };
}

export function extractFilterOptionsFromEntries(entries: BudgetEntry[]) {
  const uniq = (values: string[]) => [...new Set(values.filter(Boolean))].sort();
  return {
    divisions: uniq(entries.map((e) => e.description)),
    ccTypes: uniq(entries.map((e) => e.ccType)),
    climateOptions: ["Yes", "No"] as const,
    subFunctions: uniq(entries.map((e) => e.subFunction)).slice(0, 80),
  };
}

/** Build report from the same cost-center registry shown on the dashboard. */
export function buildReportFromBudgetEntries(
  entries: BudgetEntry[],
  config: ReportConfig,
): ReportData {
  const { department, budgetCategory, region, sector } = config.filters;

  let filtered = entries;

  if (!config.useDashboardView) {
    const fromYear = config.from.year;
    const toYear = config.to.year;
    filtered = filtered.filter((e) => e.year >= fromYear && e.year <= toYear);
  }

  if (department !== "all") {
    filtered = filtered.filter((e) => e.description === department);
  }
  if (budgetCategory !== "all") {
    filtered = filtered.filter((e) => e.ccType === budgetCategory);
  }
  if (region !== "all") {
    filtered = filtered.filter((e) => e.ccRelevance === region);
  }
  if (sector !== "all") {
    filtered = filtered.filter((e) => e.subFunction === sector);
  }

  if (!filtered.length) {
    throw new Error(
      "No cost centers match the selected filters. Change dashboard filters or report options and try again.",
    );
  }

  const years = [...new Set(filtered.map((e) => e.year))].sort((a, b) => a - b);
  let prevRows: BudgetEntry[];
  let curRows: BudgetEntry[];
  if (years.length >= 2) {
    const prevYear = years[0];
    const curYear = years[years.length - 1];
    prevRows = filtered.filter((e) => e.year === prevYear);
    curRows = filtered.filter((e) => e.year === curYear);
  } else {
    const mid = Math.max(1, Math.floor(filtered.length / 2));
    prevRows = filtered.slice(0, mid);
    curRows = filtered.slice(mid);
  }

  const sumField = (rows: BudgetEntry[], fn: (e: BudgetEntry) => number) =>
    rows.reduce((s, e) => s + fn(e), 0);

  const previous: PeriodTotals = {
    allocation: sumField(prevRows, (e) => e.originalBudget),
    utilization: sumField(prevRows, (e) => e.expenditure),
    remaining: sumField(prevRows, (e) => e.originalBudget - e.expenditure),
    growthPct: 0,
    variancePct: 0,
  };
  const current: PeriodTotals = {
    allocation: sumField(curRows, (e) => e.originalBudget),
    utilization: sumField(curRows, (e) => e.expenditure),
    remaining: sumField(curRows, (e) => e.originalBudget - e.expenditure),
    growthPct: pctChange(previous.allocation, sumField(curRows, (e) => e.originalBudget)),
    variancePct: pctChange(previous.utilization, sumField(curRows, (e) => e.expenditure)),
  };
  previous.growthPct = current.growthPct;
  previous.variancePct = current.variancePct;

  const comparesPeriods = years.length >= 2;
  const kpis = buildDashboardKpis(filtered);
  const topCostCenters = buildTopCostCenters(filtered);
  const divisionBudgetExp = buildDivisionBudgetExp(filtered);
  const ccTypeDistribution = buildCcTypeDistribution(filtered);

  const departmentShares: DepartmentShare[] = divisionBudgetExp.map((d) => {
    const total = kpis.totalBudget;
    return {
      name: d.name,
      allocation: d.budget,
      utilization: d.expenditure,
      sharePct: total ? (d.budget / total) * 100 : 0,
    };
  });

  const columnComparisons: ColumnComparisonRow[] = comparesPeriods
    ? [
        {
          column: "Total Budget (all cost centers)",
          previous: previous.allocation,
          current: current.allocation,
          difference: current.allocation - previous.allocation,
          changePct: pctChange(previous.allocation, current.allocation),
        },
        {
          column: "Expenditure",
          previous: previous.utilization,
          current: current.utilization,
          difference: current.utilization - previous.utilization,
          changePct: pctChange(previous.utilization, current.utilization),
        },
        {
          column: "Climate-Relevant Budget",
          previous: sumField(prevRows, (e) => e.relevantCCBE),
          current: sumField(curRows, (e) => e.relevantCCBE),
          difference:
            sumField(curRows, (e) => e.relevantCCBE) - sumField(prevRows, (e) => e.relevantCCBE),
          changePct: pctChange(
            sumField(prevRows, (e) => e.relevantCCBE),
            sumField(curRows, (e) => e.relevantCCBE),
          ),
        },
        {
          column: "Cost center count",
          previous: prevRows.length,
          current: curRows.length,
          difference: curRows.length - prevRows.length,
          changePct: pctChange(prevRows.length, curRows.length),
        },
      ]
    : [
        {
          column: "Total Budget",
          previous: kpis.totalBudget,
          current: kpis.totalBudget,
          difference: 0,
          changePct: 0,
        },
        {
          column: "Expenditure",
          previous: kpis.expenditure,
          current: kpis.expenditure,
          difference: 0,
          changePct: 0,
        },
        {
          column: "Climate-Relevant Budget",
          previous: kpis.climateRelevantBudget,
          current: kpis.climateRelevantBudget,
          difference: 0,
          changePct: 0,
        },
        {
          column: "Cost centers",
          previous: kpis.costCenterCount,
          current: kpis.costCenterCount,
          difference: 0,
          changePct: 0,
        },
      ];

  const trendMap = new Map<string, { allocation: number; utilization: number }>();
  for (const e of filtered) {
    const key = String(e.year);
    const cur = trendMap.get(key) ?? { allocation: 0, utilization: 0 };
    cur.allocation += e.originalBudget;
    cur.utilization += e.expenditure;
    trendMap.set(key, cur);
  }
  const trend: TrendPoint[] = [...trendMap.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  const periodLabel = config.useDashboardView
    ? `Dashboard snapshot · ${format(new Date(), "dd MMM yyyy HH:mm")}`
    : `${formatDateParts(config.from)} – ${formatDateParts(config.to)}`;
  const base = {
    generatedAt: new Date(),
    periodLabel,
    config,
    previous,
    current,
    columnComparisons,
    departmentShares,
    kpis,
    topCostCenters,
    divisionBudgetExp,
    ccTypeDistribution,
    trend,
    comparesPeriods,
    sourceLabel: `Cost center registry · ${filtered.length.toLocaleString()} entries · ${kpis.divisionCount} divisions`,
    entryCount: filtered.length,
  };
  return {
    ...base,
    executiveSummary: generateExecutiveSummary(base),
    insights: generateInsights(base),
  };
}

export function extractFilterOptions(matrix: SheetMatrix): {
  departments: string[];
  categories: string[];
  regions: string[];
  sectors: string[];
} {
  const headers = headerRow(matrix);
  const pick = (keywords: string[]) => {
    const col = findColumnByKeywords(headers, keywords);
    if (col < 0) return [];
    const set = new Set<string>();
    for (let r = 1; r < matrix.length; r++) {
      const v = String(matrix[r][col] ?? "").trim();
      if (v) set.add(v);
    }
    return [...set].sort();
  };
  return {
    departments: pick(["department", "dept", "division"]),
    categories: pick(["budget head", "head", "category"]),
    regions: pick(["region"]),
    sectors: pick(["sector"]),
  };
}
