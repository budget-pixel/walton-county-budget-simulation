const departmentBudgetBaseline = [
  { id: "board-of-county-commissioners", name: "Board of County Commissioners", personnelBudget: 2653423, operatingBudget: 8703609, capitalBudget: 1655000, fteCount: 10.5 },
  { id: "county-administration", name: "County Administration", personnelBudget: 2071000, operatingBudget: 134000, capitalBudget: 65000, fteCount: 16 },
  { id: "engineering-services", name: "Engineering Services", personnelBudget: 2249000, operatingBudget: 251000, capitalBudget: 45000, fteCount: 15 },
  { id: "building-construction-and-maintenance", name: "Building Construction and Maintenance", personnelBudget: 5442755, operatingBudget: 3681245, capitalBudget: 1576000, fteCount: 68 },
  { id: "geographic-info-systems", name: "Geographic Info Systems", personnelBudget: 688075, operatingBudget: 156925, capitalBudget: 0, fteCount: 6 },
  { id: "human-resources", name: "Human Resources", personnelBudget: 1259447, operatingBudget: 139553, capitalBudget: 31000, fteCount: 13 },
  { id: "office-of-the-county-attorney", name: "Office of the County Attorney", personnelBudget: 1240000, operatingBudget: 750000, capitalBudget: 0, fteCount: 10 },
  { id: "office-of-management-and-budget", name: "Office of Management and Budget", personnelBudget: 969250, operatingBudget: 325750, capitalBudget: 0, fteCount: 7 },
  { id: "planning", name: "Planning", personnelBudget: 4932975, operatingBudget: 2178025, capitalBudget: 209000, fteCount: 47 },
  { id: "procurement", name: "Procurement", personnelBudget: 914200, operatingBudget: 95800, capitalBudget: 90000, fteCount: 10 },
  { id: "property-appraiser", name: "Property Appraiser", personnelBudget: 4422000, operatingBudget: 750000, capitalBudget: 0, fteCount: 38 },
  { id: "tax-collector", name: "Tax Collector", personnelBudget: 4000, operatingBudget: 8445400, capitalBudget: 0, fteCount: 40 },
  { id: "supervisor-of-elections", name: "Supervisor of Elections", personnelBudget: 1198763, operatingBudget: 348682, capitalBudget: 91420, fteCount: 10 },
  { id: "clerk-of-court", name: "Clerk of Court", personnelBudget: 4905230, operatingBudget: 1845945, capitalBudget: 120000, fteCount: 80 },
  { id: "medical-examiner", name: "Medical Examiner", personnelBudget: 0, operatingBudget: 1100000, capitalBudget: 0, fteCount: 0 },
  { id: "south-walton-fire-district", name: "South Walton Fire District", personnelBudget: 0, operatingBudget: 947284, capitalBudget: 0, fteCount: 0 },
  { id: "sheriffs-office", name: "Sheriff's Office", personnelBudget: 83607042, operatingBudget: 21348864, capitalBudget: 9160322, fteCount: 669 },
  { id: "code-compliance", name: "Code Compliance", personnelBudget: 4140090, operatingBudget: 551110, capitalBudget: 148800, fteCount: 43 },
  { id: "emergency-management", name: "Emergency Management", personnelBudget: 711871, operatingBudget: 178129, capitalBudget: 30000, fteCount: 6 },
  { id: "probation-services", name: "Probation Services", personnelBudget: 330950, operatingBudget: 41050, capitalBudget: 0, fteCount: 4 },
  { id: "veteran-services", name: "Veteran Services", personnelBudget: 300074, operatingBudget: 17926, capitalBudget: 0, fteCount: 3 },
  { id: "eagle-springs-golf-and-recreation-center", name: "Eagle Springs Golf and Recreation Center", personnelBudget: 1009500, operatingBudget: 696500, capitalBudget: 506000, fteCount: 12.5 },
  { id: "eagle-springs-grill", name: "Eagle Springs Grill", personnelBudget: 385100, operatingBudget: 184900, capitalBudget: 0, fteCount: 6 },
  { id: "libraries", name: "Libraries", personnelBudget: 1627000, operatingBudget: 380000, capitalBudget: 250000, fteCount: 22.5 },
  { id: "recreation", name: "Recreation", personnelBudget: 596837, operatingBudget: 241163, capitalBudget: 230000, fteCount: 6 },
  { id: "state-attorney", name: "State Attorney", personnelBudget: 0, operatingBudget: 25000, capitalBudget: 0, fteCount: 0 },
  { id: "public-defender", name: "Public Defender", personnelBudget: 0, operatingBudget: 36000, capitalBudget: 0, fteCount: 0 },
  { id: "county-court", name: "County Court", personnelBudget: 65856, operatingBudget: 4200, capitalBudget: 0, fteCount: 0 },
  { id: "circuit-court", name: "Circuit Court", personnelBudget: 224093, operatingBudget: 37400, capitalBudget: 0, fteCount: 1 },
  { id: "guardian-ad-litem", name: "Guardian Ad Litem", personnelBudget: 0, operatingBudget: 9000, capitalBudget: 0, fteCount: 0 },
  { id: "human-services", name: "Human Services", personnelBudget: 0, operatingBudget: 175000, capitalBudget: 0, fteCount: 0 },
  { id: "environmental-services", name: "Environmental Services", personnelBudget: 452909, operatingBudget: 202091, capitalBudget: 195000, fteCount: 4 },
  { id: "extension-office", name: "Extension Office", personnelBudget: 515605, operatingBudget: 39395, capitalBudget: 40000, fteCount: 8.5 },
  { id: "soil-conservation", name: "Soil Conservation", personnelBudget: 148520, operatingBudget: 1480, capitalBudget: 0, fteCount: 2 }
];

