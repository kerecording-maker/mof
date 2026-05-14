import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  GitCompareArrows,
  Lightbulb,
  Minus,
  RotateCcw,
  Search,
  Sparkles,
  Table2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  growthRatePercent,
  mean,
  median,
  minMax,
  pctChange,
  stdevSample,
  sum,
  variancePopulation,
} from "@/lib/compare-stats";
import {
  columnNumericValues,
  columnStringValues,
  findColumnByKeywords,
  getSheetMatrix,
  headerRow,
  parseExcelWorkbook,
  type ParsedWorkbook,
  type SheetMatrix,
} from "@/lib/excel-workbook";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const FULLSCREEN =
  "fixed inset-0 left-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 duration-200 " +
  "shadow-[0_0_0_1px_oklch(0_0_0/0.06),0_40px_100px_-20px_oklch(0.25_0.05_260/0.45),0_80px_160px_-40px_oklch(0.35_0.08_200/0.25)] " +
  "dark:shadow-[0_0_0_1px_oklch(1_0_0/0.08),0_40px_100px_-20px_oklch(0_0_0/0.75),0_80px_160px_-40px_oklch(0_0_0/0.5)] " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-none";

const CHART_COLORS = [
  "oklch(0.5 0.14 175)",
  "oklch(0.65 0.14 75)",
  "oklch(0.55 0.18 280)",
  "oklch(0.55 0.16 25)",
  "oklch(0.6 0.12 140)",
];

type CompareColumnDef = {
  id: string;
  label: string;
  keywords: string[];
};

const COMPARE_CANONICAL: CompareColumnDef[] = [
  { id: "department", label: "Department", keywords: ["department", "dept", "division"] },
  { id: "budget_head", label: "Budget Head", keywords: ["budget head", "head", "function"] },
  { id: "allocated", label: "Allocated Budget", keywords: ["allocated", "allocation budget"] },
  { id: "approved", label: "Approved Budget", keywords: ["approved"] },
  {
    id: "utilized",
    label: "Utilized Budget",
    keywords: ["utilized", "utilisation", "utilization", "expenditure"],
  },
  { id: "remaining", label: "Remaining Budget", keywords: ["remaining", "balance"] },
  { id: "target", label: "Target", keywords: ["target"] },
  { id: "actual", label: "Actual Spend", keywords: ["actual"] },
  { id: "variance", label: "Variance", keywords: ["variance", "var %"] },
  { id: "month", label: "Month", keywords: ["month"] },
  { id: "quarter", label: "Quarter", keywords: ["quarter", "qtr"] },
  { id: "fiscal_year", label: "Fiscal Year", keywords: ["fiscal", "year", "fy"] },
];

function createDemoPair(): [ParsedWorkbook, ParsedWorkbook] {
  const h = [
    "Department",
    "Budget Head",
    "Allocated Budget",
    "Approved Budget",
    "Utilized Budget",
    "Remaining Budget",
    "Target",
    "Actual Spend",
    "Variance",
    "Month",
    "Quarter",
    "Fiscal Year",
  ];
  const depts = [
    "Health",
    "Education",
    "Infrastructure",
    "Agriculture",
    "Transport",
    "Defense",
    "ICT",
    "Climate",
  ];
  const rows2024: SheetMatrix = [h];
  const rows2025: SheetMatrix = [h];
  depts.forEach((d, i) => {
    const alloc = 80 + i * 18;
    const appr = alloc * 0.97;
    const util = Math.round(alloc * (0.68 + (i % 4) * 0.04));
    const rem = alloc - util;
    const tgt = alloc * 0.82;
    const act = util * 1.03;
    const vari = (act - tgt) / tgt;
    rows2024.push([
      d,
      `${d} program`,
      alloc,
      appr,
      util,
      rem,
      tgt,
      act,
      vari,
      (i % 12) + 1,
      `Q${(i % 4) + 1}`,
      2024,
    ]);
    const alloc2 = alloc * 1.1;
    const util2 = Math.round(util * 1.12);
    const rem2 = alloc2 - util2;
    const tgt2 = alloc2 * 0.84;
    const act2 = util2 * 1.04;
    const vari2 = (act2 - tgt2) / tgt2;
    rows2025.push([
      d,
      `${d} program`,
      alloc2,
      alloc2 * 0.98,
      util2,
      rem2,
      tgt2,
      act2,
      vari2,
      (i % 12) + 1,
      `Q${(i % 4) + 1}`,
      2025,
    ]);
  });
  return [
    { fileName: "FY2024_Demo.xlsx", sheets: [{ name: "Budget", rows: rows2024 }] },
    { fileName: "FY2025_Demo.xlsx", sheets: [{ name: "Budget", rows: rows2025 }] },
  ];
}

