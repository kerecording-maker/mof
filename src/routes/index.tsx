import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useBudgetStore } from "@/lib/budget-store";
import type { BudgetEntry, ClimateClassification } from "@/lib/budget-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { Plus, TrendingUp, Wallet, Leaf, Building2, Search, LayoutGrid } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { BudgetToolsDock } from "@/components/budget-tools-dock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Dashboard });

const fmt = (n: number) => {
  if (!n) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
};
const fmtFull = (n: number) => "PKR " + (n || 0).toLocaleString();

const COLORS = [
  "oklch(0.55 0.15 175)",
  "oklch(0.7 0.15 75)",
  "oklch(0.5 0.18 25)",
  "oklch(0.6 0.15 250)",
  "oklch(0.65 0.18 140)",
  "oklch(0.55 0.2 320)",
  "oklch(0.7 0.18 50)",
];
const CHART_GRID = "oklch(0.55 0.02 200 / 0.22)";

const fullScreenDialogClass =
  "fixed inset-0 left-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 duration-200 " +
  "shadow-[0_0_0_1px_oklch(0_0_0/0.06),0_40px_100px_-20px_oklch(0.25_0.05_260/0.45),0_80px_160px_-40px_oklch(0.35_0.08_200/0.25)] " +
  "dark:shadow-[0_0_0_1px_oklch(1_0_0/0.08),0_40px_100px_-20px_oklch(0_0_0/0.75),0_80px_160px_-40px_oklch(0_0_0/0.5)] " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-none";