const nonFteAdjustableDepartmentIds = [
  "tax-collector",
  "supervisor-of-elections",
  "clerk-of-court",
  "sheriffs-office",
  "property-appraiser"
];

const activeFteDepartments = departmentBudgetBaseline
  .filter((department) => department.fteCount > 0)
  .map((department) => ({
    id: department.id,
    name: department.name,
    fteCount: department.fteCount,
    historicalFte: {
      fy2024: department.fteCount,
      fy2025: department.fteCount,
      fy2026: department.fteCount,
      fy2027: department.fteCount
    }
  }));

const excludedFteDepartments = [
  { id: "building-department", name: "Building Department", fteCount: 21 },
  { id: "mosquito-control", name: "Mosquito Control", fteCount: 9 },
  { id: "public-works", name: "Public Works", fteCount: 148 },
  { id: "solid-waste", name: "Solid Waste", fteCount: 27 },
  { id: "tourism-administration", name: "Tourism Administration", fteCount: 4 },
  { id: "tourism-beach-operations", name: "Tourism Beach Operations", fteCount: 67 }
];

const enrichDepartment = (department) => {
  const totalBudget = department.personnelBudget + department.operatingBudget + department.capitalBudget;
  const averageFteCost = department.fteCount > 0 ? Math.round(department.personnelBudget / department.fteCount) : 0;

  return {
    ...department,
    totalBudget,
    averageFteCost,
    nonFteAdjustable: nonFteAdjustableDepartmentIds.includes(department.id),
    excludedFromActiveSimulation: false
  };
};

const activeDepartments = departmentBudgetBaseline.map(enrichDepartment);

