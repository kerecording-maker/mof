export interface BudgetEntry {
  year: number;
  dno: number;
  fund: string;
  description: string;
  subFunction: string;
  fCode: number;
  ddoCode: string;
  costCenter: string;
  originalBudget: number;
  expenditure: number;
  ccRelevance: string;
  ccType: string;
  percentageRelevant: number;
  relevantCCBE: number;
  relevantCCExp: number;
}

export interface ClimateClassification {
  category: string;
  categoryCode: string;
  num: number;
  name: string;
  code: string;
}

export interface BudgetData {
  entries: BudgetEntry[];
  classifications: ClimateClassification[];
}
