const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const currencyInputFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1
});

const historicalAdValoremRevenue = [
  { year: "FY2022", revenue: 89972682, type: "Actual" },
  { year: "FY2023", revenue: 110875024, type: "Actual" },
  { year: "FY2024", revenue: 131679989, type: "Actual" },
  { year: "FY2025", revenue: 149437335, type: "Actual" },
  { year: "FY2026", revenue: 152900634, type: "Budget" }
];

const state = {
  revenueAssumptions: { ...budgetData.revenueForecast.defaultAssumptions },
  fteReductions: {},
  operatingReductions: {},
  keptProjects: {},
  departmentFiscalYear: "FY2027 Budget",
  overviewFiscalYear: "FY2025",
  rankingType: "support",
  rankingSearch: ""
};

const historicalFundingData = window.historicalDepartmentFunding || [];
const historicalFundingReconciliation = window.historicalAdValoremReconciliation || [];
const historicalMethodologyText = window.historicalFundingMethodology || "";

let trendChart;
let shortfallChart;

function formatCurrency(value) {
  return currencyFormatter.format(Math.round(Number(value || 0)));
}

function formatCurrencyInput(value) {
  return currencyInputFormatter.format(Number(value || 0));
}

function parseCurrencyInput(value) {
  return Number(String(value || "").replace(/[^0-9.-]/g, "")) || 0;
}

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatPercent(value) {
  return `${percentFormatter.format(Number(value || 0))}%`;
}