function suggestColumnsFromQuery(q: string): string[] {
  const s = q.toLowerCase();
  const out = new Set<string>();
  if (/allocat|allocation/.test(s)) out.add("allocated");
  if (/approv/.test(s)) out.add("approved");
  if (/util|spend|expend/.test(s)) out.add("utilized");
  if (/remain|balance/.test(s)) out.add("remaining");
  if (/variance|var\b/.test(s)) out.add("variance");
  if (/target/.test(s)) out.add("target");
  if (/actual/.test(s)) out.add("actual");
  if (/department|dept|division|sector/.test(s)) out.add("department");
  if (/budget head|head/.test(s)) out.add("budget_head");
  if (/month/.test(s)) out.add("month");
  if (/quarter|q[1-4]/.test(s)) out.add("quarter");
  if (/year|fiscal|fy/.test(s)) out.add("fiscal_year");
  if (/which column|most change|largest delta/.test(s)) {
    return ["allocated", "utilized", "variance"];
  }
  if (!out.size) return ["allocated", "utilized", "remaining"];
  return [...out];
}

function inferHealth(
  values: number[],
): "Stable" | "Increasing" | "Decreasing" | "Abnormal" | "Missing Data" | "Outlier Detected" {
  const valid = values.filter(Number.isFinite);
  if (valid.length < 2) return "Missing Data";
  const missingRatio = 1 - valid.length / values.length;
  if (missingRatio > 0.25) return "Missing Data";
  const cv = Math.abs(mean(valid)) < 1e-9 ? 0 : stdevSample(valid) / Math.abs(mean(valid));
  if (cv > 0.45) return "Outlier Detected";
  const g = growthRatePercent(valid);
  if (g > 8) return "Increasing";
  if (g < -8) return "Decreasing";
  if (Math.abs(g) > 25) return "Abnormal";
  return "Stable";
}

function healthBadgeVariant(
  h: ReturnType<typeof inferHealth>,
): "default" | "secondary" | "destructive" | "outline" {
  if (h === "Increasing") return "default";
  if (h === "Decreasing" || h === "Abnormal") return "destructive";
  if (h === "Outlier Detected") return "secondary";
  return "outline";
}

type ColumnAnalysis = {
  id: string;
  label: string;
  meanA: number;
  meanB: number;
  diff: number;
  pct: number;
  healthA: ReturnType<typeof inferHealth>;
  healthB: ReturnType<typeof inferHealth>;
  statsA: {
    total: number;
    avg: number;
    med: number;
    min: number;
    max: number;
    stdev: number;
    var: number;
    growth: number;
  };
  statsB: {
    total: number;
    avg: number;
    med: number;
    min: number;
    max: number;
    stdev: number;
    var: number;
    growth: number;
  };
  labels: string[];
  series: { label: string; a: number; b: number }[];
};

