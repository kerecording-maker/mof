import { create } from "zustand";
import type { BudgetEntry, ClimateClassification } from "./budget-types";

interface State {
  entries: BudgetEntry[];
  classifications: ClimateClassification[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (e: BudgetEntry) => void;
}

export const useBudgetStore = create<State>((set, get) => ({
  entries: [],
  classifications: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    const res = await fetch("/data/budget.json");
    const json = await res.json();
    set({
      entries: json.entries.map((e: any) => ({
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
}));