function hasValue(value) {
  return typeof value === "number" && value !== 0;
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getHistoricalSupportedExpense(year) {
  const reconciliationRecord = historicalFundingReconciliation.find((item) => item.fiscalYear === year);

  if (reconciliationRecord && typeof reconciliationRecord.adValoremRevenue === "number") {
    return reconciliationRecord.adValoremRevenue;
  }

  return historicalFundingData.reduce((total, department) => {
    const record = department.history.find((item) => item.fiscalYear === year);
    return total + Number(record?.adValoremSupport || 0);
  }, 0);
}

function getFiscalYears() {
  const baseRevenue = budgetData.revenueForecast.baseRevenue;
  const futureGrowth = Number(state.revenueAssumptions.futureRevenueGrowthRate || 0);
  const fy2028Reduction = Number(state.revenueAssumptions.fy2028RevenueReduction || 0);
  const fy2029Reduction = Number(state.revenueAssumptions.fy2029RevenueReduction || 0);
  const supportedExpenseBaseline = budgetData.budgetBaselineTotals.totalBudgetBaseline;

  const fy2027 = baseRevenue;
  const fy2028Baseline = fy2027 * (1 + budgetData.revenueForecast.fixedGrowthRates.fy2028);
  const fy2028 = fy2028Baseline - fy2028Reduction;
  const fy2029Baseline = fy2028Baseline * (1 + budgetData.revenueForecast.fixedGrowthRates.fy2029);
  const fy2029 = fy2028 * (1 + budgetData.revenueForecast.fixedGrowthRates.fy2029) - fy2029Reduction;
  const fy2030Baseline = fy2029Baseline * (1 + futureGrowth);
  const fy2030 = fy2029 * (1 + futureGrowth);
  const fy2031Baseline = fy2030Baseline * (1 + futureGrowth);
  const fy2031 = fy2030 * (1 + futureGrowth);
  const fy2032Baseline = fy2031Baseline * (1 + futureGrowth);
  const fy2032 = fy2031 * (1 + futureGrowth);

  const historicalYears = historicalAdValoremRevenue.map((item) => ({
    year: item.year,
    revenue: item.revenue,
    baselineRevenue: item.revenue,
    revenueShortfall: 0,
    supportedExpense: item.year === "FY2026" ? null : getHistoricalSupportedExpense(item.year),
    projectedSupportedExpense: null,
    revenueReduction: 0,
    type: item.type,
    historical: true
  }));

  const forecastYears = [
    { year: "FY2027", revenue: fy2027, baselineRevenue: fy2027, revenueShortfall: 0, supportedExpense: null, projectedSupportedExpense: supportedExpenseBaseline, revenueReduction: 0, type: "Forecast", historical: false },
    { year: "FY2028", revenue: fy2028, baselineRevenue: fy2028Baseline, revenueShortfall: fy2028Baseline - fy2028, supportedExpense: null, projectedSupportedExpense: supportedExpenseBaseline, revenueReduction: fy2028Reduction, type: "Forecast", historical: false },
    { year: "FY2029", revenue: fy2029, baselineRevenue: fy2029Baseline, revenueShortfall: fy2029Baseline - fy2029, supportedExpense: null, projectedSupportedExpense: supportedExpenseBaseline, revenueReduction: fy2029Reduction, type: "Forecast", historical: false },
    { year: "FY2030", revenue: fy2030, baselineRevenue: fy2030Baseline, revenueShortfall: fy2030Baseline - fy2030, supportedExpense: null, projectedSupportedExpense: supportedExpenseBaseline, revenueReduction: 0, type: "Forecast", historical: false },
    { year: "FY2031", revenue: fy2031, baselineRevenue: fy2031Baseline, revenueShortfall: fy2031Baseline - fy2031, supportedExpense: null, projectedSupportedExpense: supportedExpenseBaseline, revenueReduction: 0, type: "Forecast", historical: false },
    { year: "FY2032", revenue: fy2032, baselineRevenue: fy2032Baseline, revenueShortfall: fy2032Baseline - fy2032, supportedExpense: null, projectedSupportedExpense: supportedExpenseBaseline, revenueReduction: 0, type: "Forecast", historical: false }
  ];

  return [...historicalYears, ...forecastYears];
}

function getForecastYears() {
  return getFiscalYears().filter((year) => !year.historical);
}

function getProjectedShortfallYears() {
  return getForecastYears().filter((year) => year.year !== "FY2027");
}

function getScenario() {
  return getForecastYears().find((year) => year.year === budgetData.scenarioYear);
}

function getRevenueShortfall() {
  return Math.max(getScenario().revenueShortfall, 0);
}

function isFteAdjustable(department) {
  return department.fteCount > 0 && !department.nonFteAdjustable;
}

function getDepartmentName(departmentId) {
  const department = budgetData.departments.find((item) => item.id === departmentId);
  return department ? department.name : "Countywide";
}

function getScenarioTotals() {
  const revenueShortfall = getRevenueShortfall();
  let personnelReductions = 0;
  let operatingReductions = 0;

  const departmentImpacts = budgetData.departments.map((department) => {
    const fteReduction = isFteAdjustable(department) ? Number(state.fteReductions[department.id] || 0) : 0;
    const operatingPercent = Number(state.operatingReductions[department.id] || 0);
    const personnelReduction = fteReduction * department.averageFteCost;
    const operatingReductionAmount = department.operatingBudget * (operatingPercent / 100);

    personnelReductions += personnelReduction;
    operatingReductions += operatingReductionAmount;

    return {
      department,
      fteReduction,
      operatingReduction: operatingPercent,
      personnelReduction,
      operatingReductionAmount,
      totalReduction: personnelReduction + operatingReductionAmount
    };
  });

  const capitalReductions = budgetData.capitalProjects.reduce((total, project) => {
    return state.keptProjects[project.id] ? total : total + project.cost;
  }, 0);

  const totalReductions = personnelReductions + operatingReductions + capitalReductions;
  const remainingShortfall = Math.max(revenueShortfall - totalReductions, 0);

  return {
    revenueShortfall,
    personnelReductions,
    operatingReductions,
    capitalReductions,
    totalReductions,
    remainingShortfall,
    departmentImpacts
  };
}

function getCurrentReductionForControl(controlType, id) {
  if (controlType === "fte") {
    const department = budgetData.departments.find((item) => item.id === id);
    return department ? Number(state.fteReductions[id] || 0) * department.averageFteCost : 0;
  }

  if (controlType === "operating") {
    const department = budgetData.departments.find((item) => item.id === id);
    return department ? department.operatingBudget * (Number(state.operatingReductions[id] || 0) / 100) : 0;
  }

  if (controlType === "capital") {
    const project = budgetData.capitalProjects.find((item) => item.id === id);
    return project && !state.keptProjects[id] ? project.cost : 0;
  }

  return 0;
}

function getAvailableShortfallExcluding(controlType, id) {
  const totals = getScenarioTotals();
  return Math.max(totals.revenueShortfall - (totals.totalReductions - getCurrentReductionForControl(controlType, id)), 0);
}

function clampFteReduction(department, requestedFteReduction) {
  const available = getAvailableShortfallExcluding("fte", department.id);
  const maxFteByShortfall = department.averageFteCost > 0 ? Math.floor((available / department.averageFteCost) * 2) / 2 : 0;
  return Math.min(Math.max(requestedFteReduction, 0), department.fteCount, maxFteByShortfall);
}

function clampOperatingReduction(department, requestedPercentReduction) {
  const available = getAvailableShortfallExcluding("operating", department.id);
  const maxPercentByShortfall = department.operatingBudget > 0 ? Math.floor((available / department.operatingBudget) * 100) : 0;
  return Math.min(Math.max(requestedPercentReduction, 0), 100, maxPercentByShortfall);
}

function getDepartmentHistoricalRecord(departmentName, fiscalYear) {
  const department = historicalFundingData.find((item) => item.department === departmentName);
  return department?.history.find((record) => record.fiscalYear === fiscalYear) || null;
}

function getRankingRows() {
  return budgetData.departments.map((department) => {
    const historicalRecord = getDepartmentHistoricalRecord(department.name, "FY2025");
    const netExpense = Number(historicalRecord?.netExpense || 0);
    const adValoremSupport = Number(historicalRecord?.adValoremSupport || 0);
    const dependency = netExpense > 0 ? (adValoremSupport / netExpense) * 100 : 0;

    return {
      department,
      adValoremSupport,
      dependency,
      fte: department.fteCount,
      budget: department.totalBudget
    };
  });
}

function getSortedRankingRows(limit) {
  const query = state.rankingSearch.trim().toLowerCase();
  const rows = getRankingRows().filter((row) => row.department.name.toLowerCase().includes(query));
  const sortKeys = {
    support: "adValoremSupport",
    dependency: "dependency",
    fte: "fte",
    budget: "budget"
  };
  const sortKey = sortKeys[state.rankingType] || "adValoremSupport";
  const sorted = rows.sort((a, b) => b[sortKey] - a[sortKey]);
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

function renderBrand() {
  const brandMount = document.querySelector("#brandMount");
  if (brandMount && window.WaltonSplitLogo) {
    window.WaltonSplitLogo.injectStyles();
    brandMount.innerHTML = window.WaltonSplitLogo.getHtml("#overview", "Walton County Budget Simulation home");
  }
}

function renderHero() {
  const scenario = getScenario();
  document.querySelector("#heroRevenueReduction").textContent = formatCurrency(state.revenueAssumptions.fy2028RevenueReduction);
  document.querySelector("#heroRevenueShortfall").textContent = formatCurrency(scenario.revenueShortfall);
}

function renderTopServices() {
  const container = document.querySelector("#topServicesBars");
  const rows = budgetData.departments.map((department) => {
    const record = getDepartmentHistoricalRecord(department.name, state.overviewFiscalYear);
    return {
      department,
      value: Number(record?.adValoremSupport || 0)
    };
  }).filter((row) => row.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  container.innerHTML = rows.map((row, index) => {
    const width = Math.max((row.value / maxValue) * 100, 3);
    return `
      <div class="ranked-bar-row">
        <div class="ranked-label"><strong>${index + 1}. ${row.department.name}</strong><span>${formatCurrency(row.value)}</span></div>
        <div class="ranked-track"><div class="ranked-fill" style="width:${width}%"></div></div>
      </div>
    `;
  }).join("");
}

function renderRankings() {
  const rows = getSortedRankingRows();
  const cardRows = rows.slice(0, 5);

  document.querySelector("#rankingCards").innerHTML = cardRows.map((row, index) => `
    <article class="ranking-card">
      <span>${index + 1}</span>
      <div>
        <strong>${row.department.name}</strong>
        <p>Ad valorem support: ${formatCurrency(row.adValoremSupport)} | Dependency: ${formatPercent(row.dependency)}</p>
      </div>
    </article>
  `).join("");

  document.querySelector("#rankingTable").innerHTML = rows.map((row) => `
    <tr>
      <td><strong>${row.department.name}</strong></td>
      <td>${formatCurrency(row.adValoremSupport)}</td>
      <td>${formatPercent(row.dependency)}</td>
      <td>${formatNumber(row.fte)}</td>
      <td>${formatCurrency(row.budget)}</td>
    </tr>
  `).join("");
}

function detailItem(label, value, formatter = formatCurrency) {
  return `
    <div class="detail-item">
      <span>${label}</span>
      <strong>${formatter(value)}</strong>
    </div>
  `;
}

function historicalDetailItems(record) {
  const dependency = record.netExpense > 0 ? (record.adValoremSupport / record.netExpense) * 100 : 0;
  return [
    detailItem("Gross Expense", record.grossExpense),
    detailItem("Department Revenue", record.departmentRevenue),
    detailItem("Net Expense", record.netExpense),
    detailItem("Ad Valorem Support", record.adValoremSupport),
    detailItem("Ad Valorem Dependency", dependency, formatPercent)
  ].join("");
}

function budgetDetailItems(department) {
  return [
    detailItem("Personnel Budget", department.personnelBudget),
    detailItem("Operating Budget", department.operatingBudget),
    detailItem("Capital Budget", department.capitalBudget),
    detailItem("Total Budget", department.totalBudget),
    detailItem("FTE Count", department.fteCount, formatNumber),
    detailItem("Average Personnel Cost", department.averageFteCost)
  ].join("");
}

function renderDepartmentCards() {
  const container = document.querySelector("#departmentCards");
  const departmentsByName = new Map(budgetData.departments.map((department) => [department.name, department]));
  const historicalNames = historicalFundingData.map((department) => department.department);
  const departmentNames = Array.from(new Set([...budgetData.departments.map((department) => department.name), ...historicalNames])).sort((a, b) => a.localeCompare(b));

  container.innerHTML = departmentNames.map((departmentName) => {
    const department = departmentsByName.get(departmentName);
    const historicalRecord = getDepartmentHistoricalRecord(departmentName, state.departmentFiscalYear);
    const isBudgetYear = state.departmentFiscalYear === "FY2027 Budget";
    const primaryLabel = isBudgetYear ? "FY2027 Total Budget" : "Ad Valorem Support";
    const primaryValue = isBudgetYear ? department?.totalBudget : historicalRecord?.adValoremSupport;
    const details = isBudgetYear
      ? (department ? budgetDetailItems(department) : "")
      : (historicalRecord ? historicalDetailItems(historicalRecord) : "");

    return `
      <article class="panel department-card">
        <div>
          <h3>${departmentName}</h3>
          ${!department ? '<p class="historical-note">Historical-only department; excluded from scenario reduction controls.</p>' : ""}
        </div>
        <div class="department-primary-metric">
          <span>${primaryLabel}</span>
          <strong>${typeof primaryValue === "number" ? formatCurrency(primaryValue) : "Not available"}</strong>
        </div>
        <div class="detail-grid">${details || '<p class="historical-note">No record available for this fiscal year.</p>'}</div>
      </article>
    `;
  }).join("");
}

function renderPersonnelControls() {
  const container = document.querySelector("#personnelControls");
  container.innerHTML = budgetData.departments.filter(isFteAdjustable).map((department) => {
    state.fteReductions[department.id] = Number(state.fteReductions[department.id] || 0);
    return `
      <tr>
        <td><strong>${department.name}</strong></td>
        <td>${formatNumber(department.fteCount)}</td>
        <td>${formatCurrency(department.averageFteCost)}</td>
        <td>
          <input type="number" min="0" max="${department.fteCount}" step="0.5" value="${state.fteReductions[department.id]}" data-control="fte" data-department="${department.id}" aria-label="FTE reduction for ${department.name}">
        </td>
        <td id="personnel-reduction-${department.id}">${formatCurrency(0)}</td>
      </tr>
    `;
  }).join("");
}

function renderOperatingControls() {
  const container = document.querySelector("#operatingControls");
  container.innerHTML = budgetData.departments.filter((department) => department.operatingBudget > 0).map((department) => {
    state.operatingReductions[department.id] = Number(state.operatingReductions[department.id] || 0);
    return `
      <div class="slider-row">
        <div>
          <label for="operating-${department.id}">${department.name}</label>
          <div class="slider-meta">Operating budget: ${formatCurrency(department.operatingBudget)}</div>
        </div>
        <input id="operating-${department.id}" type="range" min="0" max="100" step="1" value="${state.operatingReductions[department.id]}" data-control="operating" data-department="${department.id}">
        <div class="percent-pill" id="operating-percent-${department.id}">0%</div>
      </div>
    `;
  }).join("");
}

function renderCapitalControls() {
  const container = document.querySelector("#capitalControls");
  container.innerHTML = budgetData.capitalProjects.map((project) => {
    if (typeof state.keptProjects[project.id] === "undefined") {
      state.keptProjects[project.id] = true;
    }

    return `
      <div class="project-card">
        <input id="project-${project.id}" type="checkbox" ${state.keptProjects[project.id] ? "checked" : ""} data-control="capital" data-project="${project.id}">
        <div>
          <label for="project-${project.id}">${project.name}</label>
          <p>${getDepartmentName(project.departmentId)} | ${formatCurrency(project.cost)}</p>
        </div>
      </div>
    `;
  }).join("");
}

function renderRevenueAssumptionsPanel() {
  const container = document.querySelector("#revenueAssumptionControls");
  container.innerHTML = `
    <label class="assumption-control" for="futureRevenueGrowthRate">
      <span>Revenue Growth Rate</span>
      <input id="futureRevenueGrowthRate" type="number" min="-10" max="10" step="0.1" value="${state.revenueAssumptions.futureRevenueGrowthRate * 100}" data-control="revenue-assumption" data-assumption="futureRevenueGrowthRate">
    </label>
    <label class="assumption-control" for="fy2028RevenueReduction">
      <span>FY2028 Revenue Reduction</span>
      <input id="fy2028RevenueReduction" type="text" inputmode="decimal" value="${formatCurrencyInput(state.revenueAssumptions.fy2028RevenueReduction)}" data-control="revenue-assumption" data-assumption="fy2028RevenueReduction" data-format="currency">
    </label>
    <label class="assumption-control" for="fy2029RevenueReduction">
      <span>FY2029 Revenue Reduction</span>
      <input id="fy2029RevenueReduction" type="text" inputmode="decimal" value="${formatCurrencyInput(state.revenueAssumptions.fy2029RevenueReduction)}" data-control="revenue-assumption" data-assumption="fy2029RevenueReduction" data-format="currency">
    </label>
    <div class="forecast-table-wrap">
      <table class="forecast-table">
        <thead>
          <tr>
            <th>Fiscal Year</th>
            <th>Ad Valorem Revenue</th>
            <th>Supported Expense</th>
            <th>Status</th>
            <th>Revenue Shortfall</th>
          </tr>
        </thead>
        <tbody id="forecastTable"></tbody>
      </table>
    </div>
  `;
}

function renderForecastTable() {
  document.querySelector("#forecastTable").innerHTML = getFiscalYears().map((year) => {
    const supportedExpense = year.supportedExpense || year.projectedSupportedExpense;
    const shortfall = year.historical || year.year === "FY2027" ? "-" : formatCurrency(year.revenueShortfall);
    return `
      <tr>
        <td><strong>${year.year}</strong></td>
        <td>${formatCurrency(year.revenue)}</td>
        <td>${supportedExpense ? formatCurrency(supportedExpense) : "-"}</td>
        <td>${year.type}</td>
        <td>${shortfall}</td>
      </tr>
    `;
  }).join("");
}

function renderAssumptions() {
  const revenueAssumptions = budgetData.assumptions.revenueAssumptions;
  const supportedExpenseAssumptions = [
    "FY2022 through FY2025 supported expense values are based on the provided historical ad valorem allocation dataset.",
    "FY2027 projected supported expense equals the current included-department budget baseline used in the simulation.",
    "FY2028 through FY2032 projected supported expense currently holds the FY2027 included-department baseline constant until future expenditure growth assumptions are added."
  ];
  const methodology = [
    ...budgetData.assumptions.methodology,
    "The Building Department, Public Works, Solid Waste, Mosquito Control, Housing and Urban Development, Mossy Head Wastewater Treatment Facility, and Tourism departments are excluded from active scenario controls.",
    "Tax Collector, Supervisor of Elections, Clerk of Court, Sheriff's Office, and Property Appraiser remain visible but are not FTE-adjustable.",
    historicalMethodologyText
  ].filter(Boolean);
  const formulas = [
    ...budgetData.assumptions.formulas,
    { name: "Ad Valorem Dependency", formula: "Ad Valorem Support / Net Expense" }
  ];

  document.querySelector("#revenueAssumptions").innerHTML = revenueAssumptions.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#inflationAssumptions").innerHTML = supportedExpenseAssumptions.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#methodologyList").innerHTML = methodology.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#formulaDefinitions").innerHTML = formulas.map((item) => `
    <div class="formula-item">
      <strong>${item.name}</strong>
      <code>${item.formula}</code>
    </div>
  `).join("");
}

function getLineChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw === null ? "N/A" : formatCurrency(context.raw)}`
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      }
    }
  };
}

function getBarChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw === null ? "N/A" : formatCurrency(context.raw)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      }
    }
  };
}

function renderCharts() {
  Chart.defaults.font.family = "Arial, Helvetica, sans-serif";
  Chart.defaults.color = getCssVar("--color-text-muted");

  const fiscalYears = getFiscalYears();
  const shortfallYears = getProjectedShortfallYears();
  const revenueColor = getCssVar("--color-green");
  const supportColor = getCssVar("--color-charcoal");
  const projectionColor = getCssVar("--color-gold-dark");
  const alertColor = getCssVar("--color-alert");

  trendChart = new Chart(document.querySelector("#trendChart"), {
    type: "line",
    data: {
      labels: fiscalYears.map((year) => year.year),
      datasets: [
        {
          label: "Historical Ad Valorem Revenue",
          data: fiscalYears.map((year) => year.revenue),
          borderColor: revenueColor,
          backgroundColor: "rgba(0, 98, 49, 0.12)",
          tension: 0.25,
          fill: false
        },
        {
          label: "Historical Ad Valorem Supported Expense",
          data: fiscalYears.map((year) => year.supportedExpense),
          borderColor: supportColor,
          backgroundColor: "rgba(48, 54, 54, 0.12)",
          tension: 0.25,
          fill: false,
          spanGaps: false
        },
        {
          label: "Projected Ad Valorem Supported Expense",
          data: fiscalYears.map((year) => year.projectedSupportedExpense),
          borderColor: projectionColor,
          backgroundColor: "rgba(209, 190, 120, 0.18)",
          tension: 0.25,
          fill: false,
          spanGaps: false
        }
      ]
    },
    options: getLineChartOptions()
  });

  shortfallChart = new Chart(document.querySelector("#shortfallChart"), {
    type: "bar",
    data: {
      labels: shortfallYears.map((year) => year.year),
      datasets: [
        {
          label: "Projected Revenue Shortfall",
          data: shortfallYears.map((year) => year.revenueShortfall),
          backgroundColor: alertColor,
          borderColor: alertColor,
          borderWidth: 1
        }
      ]
    },
    options: getBarChartOptions()
  });
}