function buildColumnAnalysis(
  def: CompareColumnDef,
  matA: SheetMatrix,
  matB: SheetMatrix,
): ColumnAnalysis | null {
  const hA = headerRow(matA);
  const hB = headerRow(matB);
  const iA = findColumnByKeywords(hA, def.keywords);
  const iB = findColumnByKeywords(hB, def.keywords);
  if (iA < 0 || iB < 0) return null;
  const valsA = columnNumericValues(matA, iA);
  const valsB = columnNumericValues(matB, iB);
  const deptIdx = findColumnByKeywords(hA, ["department", "dept", "division"]);
  const labels =
    deptIdx >= 0
      ? columnStringValues(matA, deptIdx).slice(0, Math.min(valsA.length, valsB.length))
      : valsA.map((_, i) => `R${i + 1}`);
  const n = Math.min(valsA.length, valsB.length, labels.length);
  const aS = valsA.slice(0, n);
  const bS = valsB.slice(0, n);
  const meanA = mean(aS);
  const meanB = mean(bS);
  const mmA = minMax(aS);
  const mmB = minMax(bS);
  return {
    id: def.id,
    label: def.label,
    meanA,
    meanB,
    diff: meanB - meanA,
    pct: pctChange(meanA, meanB),
    healthA: inferHealth(aS),
    healthB: inferHealth(bS),
    statsA: {
      total: sum(aS),
      avg: meanA,
      med: median(aS),
      min: mmA.min,
      max: mmA.max,
      stdev: stdevSample(aS),
      var: variancePopulation(aS),
      growth: growthRatePercent(aS),
    },
    statsB: {
      total: sum(bS),
      avg: meanB,
      med: median(bS),
      min: mmB.min,
      max: mmB.max,
      stdev: stdevSample(bS),
      var: variancePopulation(bS),
      growth: growthRatePercent(bS),
    },
    labels: labels.slice(0, n),
    series: labels.slice(0, n).map((label, i) => ({ label, a: aS[i], b: bS[i] })),
  };
}

