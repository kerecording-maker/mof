export type ReportPeriodType =
  | "quarterly"
  | "three_months"
  | "six_months"
  | "yearly"
  | "custom";

export type DateParts = {
  day: number;
  month: number;
  year: number;
};

export type ReportFilters = {
  department: string;
  budgetCategory: string;
  region: string;
  sector: string;
};

export type ReportConfig = {
  periodType: ReportPeriodType;
  from: DateParts;
  to: DateParts;
  sheetName: string;
  filters: ReportFilters;
  reportTitle: string;
};

export type PeriodTotals = {
  allocation: number;
  utilization: number;
  remaining: number;
  growthPct: number;
  variancePct: number;
};

export type ColumnComparisonRow = {
  column: string;
  previous: number;
  current: number;
  difference: number;
  changePct: number;
};

export type DepartmentShare = {
  name: string;
  allocation: number;
  utilization: number;
  sharePct: number;
};

/** One row in the cost center registry (same fields as the dashboard table). */
export type CostCenterReportRow = {
  ddoCode: string;
  costCenter: string;
  division: string;
  ccType: string;
  climateRelevance: string;
  budget: number;
  expenditure: number;
  utilizationPct: number;
};

/** Dashboard KPI cards — summed from filtered cost center entries. */
export type DashboardKpis = {
  totalBudget: number;
  expenditure: number;
  climateRelevantBudget: number;
  costCenterCount: number;
  divisionCount: number;
  utilizationPct: number;
  climateSharePct: number;
};

export type DivisionBudgetExp = {
  name: string;
  budget: number;
  expenditure: number;
};

export type CcTypeShare = {
  name: string;
  value: number;
  sharePct: number;
};

export type TrendPoint = {
  label: string;
  allocation: number;
  utilization: number;
};

export type ReportData = {
  generatedAt: Date;
  periodLabel: string;
  config: ReportConfig;
  executiveSummary: string;
  previous: PeriodTotals;
  current: PeriodTotals;
  columnComparisons: ColumnComparisonRow[];
  /** @deprecated use divisionBudgetExp — kept for compatibility */
  departmentShares: DepartmentShare[];
  kpis: DashboardKpis;
  topCostCenters: CostCenterReportRow[];
  divisionBudgetExp: DivisionBudgetExp[];
  ccTypeDistribution: CcTypeShare[];
  trend: TrendPoint[];
  insights: string[];
  comparesPeriods: boolean;
  /** Human-readable dataset line on the PDF cover (no file names). */
  sourceLabel: string;
  entryCount: number;
};