const itemizedCapitalProjects = [
  { id: "bocc-suv", name: "Sport Utility Vehicle", departmentId: "board-of-county-commissioners", cost: 65000 },
  { id: "bcm-crew-cab-trucks", name: "Crew Cab Trucks", departmentId: "building-construction-and-maintenance", cost: 360000 },
  { id: "bcm-vans", name: "Maintenance Vans", departmentId: "building-construction-and-maintenance", cost: 260000 },
  { id: "bcm-lawn-mowers", name: "Commercial Lawn Mowers", departmentId: "building-construction-and-maintenance", cost: 115000 },
  { id: "code-crew-cab-trucks", name: "Crew Cab Trucks", departmentId: "code-compliance", cost: 96000 },
  { id: "code-utvs", name: "Utility Terrain Vehicles", departmentId: "code-compliance", cost: 52800 },
  { id: "county-admin-suv", name: "Sport Utility Vehicle", departmentId: "county-administration", cost: 65000 },
  { id: "eagle-reel-grinder", name: "Reel Grinder", departmentId: "eagle-springs-golf-and-recreation-center", cost: 86000 },
  { id: "eagle-golf-lift", name: "Golf Lift", departmentId: "eagle-springs-golf-and-recreation-center", cost: 42000 },
  { id: "emergency-management-equipment", name: "Emergency Management Equipment", departmentId: "emergency-management", cost: 30000 },
  { id: "engineering-crew-cab", name: "4x4 Crew Cab Truck", departmentId: "engineering-services", cost: 45000 },
  { id: "environmental-atv-trailer", name: "ATV Trailer", departmentId: "environmental-services", cost: 18000 },
  { id: "environmental-side-by-side", name: "ATV Side-by-side", departmentId: "environmental-services", cost: 32000 },
  { id: "environmental-vessel-trailer", name: "Vessel and Associated Trailer", departmentId: "environmental-services", cost: 145000 },
  { id: "extension-crew-cab", name: "4x4 Crew Cab Truck", departmentId: "extension-office", cost: 40000 },
  { id: "human-resources-suv", name: "Sport Utility Vehicle", departmentId: "human-resources", cost: 31000 },
  { id: "planning-suv-one", name: "Planning Sport Utility Vehicle", departmentId: "planning", cost: 68000 },
  { id: "planning-suv-two", name: "Planning Sport Utility Vehicle", departmentId: "planning", cost: 68000 },
  { id: "libraries-capital-equipment", name: "Library Capital Equipment", departmentId: "libraries", cost: 250000 },
  { id: "recreation-capital-equipment", name: "Recreation Capital Equipment", departmentId: "recreation", cost: 230000 }
];

const personnelBudgetTotal = activeDepartments.reduce((total, department) => total + department.personnelBudget, 0);
const operatingBudgetTotal = activeDepartments.reduce((total, department) => total + department.operatingBudget, 0);
const capitalBudgetTotal = activeDepartments.reduce((total, department) => total + department.capitalBudget, 0);
const totalBudgetBaseline = activeDepartments.reduce((total, department) => total + department.totalBudget, 0);
const adValoremSupportedExpenseBaseline = 163473140;

const constitutionalOfficeIds = [
  "sheriffs-office",
  "clerk-of-court",
  "tax-collector",
  "property-appraiser",
  "supervisor-of-elections"
];

const excludedScenarioDepartmentIds = [
  "medical-examiner",
  "state-attorney",
  "public-defender",
  "county-court",
  "circuit-court",
  "guardian-ad-litem",
  "human-services"
];