export function CompareModuleModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [pair, setPair] = useState<[ParsedWorkbook, ParsedWorkbook]>(() => createDemoPair());
  const [sheetA, setSheetA] = useState("Budget");
  const [sheetB, setSheetB] = useState("Budget");
  const [period, setPeriod] = useState("quarterly");
  const [nlQuery, setNlQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(["allocated", "utilized", "variance", "remaining"].map((id) => [id, true])),
  );
  const [chartTab, setChartTab] = useState<"pie" | "bar" | "line" | "donut" | "heatmap">("bar");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dataPanelOpen, setDataPanelOpen] = useState(false);

  const matA = useMemo(() => getSheetMatrix(pair[0], sheetA), [pair, sheetA]);
  const matB = useMemo(() => getSheetMatrix(pair[1], sheetB), [pair, sheetB]);

  const analyses = useMemo(() => {
    const out: ColumnAnalysis[] = [];
    for (const def of COMPARE_CANONICAL) {
      if (!selected[def.id]) continue;
      const a = buildColumnAnalysis(def, matA, matB);
      if (a) out.push(a);
    }
    return out;
  }, [matA, matB, selected]);

  const primary = analyses[0];

  const pieDept = useMemo(() => {
    const h = headerRow(matB);
    const dIdx = findColumnByKeywords(h, ["department", "dept", "division"]);
    const aIdx = findColumnByKeywords(h, ["allocated", "allocation"]);
    if (dIdx < 0 || aIdx < 0) return [];
    const labels = columnStringValues(matB, dIdx);
    const vals = columnNumericValues(matB, aIdx);
    const m = new Map<string, number>();
    labels.forEach((lab, i) => {
      const v = vals[i];
      if (!Number.isFinite(v)) return;
      m.set(lab, (m.get(lab) || 0) + v);
    });
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [matB]);

  const heatmap = useMemo(() => {
    const h = headerRow(matB);
    const dIdx = findColumnByKeywords(h, ["department", "dept", "division"]);
    const uIdx = findColumnByKeywords(h, ["utilized", "utilization"]);
    if (dIdx < 0 || uIdx < 0)
      return { rows: [] as string[], cols: [] as string[], grid: [] as number[][] };
    const depts = [...new Set(columnStringValues(matB, dIdx))].slice(0, 8);
    const qs = ["Q1", "Q2", "Q3", "Q4"];
    const qIdx = findColumnByKeywords(h, ["quarter"]);
    const grid = depts.map(() => qs.map(() => 0));
    const counts = depts.map(() => qs.map(() => 0));
    for (let r = 1; r < matB.length; r++) {
      const d = String(matB[r][dIdx] ?? "");
      const q = qIdx >= 0 ? String(matB[r][qIdx] ?? "") : "Q1";
      const u = Number(matB[r][uIdx]);
      if (!Number.isFinite(u)) continue;
      const di = depts.indexOf(d);
      const qi = qs.findIndex((x) => q.includes(x));
      if (di >= 0 && qi >= 0) {
        grid[di][qi] += u;
        counts[di][qi] += 1;
      }
    }
    for (let i = 0; i < depts.length; i++) {
      for (let j = 0; j < qs.length; j++) {
        if (counts[i][j]) grid[i][j] /= counts[i][j];
      }
    }
    return { rows: depts, cols: qs, grid };
  }, [matB]);

  const donutUtil = useMemo(() => {
    const h = headerRow(matB);
    const uIdx = findColumnByKeywords(h, ["utilized", "utilization"]);
    const aIdx = findColumnByKeywords(h, ["allocated", "allocation"]);
    if (uIdx < 0 || aIdx < 0)
      return [
        { name: "Utilized", value: 1 },
        { name: "Remaining", value: 1 },
      ];
    const u = sum(columnNumericValues(matB, uIdx));
    const a = sum(columnNumericValues(matB, aIdx));
    const rem = Math.max(0, a - u);
    return [
      { name: "Utilized", value: u },
      { name: "Remaining", value: rem },
    ];
  }, [matB]);

  const lineTrend = useMemo(() => {
    const h = headerRow(matB);
    const mIdx = findColumnByKeywords(h, ["month"]);
    const uIdx = findColumnByKeywords(h, ["utilized", "utilization"]);
    if (mIdx < 0 || uIdx < 0) {
      return (
        analyses[0]?.series.map((s, i) => ({ t: `P${i + 1}`, baseline: s.a, current: s.b })) ?? []
      );
    }
    const map = new Map<number, { a: number[]; b: number[] }>();
    const n = Math.min(matA.length, matB.length);
    for (let r = 1; r < n; r++) {
      const month = Number(matA[r][mIdx]);
      if (!Number.isFinite(month)) continue;
      if (!map.has(month)) map.set(month, { a: [], b: [] });
      const ua = Number(matA[r][uIdx]);
      const ub = Number(matB[r][uIdx]);
      if (Number.isFinite(ua)) map.get(month)!.a.push(ua);
      if (Number.isFinite(ub)) map.get(month)!.b.push(ub);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([m, v]) => ({
        t: `M${m}`,
        baseline: mean(v.a.length ? v.a : [0]),
        current: mean(v.b.length ? v.b : [0]),
      }));
  }, [matA, matB, analyses]);

  const insights = useMemo(() => {
    const lines: string[] = [];
    if (primary) {
      const dir = primary.pct >= 0 ? "increased" : "decreased";
      lines.push(
        `${primary.label} ${dir} by ${Math.abs(primary.pct).toFixed(1)}% comparing Dataset B to Dataset A (column means).`,
      );
    }
    const worst = [...analyses].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];
    if (worst) {
      lines.push(
        `Largest relative move: ${worst.label} (${worst.pct >= 0 ? "+" : ""}${worst.pct.toFixed(1)}%).`,
      );
    }
    lines.push(
      "Tip: upload two Excel files with aligned headers to replace demo data. SheetJS parses sheets in-browser.",
    );
    return lines;
  }, [analyses, primary]);

  const applyNl = () => {
    const ids = suggestColumnsFromQuery(nlQuery);
    const next: Record<string, boolean> = {};
    COMPARE_CANONICAL.forEach((c) => {
      next[c.id] = ids.includes(c.id);
    });
    setSelected(next);
  };

  const loadFile = useCallback(async (file: File, slot: 0 | 1) => {
    const wb = await parseExcelWorkbook(file);
    setPair((p) => {
      const copy: [ParsedWorkbook, ParsedWorkbook] = [p[0], p[1]];
      copy[slot] = wb;
      return copy;
    });
    const names = wb.sheets.map((s) => s.name);
    if (names.length) {
      if (slot === 0) setSheetA(names[0]);
      else setSheetB(names[0]);
    }
  }, []);

  const resetDemo = () => {
    setPair(createDemoPair());
    setSheetA("Budget");
    setSheetB("Budget");
  };

  const toggleCol = (id: string, checked: boolean) => {
    setSelected((s) => ({ ...s, [id]: checked }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={FULLSCREEN}>
        <DialogHeader className="shrink-0 space-y-1 border-b bg-muted/25 px-5 py-4 text-left md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <GitCompareArrows className="size-6 text-primary" />
            <DialogTitle className="text-xl font-bold tracking-tight md:text-2xl">
              AI Budget Comparison Engine
            </DialogTitle>
            <Badge variant="secondary" className="ml-auto gap-1">
              <Sparkles className="size-3" />
              Column-wise
            </Badge>
          </div>
          <DialogDescription className="text-sm md:text-base">
            Compare two sheets column-by-column: differences, statistics, health labels, and charts.
            Excel parsing uses SheetJS in the browser; heavy AI can call your API later.
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider delayDuration={250}>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:flex-row md:gap-4 md:p-5">
            <div className="relative flex min-h-0 shrink-0">
              <div
                className={cn(
                  "flex h-[min(100%,calc(100dvh-10rem))] w-14 shrink-0 flex-col items-center gap-1 border-r border-border/80 bg-muted/35 py-2 dark:bg-muted/25",
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded-lg"
                      onClick={() => setDataPanelOpen(true)}
                      aria-label="Search and filters"
                    >
                      <Filter className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Search & sheets</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded-lg"
                      onClick={() => setDataPanelOpen(true)}
                      aria-label="Dataset A"
                    >
                      <span className="relative inline-flex">
                        <Table2 className="size-5" />
                        <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[0.55rem] font-bold leading-none text-primary-foreground">
                          A
                        </span>
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Dataset A (baseline)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded-lg"
                      onClick={() => setDataPanelOpen(true)}
                      aria-label="Dataset B"
                    >
                      <span className="relative inline-flex">
                        <Table2 className="size-5 opacity-80" />
                        <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-amber-600 text-[0.55rem] font-bold leading-none text-white">
                          B
                        </span>
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Dataset B (current)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded-lg text-muted-foreground"
                      onClick={resetDemo}
                      aria-label="Reset demo workbooks"
                    >
                      <RotateCcw className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Reset demo workbooks</TooltipContent>
                </Tooltip>
                <div className="min-h-2 flex-1" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="size-10 shrink-0 rounded-full border border-border shadow-md"
                      onClick={() => setDataPanelOpen((o) => !o)}
                      aria-expanded={dataPanelOpen}
                      aria-label={dataPanelOpen ? "Collapse data panel" : "Expand data panel"}
                    >
                      {dataPanelOpen ? (
                        <ChevronLeft className="size-5" />
                      ) : (
                        <ChevronRight className="size-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {dataPanelOpen ? "Collapse panel" : "Expand filters & datasets"}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div
                className={cn(
                  "h-[min(100%,calc(100dvh-10rem))] overflow-hidden border-r border-border/60 bg-card/95 transition-[width,opacity] duration-300 ease-out dark:bg-card/85",
                  dataPanelOpen
                    ? "w-[min(92vw,20rem)] opacity-100"
                    : "pointer-events-none w-0 opacity-0",
                )}
              >
                <ScrollArea className="h-full">
                  <div className="flex min-w-[260px] flex-col gap-3 p-3">
                    <FilterStrip
                      period={period}
                      setPeriod={setPeriod}
                      sheetA={sheetA}
                      setSheetA={setSheetA}
                      sheetB={sheetB}
                      setSheetB={setSheetB}
                      pair={pair}
                      nlQuery={nlQuery}
                      setNlQuery={setNlQuery}
                      applyNl={applyNl}
                      customFrom={customFrom}
                      setCustomFrom={setCustomFrom}
                      customTo={customTo}
                      setCustomTo={setCustomTo}
                    />
                    <DatasetSlot
                      title="Dataset A (baseline)"
                      wb={pair[0]}
                      sheet={sheetA}
                      onSheetChange={setSheetA}
                      onFile={(f) => void loadFile(f, 0)}
                      matrix={matA}
                    />
                    <DatasetSlot
                      title="Dataset B (current)"
                      wb={pair[1]}
                      sheet={sheetB}
                      onSheetChange={setSheetB}
                      onFile={(f) => void loadFile(f, 1)}
                      matrix={matB}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={resetDemo}>
                      Reset demo workbooks
                    </Button>
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Center — column selection (fixed width so labels + subtitle are not squeezed) */}
            <div className="flex min-h-0 w-full flex-col gap-3 md:h-full md:w-[min(22rem,92vw)] md:max-w-[min(22rem,92vw)] md:shrink-0 md:flex-none">
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Columns to compare</CardTitle>
                  <CardDescription className="text-xs leading-snug text-pretty">
                    Multi-select metrics (matched by header keywords).
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[38vh] space-y-2 overflow-y-auto md:max-h-[calc(100dvh-22rem)]">
                  {COMPARE_CANONICAL.map((col) => (
                    <label
                      key={col.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 hover:bg-muted/60"
                    >
                      <Checkbox
                        className="shrink-0"
                        checked={!!selected[col.id]}
                        onCheckedChange={(v) => toggleCol(col.id, v === true)}
                      />
                      <span className="min-w-0 flex-1 text-sm leading-snug">{col.label}</span>
                    </label>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right — variance + charts + insights */}
            <ScrollArea className="min-h-[45vh] w-full flex-1 rounded-xl border border-border/70 bg-muted/10 md:min-h-0">
              <div className="space-y-4 p-4">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Variance cards (mean B vs mean A)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analyses.map((a) => (
                      <VarianceCard key={a.id} label={a.label} pct={a.pct} />
                    ))}
                  </div>
                </div>

                <Card className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Direct column match</CardTitle>
                    <CardDescription className="text-xs">
                      Aggregated column means · difference & trend
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Column</TableHead>
                          <TableHead>Health A</TableHead>
                          <TableHead>Health B</TableHead>
                          <TableHead className="text-right">Mean A</TableHead>
                          <TableHead className="text-right">Mean B</TableHead>
                          <TableHead className="text-right">Δ</TableHead>
                          <TableHead className="text-right">% change</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyses.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.label}</TableCell>
                            <TableCell>
                              <Badge
                                variant={healthBadgeVariant(a.healthA)}
                                className="text-[0.65rem]"
                              >
                                {a.healthA}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={healthBadgeVariant(a.healthB)}
                                className="text-[0.65rem]"
                              >
                                {a.healthB}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtNum(a.meanA)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtNum(a.meanB)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtNum(a.diff)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {a.pct.toFixed(2)}%
                            </TableCell>
                            <TableCell>
                              <TrendArrow pct={a.pct} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-border/80">
                  <Tabs
                    value={chartTab}
                    onValueChange={(v) => setChartTab(v as typeof chartTab)}
                    className="w-full"
                  >
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm">Visualizations</CardTitle>
                      <TabsList className="h-8 flex-wrap">
                        <TabsTrigger value="pie" className="text-xs">
                          Pie
                        </TabsTrigger>
                        <TabsTrigger value="bar" className="text-xs">
                          Bar
                        </TabsTrigger>
                        <TabsTrigger value="line" className="text-xs">
                          Line
                        </TabsTrigger>
                        <TabsTrigger value="donut" className="text-xs">
                          Donut
                        </TabsTrigger>
                        <TabsTrigger value="heatmap" className="text-xs">
                          Heatmap
                        </TabsTrigger>
                      </TabsList>
                    </CardHeader>
                    <CardContent className="h-64 md:h-72">
                      <TabsContent
                        value="pie"
                        className="m-0 h-full p-0 data-[state=inactive]:hidden"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieDept}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                            >
                              {pieDept.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Legend />
                            <RTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </TabsContent>
                      <TabsContent
                        value="bar"
                        className="m-0 h-full p-0 data-[state=inactive]:hidden"
                      >
                        {primary ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={primary.series} margin={{ left: 4, right: 4, top: 8 }}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="oklch(0.55 0.02 200 / 0.22)"
                              />
                              <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10 }}
                                interval={0}
                                angle={-25}
                                textAnchor="end"
                                height={70}
                              />
                              <YAxis tick={{ fontSize: 10 }} />
                              <RTooltip />
                              <Legend />
                              <Bar
                                dataKey="a"
                                name="Baseline (A)"
                                fill="oklch(0.5 0.12 250)"
                                radius={[2, 2, 0, 0]}
                              />
                              <Bar
                                dataKey="b"
                                name="Current (B)"
                                fill="oklch(0.5 0.14 165)"
                                radius={[2, 2, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Select at least one comparable numeric column.
                          </p>
                        )}
                      </TabsContent>
                      <TabsContent
                        value="line"
                        className="m-0 h-full p-0 data-[state=inactive]:hidden"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lineTrend} margin={{ left: 4, right: 4, top: 8 }}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="oklch(0.55 0.02 200 / 0.22)"
                            />
                            <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RTooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="baseline"
                              name="A"
                              stroke="oklch(0.5 0.14 250)"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="current"
                              name="B"
                              stroke="oklch(0.55 0.15 145)"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </TabsContent>
                      <TabsContent
                        value="donut"
                        className="m-0 h-full p-0 data-[state=inactive]:hidden"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutUtil}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={85}
                              paddingAngle={2}
                            >
                              {donutUtil.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Legend />
                            <RTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </TabsContent>
                      <TabsContent
                        value="heatmap"
                        className="m-0 h-full overflow-auto p-0 data-[state=inactive]:hidden"
                      >
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Utilization intensity by department × quarter (Dataset B)
                          </p>
                          <HeatmapGrid {...heatmap} />
                        </div>
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>

                <StatisticalSummaryCard analyses={analyses} />

                <Card className="border-primary/25 bg-primary/5">
                  <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
                    <Lightbulb className="size-4 text-primary" />
                    <CardTitle className="text-sm">AI-style insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {insights.map((line, i) => (
                      <p key={i}>• {line}</p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

function fmtNum(n: number) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(n % 1 === 0 ? 0 : 2);
}

function StatisticalSummaryCard({ analyses }: { analyses: ColumnAnalysis[] }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Statistical summary</CardTitle>
        <CardDescription className="text-xs">Per selected column · Dataset A vs B</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column</TableHead>
              <TableHead className="text-right">Total A</TableHead>
              <TableHead className="text-right">Total B</TableHead>
              <TableHead className="text-right">Avg A</TableHead>
              <TableHead className="text-right">Avg B</TableHead>
              <TableHead className="text-right">Med A</TableHead>
              <TableHead className="text-right">Med B</TableHead>
              <TableHead className="text-right">σ A</TableHead>
              <TableHead className="text-right">σ B</TableHead>
              <TableHead className="text-right">Var A</TableHead>
              <TableHead className="text-right">Var B</TableHead>
              <TableHead className="text-right">Growth A</TableHead>
              <TableHead className="text-right">Growth B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analyses.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.label}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(a.statsA.total)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(a.statsB.total)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(a.statsA.avg)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(a.statsB.avg)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(a.statsA.med)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(a.statsB.med)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(a.statsA.stdev)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(a.statsB.stdev)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(a.statsA.var)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(a.statsB.var)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {a.statsA.growth.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {a.statsB.growth.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TrendArrow({ pct }: { pct: number }) {
  if (pct > 0.5)
    return (
      <ArrowUpRight className="size-5 text-emerald-600 dark:text-emerald-400" aria-label="Up" />
    );
  if (pct < -0.5)
    return <ArrowDownRight className="size-5 text-red-600 dark:text-red-400" aria-label="Down" />;
  return <Minus className="size-5 text-amber-600 dark:text-amber-400" aria-label="Flat" />;
}

function VarianceCard({ label, pct }: { label: string; pct: number }) {
  const isUp = pct > 0.5;
  const isDown = pct < -0.5;
  const warn = !isUp && !isDown;
  return (
    <div
      className={cn(
        "min-w-[7.5rem] rounded-lg border px-3 py-2 shadow-sm",
        isUp && "border-emerald-500/40 bg-emerald-500/10",
        isDown && "border-red-500/40 bg-red-500/10",
        warn && "border-amber-500/40 bg-amber-500/10",
      )}
    >
      <div className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "text-lg font-bold tabular-nums",
          isUp && "text-emerald-700 dark:text-emerald-300",
          isDown && "text-red-700 dark:text-red-300",
          warn && "text-amber-800 dark:text-amber-200",
        )}
      >
        {pct >= 0 ? "+" : ""}
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

function HeatmapGrid({ rows, cols, grid }: { rows: string[]; cols: string[]; grid: number[][] }) {
  const flat = grid.flat().filter(Number.isFinite);
  const hi = flat.length ? Math.max(...flat) : 1;
  const lo = flat.length ? Math.min(...flat) : 0;
  const span = hi - lo || 1;
  const cell = (v: number) => {
    const t = (v - lo) / span;
    const hue = 25 + (1 - t) * 120;
    return { background: `oklch(${0.45 + t * 0.35} 0.12 ${hue})` };
  };
  if (!rows.length)
    return <p className="text-xs text-muted-foreground">Not enough columns for heatmap.</p>;
  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: `minmax(6rem,1fr) repeat(${cols.length}, minmax(3rem,1fr))` }}
      >
        <div />
        {cols.map((c) => (
          <div key={c} className="bg-muted/80 px-1 py-1 text-center text-[0.65rem] font-medium">
            {c}
          </div>
        ))}
        {rows.map((r, i) => (
          <Fragment key={`${i}-${r}`}>
            <div className="truncate bg-muted/50 px-1 py-1 text-[0.65rem] font-medium" title={r}>
              {r}
            </div>
            {cols.map((_, j) => (
              <div
                key={`${r}-${j}`}
                className="flex items-center justify-center rounded-sm text-[0.65rem] font-medium text-white shadow-inner"
                style={cell(grid[i]?.[j] ?? 0)}
                title={`${r} ${cols[j]}: ${(grid[i]?.[j] ?? 0).toFixed(0)}`}
              >
                {(grid[i]?.[j] ?? 0) > 0 ? Math.round(grid[i][j]) : ""}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function DatasetSlot({
  title,
  wb,
  sheet,
  onSheetChange,
  onFile,
  matrix,
}: {
  title: string;
  wb: ParsedWorkbook;
  sheet: string;
  onSheetChange: (s: string) => void;
  onFile: (f: File) => void;
  matrix: SheetMatrix;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = matrix.slice(0, 6);
  return (
    <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur-sm dark:bg-card/70">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xs font-semibold">{title}</CardTitle>
        <CardDescription className="truncate text-[0.7rem]">{wb.fileName}</CardDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <Select value={sheet} onValueChange={onSheetChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sheet" />
            </SelectTrigger>
            <SelectContent>
              {wb.sheets.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-3.5" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-h-36 overflow-auto p-2 text-[0.65rem] leading-tight">
        <table className="w-full border-collapse">
          <tbody>
            {preview.map((row, ri) => (
              <tr key={ri} className="border-b border-border/40">
                {row.slice(0, 5).map((cell, ci) => (
                  <td key={ci} className="max-w-[5.5rem] truncate px-1 py-0.5">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function FilterStrip({
  period,
  setPeriod,
  sheetA,
  setSheetA,
  sheetB,
  setSheetB,
  pair,
  nlQuery,
  setNlQuery,
  applyNl,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
}: {
  period: string;
  setPeriod: (v: string) => void;
  sheetA: string;
  setSheetA: (v: string) => void;
  sheetB: string;
  setSheetB: (v: string) => void;
  pair: [ParsedWorkbook, ParsedWorkbook];
  nlQuery: string;
  setNlQuery: (v: string) => void;
  applyNl: () => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-background/90 p-3 shadow-sm backdrop-blur-sm dark:bg-background/50">
      <div>
        <Label className="text-xs text-muted-foreground">Smart search</Label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder='e.g. "Compare allocation column only" · "Show budget variance"'
              className="pl-9 text-sm"
            />
          </div>
          <Button type="button" variant="secondary" className="shrink-0" onClick={applyNl}>
            Apply
          </Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs">Sheet · A</Label>
          <Select value={sheetA} onValueChange={setSheetA}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pair[0].sheets.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Sheet · B</Label>
          <Select value={sheetB} onValueChange={setSheetB}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pair[1].sheets.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Time range</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="mt-1 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="3m">3-month</SelectItem>
              <SelectItem value="6m">6-month</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="custom">Custom date range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === "custom" ? (
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                className="mt-1 h-9 text-xs"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                className="mt-1 h-9 text-xs"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}
      </div>
    </div>
  );
}
