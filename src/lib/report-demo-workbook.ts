import type { ParsedWorkbook, SheetMatrix } from "@/lib/excel-workbook";

/** Demo workbook for report generation when no file is uploaded. */
export function createDemoReportWorkbook(): ParsedWorkbook {
  const h = [
    "Department",
    "Budget Head",
    "Region",
    "Sector",
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
  const regions = ["North", "South", "Central", "East"];
  const rows: SheetMatrix = [h];
  depts.forEach((d, i) => {
    const alloc = 80 + i * 18;
    const util = Math.round(alloc * (0.68 + (i % 4) * 0.04));
    const rem = alloc - util;
    rows.push([
      d,
      `${d} program`,
      regions[i % regions.length],
      d,
      alloc,
      alloc * 0.97,
      util,
      rem,
      alloc * 0.82,
      util * 1.03,
      (util * 1.03 - alloc * 0.82) / (alloc * 0.82),
      (i % 12) + 1,
      `Q${(i % 4) + 1}`,
      2024 + (i % 2),
    ]);
  });
  return {
    fileName: "MOF_Budget_Demo.xlsx",
    sheets: [
      { name: "Budget Summary", rows },
      { name: "Quarterly Detail", rows: [...rows] },
    ],
  };
}
