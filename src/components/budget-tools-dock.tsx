import { useState } from "react";
import {
  GitCompareArrows,
  LineChart as LineChartIcon,
  Upload,
  Sparkles,
  FileSpreadsheet,
  Lightbulb,
  Shield,
  FileText,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";
import { CompareModuleModal } from "@/components/compare/compare-module-modal";
import { GenerateReportModuleModal } from "@/components/report/generate-report-module-modal";

const fullScreenPanelClass =
  "fixed inset-0 left-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 duration-200 " +
  "shadow-[0_0_0_1px_oklch(0_0_0/0.06),0_40px_100px_-20px_oklch(0.25_0.05_260/0.45),0_80px_160px_-40px_oklch(0.35_0.08_200/0.25)] " +
  "dark:shadow-[0_0_0_1px_oklch(1_0_0/0.08),0_40px_100px_-20px_oklch(0_0_0/0.75),0_80px_160px_-40px_oklch(0_0_0/0.5)] " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-none";

const largeModalClass =
  "z-50 flex max-h-[90dvh] w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden border bg-background p-0 shadow-2xl sm:rounded-xl";

const analyzeTrend = [
  { m: "M1", spend: 42, tag: 38 },
  { m: "M2", spend: 48, tag: 44 },
  { m: "M3", spend: 51, tag: 49 },
  { m: "M4", spend: 47, tag: 52 },
  { m: "M5", spend: 55, tag: 54 },
  { m: "M6", spend: 58, tag: 57 },
];

export function BudgetToolsDock({ children }: { children: React.ReactNode }) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 z-30 flex h-screen w-[4.25rem] shrink-0 flex-col border-r border-border/60 bg-card/80 py-4 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/70 dark:bg-card/50">
          <div className="mb-3 flex justify-center px-1">
            <div
              className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary"
              title="MOF tools"
            >
              <Sparkles className="size-4" />
            </div>
          </div>
          <Separator className="mx-2 bg-border/80" />
          <nav className="mt-4 flex flex-1 flex-col items-center gap-2 px-1">
            <SidebarTool
              label="Compare"
              icon={<GitCompareArrows className="size-5" />}
              onClick={() => setCompareOpen(true)}
            />
            <SidebarTool
              label="Analyze"
              icon={<LineChartIcon className="size-5" />}
              onClick={() => setAnalyzeOpen(true)}
            />
            <SidebarTool
              label="Upload Document"
              icon={<Upload className="size-5" />}
              onClick={() => setUploadOpen(true)}
            />
            <SidebarTool
              label="Generate Report"
              icon={<FileText className="size-5" />}
              onClick={() => setReportOpen(true)}
            />
          </nav>
          <div className="mt-auto flex flex-col items-center gap-1 px-1 pb-2">
            <Badge variant="outline" className="px-1.5 text-[0.65rem] font-normal">
              AI
            </Badge>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>

      <CompareModuleModal open={compareOpen} onOpenChange={setCompareOpen} />
      <AnalyzeModuleModal open={analyzeOpen} onOpenChange={setAnalyzeOpen} />
      <UploadDocumentModal open={uploadOpen} onOpenChange={setUploadOpen} />
      <GenerateReportModuleModal open={reportOpen} onOpenChange={setReportOpen} />
    </TooltipProvider>
  );
}

function SidebarTool({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-11 rounded-xl border border-transparent text-muted-foreground transition-all",
            "hover:border-primary/25 hover:bg-primary/10 hover:text-foreground",
            "dark:hover:bg-primary/15",
          )}
          onClick={onClick}
          aria-label={label}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function AnalyzeModuleModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={fullScreenPanelClass}>
        <DialogHeader className="shrink-0 border-b bg-muted/25 px-6 py-5 text-left">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            AI budget analysis
          </DialogTitle>
          <DialogDescription className="text-base">
            Tagging suggestions, targets, and forecasts from historical patterns (connect model +
            data pipeline).
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-card shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Suggested tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Badge className="font-normal">Education Digital Infrastructure</Badge>
                  <Badge variant="secondary" className="font-normal">
                    Public Healthcare Expansion
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    Rural Development Priority
                  </Badge>
                </CardContent>
              </Card>
              <Card className="border-teal-500/25 bg-gradient-to-br from-teal-500/10 to-card shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Targeting</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge>High priority</Badge>
                  <Badge variant="secondary">Medium allocation</Badge>
                  <Badge variant="outline">Strategic reserve</Badge>
                  <Badge variant="destructive">Emergency allocation</Badge>
                </CardContent>
              </Card>
              <Card className="border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-card shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>Based on 6-month spend, consider +12% agriculture envelope next cycle.</p>
                  <p>Transport shows underutilization — candidate for reallocation.</p>
                </CardContent>
              </Card>
            </div>
            <Card className="border-border/80 shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Spend vs tagging intensity (sample)</CardTitle>
                <CardDescription>
                  Replace with heatmaps / forecasts from your analytics API.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={analyzeTrend} margin={{ left: 8, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.55 0.02 200 / 0.22)" />
                    <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Line
                      type="monotone"
                      dataKey="spend"
                      name="Spend index"
                      stroke="oklch(0.5 0.15 250)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="tag"
                      name="Tagging"
                      stroke="oklch(0.55 0.14 165)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </RLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function UploadDocumentModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    setFileName(f ? f.name : null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={largeModalClass}>
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Drag & drop Excel (.xlsx, .xls). Sheet detection, AI column mapping, and duplicate
            checks run server-side when wired.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-2 w-fit">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="validate">Validation</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="min-h-0 flex-1 px-6 pb-6 pt-4">
            <div
              className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-muted/20 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                onFiles(e.dataTransfer.files);
              }}
              onClick={() => document.getElementById("budget-xlsx-input")?.click()}
              role="presentation"
            >
              <FileSpreadsheet className="mb-3 size-10 text-primary" />
              <p className="text-sm font-medium">Drop Excel here or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">
                .xlsx, .xls · multiple sheets supported
              </p>
              <input
                id="budget-xlsx-input"
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
              {fileName ? (
                <p className="mt-4 text-sm text-foreground">
                  Selected: <span className="font-medium">{fileName}</span>
                </p>
              ) : null}
            </div>
          </TabsContent>
          <TabsContent value="validate" className="px-6 pb-6 pt-2">
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>Header row detection & type inference</li>
              <li>
                AI auto-map: Department, Budget Head, Allocation, Utilization, Fiscal year, Month,
                Quarter
              </li>
              <li>Duplicate row detection vs last import</li>
            </ul>
          </TabsContent>
          <TabsContent value="roles" className="px-6 pb-6 pt-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="gap-1">
                <Shield className="size-3" /> Admin
              </Badge>
              <Badge variant="secondary">Analyst</Badge>
              <Badge variant="outline">Viewer</Badge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Enforce with Firebase custom claims + API routes.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