const personnelCostFactors = [
  {
    id: "baseSalary",
    label: "Base Wage / Salaries",
    amount: 19957791.98,
    percentOfTotal: 66.10,
    note: "Base wage and salary cost is shown as a share of total personnel cost."
  },
  {
    id: "cola",
    label: "Wage Adjustment / COLA-type adjustment",
    amount: 598733.76,
    percentOfTotal: 1.98,
    baseWagePercent: 3.00,
    note: "The COLA is effectively 3.00% of base wage/salary cost: $598,733.76 / $19,957,791.98 = 3.00%. When expressed as a share of total personnel cost, the denominator includes salaries, COLA, FICA/Medicare taxes, retirement, insurance, allowances, and other personnel costs. Therefore, $598,733.76 / $30,191,784.22 = 1.98%. In plain language: the COLA is a 3% increase to salaries, but it represents only 1.98% of total personnel cost because total personnel cost includes benefits and taxes in addition to salaries."
  },
  {
    id: "ficaMedicare",
    label: "Taxes / FICA-Medicare-type costs",
    amount: 1568650.24,
    percentOfTotal: 5.20,
    note: "Taxes / FICA-Medicare-type costs are calculated on wage-related compensation but are shown here as a share of total personnel cost. The total personnel cost denominator includes wages, wage adjustments, taxes, retirement, insurance, and other benefits."
  },
  {
    id: "retirement",
    label: "Retirement",
    amount: 3203324.21,
    percentOfTotal: 10.61,
    note: "Retirement reflects employer retirement contribution costs. It is shown as a share of total personnel cost, not as a rate applied only to wages."
  },
  {
    id: "insurance",
    label: "Insurance",
    amount: 4721059.02,
    percentOfTotal: 15.64,
    note: "Insurance reflects employer health insurance and related benefit costs. It is shown as a share of total personnel cost."
  },
  {
    id: "other",
    label: "Other",
    amount: 64725.00,
    percentOfTotal: 0.21,
    note: "Other includes smaller personnel-related costs or allowances that are part of total personnel cost but are not separately categorized above."
  }
];

const personnelCostDrivers = Object.fromEntries(
  personnelCostFactors.map((factor) => [factor.id, factor.percentOfTotal / 100])
);

const millageAssumptions = {
  adoptedMillage: 3.519,
  taxableValueBase: 46454430401,
  fy2026BudgetedAdValoremRevenue: 155766296
};

const propertyTaxCategories = [
  { name: "Sheriff Operations", departmentId: "sheriffs-office", allocation: 90922236, fundingType: "full" },
  { name: "Capital Infrastructure", departmentId: "board-of-county-commissioners", allocation: 13425788, fundingType: "full" },
  { name: "Board of County Commissioners", departmentId: "board-of-county-commissioners", allocation: 12545354, fundingType: "full" },
  { name: "Sheriff Infrastructure", departmentId: "sheriffs-office", allocation: 6494163, fundingType: "full" },
  { name: "Clerk of Court", departmentId: "clerk-of-court", allocation: 5725231, fundingType: "full" },
  { name: "Property Appraiser", departmentId: "property-appraiser", allocation: 4918865, fundingType: "full" },
  { name: "Tax Collector", departmentId: "tax-collector", allocation: 4313423, fundingType: "full" },
  { name: "Supervisor of Elections", departmentId: "supervisor-of-elections", allocation: 1543630, fundingType: "full" },
  { name: "Building Construction and Maintenance", departmentId: "building-construction-and-maintenance", allocation: 1013592, fundingType: "partial" },
  { name: "Planning", departmentId: "planning", allocation: 462240, fundingType: "partial" },
  { name: "Libraries", departmentId: "libraries", allocation: 213107, fundingType: "partial" },
  { name: "Engineering Services", departmentId: "engineering-services", allocation: 190138, fundingType: "partial" },
  { name: "County Administration", departmentId: "county-administration", allocation: 216347, fundingType: "partial" },
  { name: "Human Resources", departmentId: "human-resources", allocation: 136289, fundingType: "partial" },
  { name: "Office of Management and Budget", departmentId: "office-of-management-and-budget", allocation: 123423, fundingType: "partial" },
  { name: "Emergency Management", departmentId: "emergency-management", allocation: 87682, fundingType: "partial" },
  { name: "Environmental Services", departmentId: "environmental-services", allocation: 81011, fundingType: "partial" },
  { name: "Recreation", departmentId: "recreation", allocation: 65572, fundingType: "partial" },
  { name: "Code Compliance", departmentId: "code-compliance", allocation: 43697, fundingType: "partial" },
  { name: "Eagle Springs Golf", departmentId: "eagle-springs-golf-and-recreation-center", allocation: 77389, fundingType: "partial" },
  { name: "Veteran Services", departmentId: "veteran-services", allocation: 318000, fundingType: "partial" },
  { name: "Extension Office", departmentId: "extension-office", allocation: 554787, fundingType: "full" },
  { name: "Probation Services", departmentId: "probation-services", allocation: 157000, fundingType: "full" },
  { name: "Soil Conservation", departmentId: "soil-conservation", allocation: 150000, fundingType: "full" }
];

