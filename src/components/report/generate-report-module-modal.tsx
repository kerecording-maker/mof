import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  Loader2,
  Eye,
  Share2,
  Sparkles,
  CalendarRange,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  autoRangeForPeriod,
  buildReportFromBudgetEntries,
  extractFilterOptionsFromEntries,
  formatDateParts,
} from "@/lib/report-analytics";
import { downloadReportPdf, generateReportPdf, previewReportPdf } from "@/lib/report-pdf";
import type { DateParts, ReportConfig, ReportData, ReportPeriodType } from "@/lib/report-types";
import { useBudgetStore } from "@/lib/budget-store";

const PERIOD_OPTIONS: { id: ReportPeriodType; label: string; hint: string }[] = [
  { id: "quarterly", label: "Quarterly", hint: "Last 3 months" },
  { id: "three_months", label: "3 Months", hint: "Rolling 3 months" },
  { id: "six_months", label: "6 Months", hint: "Rolling 6 months" },
  { id: "yearly", label: "Yearly", hint: "Last 12 months" },
  { id: "custom", label: "Custom range", hint: "Pick FROM / TO" },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const modalClass =
  "z-50 flex max-h-[min(76dvh,640px)] w-[min(96vw,720px)] max-w-none flex-col gap-0 overflow-hidden border bg-background p-0 shadow-2xl sm:rounded-2xl " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 " +
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95";

function DateRangeFields({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: DateParts;
  onChange: (v: DateParts) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <DateRangeInputs value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function DateRangeInputs({
  value,
  onChange,
  disabled,
}: {
  value: DateParts;
  onChange: (v: DateParts) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label className="text-[0.65rem] text-muted-foreground">Day</Label>
        <Input
          type="number"
          min={1}
          max={31}
          disabled={disabled}
          value={value.day}
          onChange={(e) => onChange({ ...value, day: Number(e.target.value) || 1 })}
          className="h-9"
        />
      </div>
      <div>
        <Label className="text-[0.65rem] text-muted-foreground">Month</Label>
        <Select
          disabled={disabled}
          value={String(value.month)}
          onValueChange={(m) => onChange({ ...value, month: Number(m) })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={name} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[0.65rem] text-muted-foreground">Year</Label>
        <Input
          type="number"
          min={2000}
          max={2100}
          disabled={disabled}
          value={value.year}
          onChange={(e) => onChange({ ...value, year: Number(e.target.value) || value.year })}
          className="h-9"
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const CLIMATE_OPTIONS = [
  { id: "all", label: "All" },
  { id: "Yes", label: "Yes" },
  { id: "No", label: "No" },
] as const;

function ClimateRelevanceButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">Climate relevance</Label>
      <div className="mt-1 flex gap-1.5">
        {CLIMATE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-all",
              value === opt.id
                ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/30"
                : "border-border/80 bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/40",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GenerateReportModuleModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { entries, load, loaded } = useBudgetStore();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("quarterly");
  const [from, setFrom] = useState<DateParts>(() => autoRangeForPeriod("quarterly").from);
  const [to, setTo] = useState<DateParts>(() => autoRangeForPeriod("quarterly").to);
  const [department, setDepartment] = useState("all");
  const [budgetCategory, setBudgetCategory] = useState("all");
  const [region, setRegion] = useState("all");
  const [sector, setSector] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [lastReport, setLastReport] = useState<ReportData | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    if (open && !loaded) void load();
  }, [open, loaded, load]);

  useEffect(() => {
    if (periodType !== "custom") {
      const range = autoRangeForPeriod(periodType);
      setFrom(range.from);
      setTo(range.to);
    }
  }, [periodType]);

  const filterOptions = useMemo(() => extractFilterOptionsFromEntries(entries), [entries]);
  const entryCountLabel = loaded
    ? `${entries.length.toLocaleString()} cost center entries · ${new Set(entries.map((e) => e.description)).size} divisions`
    : "Loading cost center registry…";

  const buildConfig = useCallback((): ReportConfig => {
    return {
      periodType,
      from,
      to,
      sheetName: "",
      reportTitle: "Cost Center Budget Report",
      filters: { department, budgetCategory, region, sector },
    };
  }, [periodType, from, to, department, budgetCategory, region, sector]);

  const runAnalysis = useCallback(async (): Promise<ReportData> => {
    const config = buildConfig();
    if (!entries.length) {
      throw new Error("Dashboard data not loaded");
    }
    setProgressLabel("Reading cost center registry…");
    setProgress(15);
    await new Promise((r) => setTimeout(r, 180));
    setProgressLabel("Running statistical analysis…");
    setProgress(45);
    await new Promise((r) => setTimeout(r, 220));
    const data = buildReportFromBudgetEntries(entries, config);
    setProgressLabel("Building charts & AI insights…");
    setProgress(75);
    await new Promise((r) => setTimeout(r, 180));
    setProgressLabel("Rendering A4 PDF…");
    setProgress(92);
    await new Promise((r) => setTimeout(r, 120));
    setProgress(100);
    return data;
  }, [buildConfig, entries]);

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);
    try {
      const data = await runAnalysis();
      setLastReport(data);
      downloadReportPdf(data);
      toast.success("AI budget report generated and downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate report. Wait for dashboard data to load, then try again.");
    } finally {
      setGenerating(false);
      setProgress(0);
      setProgressLabel("");
    }
  };

  const handlePreview = async () => {
    setGenerating(true);
    setProgress(0);
    try {
      const data = lastReport ?? (await runAnalysis());
      setLastReport(data);
      previewReportPdf(data);
      setSummaryOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Preview failed");
    } finally {
      setGenerating(false);
      setProgress(0);
      setProgressLabel("");
    }
  };

  const handleShare = async () => {
    if (!lastReport) {
      toast.message("Generate a report first");
      return;
    }
    const blob = generateReportPdf(lastReport);
    const file = new File([blob], `MOF_Report.pdf`, { type: "application/pdf" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "MOF Budget Report",
          text: lastReport.executiveSummary.slice(0, 120),
          files: [file],
        });
      } catch {
        toast.message("Share cancelled");
      }
    } else {
      downloadReportPdf(lastReport);
      toast.success("PDF downloaded — attach to email to share");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={modalClass}>
          <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-primary/10 via-background to-background px-6 py-3.5 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <FileText className="size-6 text-primary" />
              Generate AI Budget Report
            </DialogTitle>
            <DialogDescription className="text-sm">
              Report is built from your dashboard cost center registry — same totals, top cost
              centers, divisions, and climate tags as on screen.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1">
            <ReportFormBody
              periodType={periodType}
              setPeriodType={setPeriodType}
              from={from}
              setFrom={setFrom}
              to={to}
              setTo={setTo}
              entryCountLabel={entryCountLabel}
              filterOptions={filterOptions}
              department={department}
              setDepartment={setDepartment}
              budgetCategory={budgetCategory}
              setBudgetCategory={setBudgetCategory}
              region={region}
              setRegion={setRegion}
              sector={sector}
              setSector={setSector}
              generating={generating}
              progress={progress}
              progressLabel={progressLabel}
              lastReport={lastReport}
            />
          </ScrollArea>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-muted/20 px-6 py-3 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={generating}
                onClick={() => void handlePreview()}
              >
                <Eye className="size-4" />
                Preview report
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={generating || !lastReport}
                onClick={() => void handleShare()}
              >
                <Share2 className="size-4" />
                Share report
              </Button>
            </div>
            <Button
              type="button"
              size="lg"
              className="gap-2 shadow-md"
              disabled={generating}
              onClick={() => void handleGenerate()}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate AI Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report summary</DialogTitle>
            <DialogDescription>
              PDF opened in a new tab. Key findings from your report:
            </DialogDescription>
          </DialogHeader>
          {lastReport ? (
            <div className="space-y-2 text-sm">
              <p>{lastReport.executiveSummary}</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {lastReport.insights.map((insight) => (
                  <li key={insight}>{insight}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportFormBody(props: {
  periodType: ReportPeriodType;
  setPeriodType: (v: ReportPeriodType) => void;
  from: DateParts;
  setFrom: (v: DateParts) => void;
  to: DateParts;
  setTo: (v: DateParts) => void;
  entryCountLabel: string;
  filterOptions: ReturnType<typeof extractFilterOptionsFromEntries>;
  department: string;
  setDepartment: (v: string) => void;
  budgetCategory: string;
  setBudgetCategory: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  sector: string;
  setSector: (v: string) => void;
  generating: boolean;
  progress: number;
  progressLabel: string;
  lastReport: ReportData | null;
}) {
  const {
    periodType,
    setPeriodType,
    from,
    setFrom,
    to,
    setTo,
    entryCountLabel,
    filterOptions,
    department,
    setDepartment,
    budgetCategory,
    setBudgetCategory,
    region,
    setRegion,
    sector,
    setSector,
    generating,
    progress,
    progressLabel,
    lastReport,
  } = props;

  return (
    <div className="space-y-4 px-6 py-3">
      <section className="space-y-2">
        <Label className="text-sm font-semibold">Report type</Label>
        <div className="flex w-full gap-1.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              title={opt.hint}
              onClick={() => setPeriodType(opt.id)}
              className={cn(
                "min-w-0 flex-1 rounded-lg border px-1 py-1.5 text-center transition-all",
                periodType === opt.id
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                  : "border-border/80 bg-card hover:border-primary/30 hover:bg-muted/40",
              )}
            >
              <span className="flex items-center justify-center gap-0.5">
                <span className="truncate text-[0.7rem] font-medium leading-tight sm:text-xs">
                  {opt.label}
                </span>
                {periodType === opt.id ? (
                  <Check className="size-3 shrink-0 text-primary" aria-hidden />
                ) : null}
              </span>
            </button>
          ))}
        </div>
        {periodType !== "custom" ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarRange className="size-3.5 shrink-0" />
            <span>
              {PERIOD_OPTIONS.find((o) => o.id === periodType)?.hint} · {formatDateParts(from)} –{" "}
              {formatDateParts(to)}
            </span>
          </p>
        ) : null}
      </section>

      {periodType === "custom" ? (
        <>
          <Separator />
          <section className="grid gap-3 sm:grid-cols-2">
            <DateRangeFields label="From" value={from} onChange={setFrom} />
            <DateRangeFields label="To" value={to} onChange={setTo} />
          </section>
        </>
      ) : null}

      <Separator />

      <section className="rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-950/35">
        <p className="text-xs font-medium text-foreground">Cost center registry (system)</p>
        <p className="text-xs text-amber-950/80 dark:text-amber-100/90">{entryCountLabel}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <FilterSelect
          label="Division / Fund"
          value={department}
          onChange={setDepartment}
          options={filterOptions.divisions}
        />
        <FilterSelect
          label="CC Type"
          value={budgetCategory}
          onChange={setBudgetCategory}
          options={filterOptions.ccTypes}
        />
        <ClimateRelevanceButtons value={region} onChange={setRegion} />
        <FilterSelect
          label="Sub-function"
          value={sector}
          onChange={setSector}
          options={filterOptions.subFunctions}
        />
      </section>

      {generating ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Loader2 className="size-4 animate-spin text-primary" />
            {progressLabel || "Generating report…"}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      ) : null}

      {lastReport && !generating ? (
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-sm">
          <p className="font-medium text-foreground">Last report ready</p>
          <p className="mt-1 line-clamp-2 text-muted-foreground">{lastReport.executiveSummary}</p>
        </div>
      ) : null}
    </div>
  );
}