function updateCharts() {
  const fiscalYears = getFiscalYears();
  const shortfallYears = getProjectedShortfallYears();

  trendChart.data.labels = fiscalYears.map((year) => year.year);
  trendChart.data.datasets[0].data = fiscalYears.map((year) => year.revenue);
  trendChart.data.datasets[1].data = fiscalYears.map((year) => year.supportedExpense);
  trendChart.data.datasets[2].data = fiscalYears.map((year) => year.projectedSupportedExpense);
  trendChart.update();

  shortfallChart.data.labels = shortfallYears.map((year) => year.year);
  shortfallChart.data.datasets[0].data = shortfallYears.map((year) => year.revenueShortfall);
  shortfallChart.update();
}

function updateScenario() {
  const totals = getScenarioTotals();
  const shortfallAddressed = totals.revenueShortfall > 0 ? Math.min(Math.max((totals.totalReductions / totals.revenueShortfall) * 100, 0), 100) : 100;

  renderHero();
  updateCharts();
  renderForecastTable();

  document.querySelector("#startingShortfall").textContent = formatCurrency(totals.revenueShortfall);
  document.querySelector("#resultRevenueShortfall").textContent = formatCurrency(totals.revenueShortfall);
  document.querySelector("#resultSelectedReductions").textContent = formatCurrency(totals.totalReductions);
  document.querySelector("#resultRemainingShortfall").textContent = formatCurrency(totals.remainingShortfall);
  document.querySelector("#shortfallAddressedPercent").textContent = formatPercent(shortfallAddressed);
  document.querySelector("#shortfallProgress").style.width = `${shortfallAddressed}%`;
  document.querySelector("#resultPersonnelReductions").textContent = formatCurrency(totals.personnelReductions);
  document.querySelector("#resultOperatingReductions").textContent = formatCurrency(totals.operatingReductions);
  document.querySelector("#resultCapitalReductions").textContent = formatCurrency(totals.capitalReductions);

  const statusBanner = document.querySelector("#budgetStatus");
  statusBanner.className = "status-banner";

  if (totals.remainingShortfall > 0) {
    statusBanner.classList.add("status-deficit");
    statusBanner.textContent = `${formatCurrency(totals.remainingShortfall)} revenue shortfall remaining`;
  } else {
    statusBanner.classList.add("status-balanced");
    statusBanner.textContent = "Projected revenue shortfall fully addressed";
  }

  totals.departmentImpacts.forEach((impact) => {
    const personnelReductionCell = document.querySelector(`#personnel-reduction-${impact.department.id}`);
    const operatingPercent = document.querySelector(`#operating-percent-${impact.department.id}`);

    if (personnelReductionCell) {
      personnelReductionCell.textContent = formatCurrency(impact.personnelReduction);
    }

    if (operatingPercent) {
      operatingPercent.textContent = formatPercent(impact.operatingReduction);
    }
  });

  document.querySelector("#impactTable").innerHTML = totals.departmentImpacts.map((impact) => `
    <tr>
      <td><strong>${impact.department.name}</strong></td>
      <td>${formatNumber(impact.fteReduction)}</td>
      <td>${formatPercent(impact.operatingReduction)}</td>
      <td>${formatCurrency(impact.personnelReduction)}</td>
      <td>${formatCurrency(impact.operatingReductionAmount)}</td>
      <td>${formatCurrency(impact.totalReduction)}</td>
    </tr>
  `).join("");
}