function Dashboard() {
  const { entries, classifications, loaded, load, add } = useBudgetStore();
  const [year, setYear] = useState("all");
  const [fund, setFund] = useState("all");
  const [ccType, setCcType] = useState("all");
  const [relevance, setRelevance] = useState("all");
  const [q, setQ] = useState("");
  const [ccModalOpen, setCcModalOpen] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (year === "all" || String(e.year) === year) &&
          (fund === "all" || e.description === fund) &&
          (ccType === "all" || e.ccType === ccType) &&
          (relevance === "all" || e.ccRelevance === relevance) &&
          (!q ||
            e.costCenter?.toLowerCase().includes(q.toLowerCase()) ||
            e.ddoCode?.toLowerCase().includes(q.toLowerCase())),
      ),
    [entries, year, fund, ccType, relevance, q],
  );

  const years = useMemo(() => [...new Set(entries.map((e) => e.year))].sort(), [entries]);
  const funds = useMemo(
    () => [...new Set(entries.map((e) => e.description))].filter(Boolean).sort(),
    [entries],
  );
  const ccTypes = useMemo(
    () => [...new Set(entries.map((e) => e.ccType))].filter(Boolean).sort(),
    [entries],
  );

  const kpis = useMemo(() => {
    const totalBudget = filtered.reduce((s, e) => s + e.originalBudget, 0);
    const totalExp = filtered.reduce((s, e) => s + e.expenditure, 0);
    const climateBudget = filtered.reduce((s, e) => s + e.relevantCCBE, 0);
    const climateExp = filtered.reduce((s, e) => s + e.relevantCCExp, 0);
    return {
      totalBudget,
      totalExp,
      climateBudget,
      climateExp,
      util: totalBudget ? (totalExp / totalBudget) * 100 : 0,
      climateShare: totalBudget ? (climateBudget / totalBudget) * 100 : 0,
    };
  }, [filtered]);

  const modalStats = useMemo(() => {
    const climateRows = filtered.filter((e) => e.ccRelevance === "Yes").length;
    const divisions = new Set(filtered.map((e) => e.description)).size;
    const ddoCodes = new Set(filtered.map((e) => e.ddoCode).filter(Boolean)).size;
    return { climateRows, divisions, ddoCodes };
  }, [filtered]);

  const byFund = useMemo(() => {
    const m = new Map<string, { name: string; budget: number; exp: number }>();
    filtered.forEach((e) => {
      const key = e.description || "Unknown";
      const cur = m.get(key) || {
        name: key.length > 22 ? key.slice(0, 22) + "…" : key,
        budget: 0,
        exp: 0,
      };
      cur.budget += e.originalBudget;
      cur.exp += e.expenditure;
      m.set(key, cur);
    });
    return [...m.values()].sort((a, b) => b.budget - a.budget).slice(0, 10);
  }, [filtered]);

  const byCcType = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((e) => {
      if (e.ccType && e.relevantCCBE > 0) m.set(e.ccType, (m.get(e.ccType) || 0) + e.relevantCCBE);
    });
    return [...m.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [filtered]);

  return (
    <BudgetToolsDock>
      <div className="min-h-screen bg-gradient-to-b from-primary/[0.06] via-background to-muted/30 dark:from-primary/[0.12] dark:via-background dark:to-muted/20">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card/75 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/65">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/80 font-bold text-primary-foreground shadow-md">
                  F
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold tracking-tight">
                    Federal Budget Tagging
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Climate Finance Dashboard · 2024–25
                  </p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="default"
                className="gap-2 shadow-md"
                onClick={() => setCcModalOpen(true)}
              >
                <LayoutGrid className="size-4" />
                Cost Centers
              </Button>
              <AddEntryDialog onAdd={add} classifications={classifications} funds={funds} />
              <ThemeToggle />
              <GoogleAuthButton />
            </div>
          </div>
        </header>

        <Dialog open={ccModalOpen} onOpenChange={setCcModalOpen}>
          <DialogContent className={fullScreenDialogClass}>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <DialogHeader className="shrink-0 space-y-1 border-b bg-muted/30 px-6 py-5 text-left">
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  Cost center registry
                </DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  Full-screen view of tagged entries matching your current filters.
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto max-w-[1400px] space-y-6">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <ModalStatRow
                      label="Cost Center Entries"
                      value={filtered.length.toLocaleString()}
                      tone="teal"
                    />
                    <ModalStatRow
                      label="Climate-tagged rows"
                      value={modalStats.climateRows.toLocaleString()}
                      tone="amber"
                    />
                    <ModalStatRow
                      label="Divisions represented"
                      value={modalStats.divisions.toLocaleString()}
                      tone="violet"
                    />
                    <ModalStatRow
                      label="Unique DDO codes"
                      value={modalStats.ddoCodes.toLocaleString()}
                      tone="rose"
                    />
                  </div>

                  <Card className="border-border/80 shadow-md">
                    <CardHeader className="border-b bg-muted/20 pb-4">
                      <CardTitle className="text-lg font-semibold">
                        Cost Center Entries · {filtered.length.toLocaleString()} rows
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-0">
                      <div className="max-h-[min(60vh,720px)] overflow-auto">
                        <CostCenterEntriesTable rows={filtered} />
                      </div>
                      {filtered.length > 200 && (
                        <p className="border-t px-4 py-3 text-xs text-muted-foreground">
                          Showing first 200 of {filtered.length.toLocaleString()} in this view.
                          Refine filters or export from source systems for the full dataset.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <main className="mx-auto max-w-[1400px] space-y-6 px-6 py-8">
          {!loaded && <p className="text-muted-foreground">Loading…</p>}

          <Card className="border-border/80 shadow-sm">
            <CardContent className="grid gap-3 pt-6 md:grid-cols-6">
              <div className="md:col-span-2">
                <Label className="text-xs">Search Cost Center / DDO</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="e.g. KA9638"
                    className="pl-8"
                  />
                </div>
              </div>
              <FilterSelect
                label="Year"
                value={year}
                onChange={setYear}
                options={years.map(String)}
              />
              <FilterSelect
                label="Division / Fund"
                value={fund}
                onChange={setFund}
                options={funds}
              />
              <FilterSelect label="CC Type" value={ccType} onChange={setCcType} options={ccTypes} />
              <FilterSelect
                label="Climate Relevance"
                value={relevance}
                onChange={setRelevance}
                options={["Yes", "No"]}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              variant="ocean"
              icon={<Wallet className="size-4" />}
              label="Total Budget"
              value={fmt(kpis.totalBudget)}
              sub={fmtFull(kpis.totalBudget)}
            />
            <KpiCard
              variant="sunset"
              icon={<TrendingUp className="size-4" />}
              label="Expenditure"
              value={fmt(kpis.totalExp)}
              sub={`Utilization ${kpis.util.toFixed(1)}%`}
            />
            <KpiCard
              variant="forest"
              icon={<Leaf className="size-4" />}
              label="Climate-Relevant Budget"
              value={fmt(kpis.climateBudget)}
              sub={`${kpis.climateShare.toFixed(1)}% of total`}
            />
            <KpiCard
              variant="violet"
              icon={<Building2 className="size-4" />}
              label="Cost Centers"
              value={String(filtered.length)}
              sub={`${new Set(filtered.map((e) => e.description)).size} divisions`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-card to-card shadow-md dark:border-cyan-400/20 dark:from-cyan-400/8 dark:shadow-cyan-950/15">
              <CardHeader>
                <CardTitle className="text-base">Top Divisions — Budget vs Expenditure</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={byFund} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      angle={-20}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmtFull(v)} />
                    <Legend />
                    <Bar
                      dataKey="budget"
                      fill="oklch(0.45 0.13 175)"
                      name="Budget"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="exp"
                      fill="oklch(0.7 0.15 75)"
                      name="Expenditure"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-md dark:border-amber-400/20 dark:from-amber-400/8 dark:shadow-amber-950/15">
              <CardHeader>
                <CardTitle className="text-base">Climate Tag Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={byCcType}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {byCcType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtFull(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </BudgetToolsDock>
  );
}

function ModalStatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "teal" | "amber" | "violet" | "rose";
}) {
  const tones = {
    teal: "from-teal-500/15 to-card border-teal-500/35 dark:from-teal-400/10 dark:border-teal-400/25",
    amber:
      "from-amber-500/15 to-card border-amber-500/35 dark:from-amber-400/10 dark:border-amber-400/25",
    violet:
      "from-violet-500/15 to-card border-violet-500/35 dark:from-violet-400/10 dark:border-violet-400/25",
    rose: "from-rose-500/15 to-card border-rose-500/35 dark:from-rose-400/10 dark:border-rose-400/25",
  } as const;
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4 shadow-sm", tones[tone])}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}

function CostCenterEntriesTable({ rows }: { rows: BudgetEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Year</TableHead>
          <TableHead>Division</TableHead>
          <TableHead>Cost Center</TableHead>
          <TableHead>CC Type</TableHead>
          <TableHead>Climate</TableHead>
          <TableHead className="text-right">Budget</TableHead>
          <TableHead className="text-right">Expenditure</TableHead>
          <TableHead className="text-right">% Rel.</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.slice(0, 200).map((e, i) => (
          <TableRow key={`${e.ddoCode}-${e.costCenter}-${i}`} className="border-border/60">
            <TableCell>{e.year}</TableCell>
            <TableCell className="max-w-[200px] truncate" title={e.description}>
              {e.description}
            </TableCell>
            <TableCell className="max-w-[260px] truncate text-xs" title={e.costCenter}>
              {e.costCenter}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{e.ccType}</Badge>
            </TableCell>
            <TableCell>
              <Badge
                className={
                  e.ccRelevance === "Yes"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }
              >
                {e.ccRelevance}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">{fmt(e.originalBudget)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(e.expenditure)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {(e.percentageRelevant * 100).toFixed(0)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
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

const kpiVariants = {
  ocean:
    "border-cyan-500/35 bg-gradient-to-br from-cyan-500/12 via-card to-card shadow-md dark:from-cyan-400/10 dark:border-cyan-400/25 dark:shadow-lg dark:shadow-cyan-950/20",
  sunset:
    "border-orange-500/35 bg-gradient-to-br from-orange-500/12 via-card to-card shadow-md dark:from-orange-400/10 dark:border-orange-400/25 dark:shadow-lg dark:shadow-orange-950/20",
  forest:
    "border-emerald-500/40 bg-gradient-to-br from-emerald-500/14 via-card to-card shadow-md ring-1 ring-emerald-500/15 dark:from-emerald-400/12 dark:border-emerald-400/30 dark:shadow-lg dark:shadow-emerald-950/25",
  violet:
    "border-violet-500/35 bg-gradient-to-br from-violet-500/12 via-card to-card shadow-md dark:from-violet-400/10 dark:border-violet-400/25 dark:shadow-lg dark:shadow-violet-950/20",
} as const;

function KpiCard({
  icon,
  label,
  value,
  sub,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  variant: keyof typeof kpiVariants;
}) {
  const iconWrap = {
    ocean: "bg-cyan-600 text-white dark:bg-cyan-500",
    sunset: "bg-orange-600 text-white dark:bg-orange-500",
    forest: "bg-emerald-600 text-white dark:bg-emerald-500",
    violet: "bg-violet-600 text-white dark:bg-violet-500",
  } as const;
  return (
    <Card
      className={cn(
        "overflow-hidden border-2 transition-shadow hover:shadow-lg",
        kpiVariants[variant],
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg shadow-sm",
              iconWrap[variant],
            )}
          >
            {icon}
          </span>
        </div>
        <div className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function AddEntryDialog({
  onAdd,
  classifications,
  funds,
}: {
  onAdd: (e: BudgetEntry) => void;
  classifications: ClimateClassification[];
  funds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    dno: 1,
    fund: "",
    description: "",
    subFunction: "",
    fCode: 0,
    ddoCode: "",
    costCenter: "",
    originalBudget: 0,
    expenditure: 0,
    ccRelevance: "Yes",
    ccType: "CADDP",
    percentageRelevant: 1,
  });
  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }) as typeof f);

  const submit = () => {
    const ob = Number(form.originalBudget);
    const ex = Number(form.expenditure);
    const pr = Number(form.percentageRelevant);
    onAdd({
      ...form,
      year: Number(form.year),
      dno: Number(form.dno),
      fCode: Number(form.fCode),
      originalBudget: ob,
      expenditure: ex,
      percentageRelevant: pr,
      relevantCCBE: form.ccRelevance === "Yes" ? ob * pr : 0,
      relevantCCExp: form.ccRelevance === "Yes" ? ex * pr : 0,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 size-4" /> Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Budget Entry</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Year">
            <Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} />
          </Field>
          <Field label="D.No">
            <Input type="number" value={form.dno} onChange={(e) => set("dno", e.target.value)} />
          </Field>
          <Field label="Fund Code">
            <Input
              value={form.fund}
              onChange={(e) => set("fund", e.target.value)}
              placeholder="FC21A17"
            />
          </Field>
          <Field label="Division">
            <Select value={form.description} onValueChange={(v) => set("description", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {funds.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sub Function">
            <Input value={form.subFunction} onChange={(e) => set("subFunction", e.target.value)} />
          </Field>
          <Field label="F.Code">
            <Input
              type="number"
              value={form.fCode}
              onChange={(e) => set("fCode", e.target.value)}
            />
          </Field>
          <Field label="DDO Code">
            <Input value={form.ddoCode} onChange={(e) => set("ddoCode", e.target.value)} />
          </Field>
          <Field label="Cost Center">
            <Input value={form.costCenter} onChange={(e) => set("costCenter", e.target.value)} />
          </Field>
          <Field label="Original Budget (PKR)">
            <Input
              type="number"
              value={form.originalBudget}
              onChange={(e) => set("originalBudget", e.target.value)}
            />
          </Field>
          <Field label="Expenditure (PKR)">
            <Input
              type="number"
              value={form.expenditure}
              onChange={(e) => set("expenditure", e.target.value)}
            />
          </Field>
          <Field label="Climate Relevance">
            <Select value={form.ccRelevance} onValueChange={(v) => set("ccRelevance", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="CC Type">
            <Select value={form.ccType} onValueChange={(v) => set("ccType", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {classifications.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="% Relevant (0–1)">
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={form.percentageRelevant}
              onChange={(e) => set("percentageRelevant", e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save Entry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