const sampleParcels = [
  { parcel: "00-2S-19-24000-001-0000", address: "176 Montgomery Cir", city: "DeFuniak Springs", zip: "32435", homestead: "HX", justValue: 475000, taxableValue: 295000 },
  { parcel: "24-3S-19-25000-004-0120", address: "123 Seaside Ave", city: "Santa Rosa Beach", zip: "32459", homestead: "HX", justValue: 925000, taxableValue: 525000 },
  { parcel: "31-2S-20-33000-010-0010", address: "88 Bay Grove Rd", city: "Freeport", zip: "32439", homestead: "HX", justValue: 385000, taxableValue: 245000 },
  { parcel: "16-3N-21-37000-005-0020", address: "450 Lakeview Dr", city: "Paxton", zip: "32538", homestead: "HX", justValue: 310000, taxableValue: 198000 }
];

const budgetData = {
  baselineYear: "FY2026-2027",
  scenarioYear: "FY2028",
  revenueForecast: {
    baseYear: "FY2027",
    baseRevenue: 163473140,
    defaultAssumptions: {
      futureRevenueGrowthRate: 0.01,
      fy2028RevenueReduction: 5700000,
      fy2029RevenueReduction: 9700000
    },
    fixedGrowthRates: {
      fy2028: 0.03,
      fy2029: 0.02
    },
    forecastYears: ["FY2027", "FY2028", "FY2029", "FY2030", "FY2031", "FY2032"]
  },
  budgetBaselineTotals: {
    personnelBudgetTotal,
    operatingBudgetTotal,
    capitalBudgetTotal,
    totalBudgetBaseline,
    adValoremSupportedExpenseBaseline
  },
  assumptions: {
    baselineYear: "FY2026-2027",
    scenarioYear: "FY2028",
    revenueAssumptions: [
      "FY2026 base revenue is $163,473,140.",
      "FY2027 revenue equals the FY2026 base amount minus the first revenue reduction, with no rate adjustment.",
      "FY2028 revenue equals the reduced FY2027 amount minus the second revenue reduction, with no rate adjustment.",
      "FY2029 through FY2032 revenue uses the editable future revenue growth rate."
    ],
    methodology: [
      "The projected revenue shortfall is calculated as the difference between the internal no-reduction revenue baseline and the reduced revenue scenario.",
      "Reductions are calculated only from user selections and are not recommendations.",
      "Total selected reductions are capped at the projected revenue shortfall.",
      "Excluded departments are retained as context and are not included in active scenario reduction controls."
    ],
    formulas: [
      { name: "Total Budget", formula: "Personnel Budget + Operating Budget + Capital Budget" },
      { name: "Average FTE Cost", formula: "Personnel Budget / FTE Count; zero when FTE Count is zero" },
      { name: "Revenue Shortfall", formula: "Internal No-Reduction Revenue Baseline - Revenue" },
      { name: "Personnel Reduction", formula: "FTE Reduction x Average Cost Per FTE" },
      { name: "Operating Reduction", formula: "Operating Budget x Reduction Percentage" },
      { name: "Capital Reduction", formula: "Sum of Removed Capital Project Costs" },
      { name: "Remaining Revenue Shortfall", formula: "Revenue Shortfall - Total Reductions, not less than zero" }
    ]
  },
  departments: activeDepartments,
  activeFteDepartments,
  excludedFteDepartments,
  nonFteAdjustableDepartmentIds,
  constitutionalOfficeIds,
  excludedScenarioDepartmentIds,
  personnelCostDrivers,
  millageAssumptions,
  personnelCostFactors,
  propertyTaxCategories,
  sampleParcels,
  capitalProjects: itemizedCapitalProjects
};
