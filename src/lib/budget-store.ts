import { create } from "zustand";
import type { BudgetEntry, ClimateClassification } from "./budget-types";

export type DashboardFilters = {
  year: string;
  fund: string;
  ccType: string;
  relevance: string;
  q: string;
};

const defaultFilters: DashboardFilters = {
  year: "all",
  fund: "all",
  ccType: "all",
  relevance: "all",
  q: "",
};

function filterEntries(entries: BudgetEntry[], filters: DashboardFilters): BudgetEntry[] {
  const { year, fund, ccType, relevance, q } = filters;
  const qLower = q.trim().toLowerCase();
  return entries.filter(
    (e) =>
      (year === "all" || String(e.year) === year) &&
      (fund === "all" || e.description === fund) &&
      (ccType === "all" || e.ccType === ccType) &&
      (relevance === "all" || e.ccRelevance === relevance) &&
      (!qLower ||
        e.costCenter?.toLowerCase().includes(qLower) ||
        e.ddoCode?.toLowerCase().includes(qLower)),
  );
}

interface State {
  entries: BudgetEntry[];
  classifications: ClimateClassification[];
  loaded: boolean;
  filters: DashboardFilters;
  load: () => Promise<void>;
  add: (e: BudgetEntry) => void;
  setFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  setFilters: (patch: Partial<DashboardFilters>) => void;
  getFilteredEntries: () => BudgetEntry[];
}

export const useBudgetStore = create<State>((set, get) => ({
  entries: [],
  classifications: [],
  loaded: false,
  filters: { ...defaultFilters },
  load: async () => {
    if (get().loaded) return;
    const res = await fetch("/data/budget.json");
    const json = await res.json();
    set({
      entries: json.entries.map((e: BudgetEntry) => ({
        ...e,
        year: Number(e.year),
        originalBudget: Number(e.originalBudget) || 0,
        expenditure: Number(e.expenditure) || 0,
        percentageRelevant: Number(e.percentageRelevant) || 0,
        relevantCCBE: Number(e.relevantCCBE) || 0,
        relevantCCExp: Number(e.relevantCCExp) || 0,
      })),
      classifications: json.classifications,
      loaded: true,
    });
  },
  add: (e) => set((s) => ({ entries: [e, ...s.entries] })),
  setFilter: (key, value) =>
    set((s) => ({
      filters: { ...s.filters, [key]: value },
    })),
  setFilters: (patch) =>
    set((s) => ({
      filters: { ...s.filters, ...patch },
    })),
  getFilteredEntries: () => filterEntries(get().entries, get().filters),
}));

export function describeDashboardFilters(filters: DashboardFilters): string {
  const parts: string[] = [];
  if (filters.year !== "all") parts.push(`Year ${filters.year}`);
  if (filters.fund !== "all") parts.push(filters.fund);
  if (filters.ccType !== "all") parts.push(filters.ccType);
  if (filters.relevance !== "all") parts.push(`Climate ${filters.relevance}`);
  if (filters.q.trim()) parts.push(`Search “${filters.q.trim()}”`);
  return parts.length ? parts.join(" · ") : "All cost centers (no dashboard filters)";
}