function bindEvents() {
  document.addEventListener("input", (event) => {
    const target = event.target;

    if (target.dataset.control === "fte") {
      const department = budgetData.departments.find((item) => item.id === target.dataset.department);
      const requestedValue = Math.min(Math.max(Number(target.value || 0), 0), department.fteCount);
      const clampedValue = clampFteReduction(department, requestedValue);
      target.value = clampedValue;
      state.fteReductions[department.id] = clampedValue;
      updateScenario();
    }

    if (target.dataset.control === "operating") {
      const department = budgetData.departments.find((item) => item.id === target.dataset.department);
      const requestedValue = Number(target.value || 0);
      const clampedValue = clampOperatingReduction(department, requestedValue);
      target.value = clampedValue;
      state.operatingReductions[target.dataset.department] = clampedValue;
      updateScenario();
    }

    if (target.dataset.control === "revenue-assumption") {
      const assumption = target.dataset.assumption;
      const value = target.dataset.format === "currency" ? parseCurrencyInput(target.value) : Number(target.value || 0);
      state.revenueAssumptions[assumption] = assumption === "futureRevenueGrowthRate" ? value / 100 : value;
      updateScenario();
    }

    if (target.dataset.control === "ranking-search") {
      state.rankingSearch = target.value;
      renderRankings();
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;

    if (target.dataset.control === "capital") {
      state.keptProjects[target.dataset.project] = target.checked;
      const totals = getScenarioTotals();

      if (!target.checked && totals.totalReductions > totals.revenueShortfall) {
        state.keptProjects[target.dataset.project] = true;
        target.checked = true;
      }

      updateScenario();
    }

    if (target.dataset.control === "revenue-assumption" && target.dataset.format === "currency") {
      target.value = formatCurrencyInput(parseCurrencyInput(target.value));
    }

    if (target.dataset.control === "department-year") {
      state.departmentFiscalYear = target.value;
      renderDepartmentCards();
    }

    if (target.dataset.control === "overview-year") {
      state.overviewFiscalYear = target.value;
      renderTopServices();
    }
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-control='ranking-tab']");

    if (!button) {
      return;
    }

    state.rankingType = button.dataset.ranking;
    document.querySelectorAll("[data-control='ranking-tab']").forEach((item) => item.classList.toggle("active", item === button));
    renderRankings();
  });

  document.addEventListener("blur", (event) => {
    const target = event.target;

    if (target.dataset.control === "revenue-assumption" && target.dataset.format === "currency") {
      target.value = formatCurrencyInput(parseCurrencyInput(target.value));
    }
  }, true);
}

function init() {
  renderBrand();
  renderHero();
  renderTopServices();
  renderRankings();
  renderDepartmentCards();
  renderPersonnelControls();
  renderOperatingControls();
  renderCapitalControls();
  renderRevenueAssumptionsPanel();
  renderAssumptions();
  renderCharts();
  bindEvents();
  updateScenario();
}

init();
