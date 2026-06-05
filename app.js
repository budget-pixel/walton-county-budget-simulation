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

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

const historicalActualRevenues = [
  { year: "FY2022", revenue: 89972682, type: "Actual" },
  { year: "FY2023", revenue: 110875024, type: "Actual" },
  { year: "FY2024", revenue: 131679989, type: "Actual" },
  { year: "FY2025", revenue: 149437335, type: "Actual" },
  { year: "FY2026", revenue: 152900634, type: "Budget" }
];

const state = {
  revenueAssumptions: {
    fy2028ExpenseInflationRate: 0.05,
    futureExpenseInflationRate: 0.03,
    ...budgetData.revenueForecast.defaultAssumptions
  },
  fteReductions: {},
  operatingReductions: {},
  keptProjects: {},
  departmentFiscalYear: "FY2027 Budget",
  overviewFiscalYear: "FY2025",
  rankingTab: "support",
  rankingSearch: "",
  showAllTopServices: false,
  showAllDepartmentCards: false
};

const historicalFundingData = window.historicalDepartmentFunding || [];
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

function getHistoricalSupportedExpense(year) {
  return historicalFundingData.reduce((total, department) => {
    const record = department.history.find((item) => item.fiscalYear === year);
    return total + (record ? record.adValoremSupport : 0);
  }, 0);
}

function getFiscalYears() {
  const baseRevenue = budgetData.revenueForecast.baseRevenue;
  const futureGrowth = Number(state.revenueAssumptions.futureRevenueGrowthRate || 0);
  const fy2028ExpenseInflationRate = Number(state.revenueAssumptions.fy2028ExpenseInflationRate || 0);
  const futureExpenseInflationRate = Number(state.revenueAssumptions.futureExpenseInflationRate || 0);
  const fy2028Reduction = Number(state.revenueAssumptions.fy2028RevenueReduction || 0);
  const fy2029Reduction = Number(state.revenueAssumptions.fy2029RevenueReduction || 0);
  const projectedSupportedExpenseBaseline = budgetData.budgetBaselineTotals.adValoremSupportedExpenseBaseline || budgetData.budgetBaselineTotals.totalBudgetBaseline;

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

  // Projected supported expense with separate first-year and future inflation rates
  const fy2027ProjectedSupportedExpense = projectedSupportedExpenseBaseline;
  const fy2028ProjectedSupportedExpense = fy2027ProjectedSupportedExpense * (1 + fy2028ExpenseInflationRate);
  const fy2029ProjectedSupportedExpense = fy2028ProjectedSupportedExpense * (1 + futureExpenseInflationRate);
  const fy2030ProjectedSupportedExpense = fy2029ProjectedSupportedExpense * (1 + futureExpenseInflationRate);
  const fy2031ProjectedSupportedExpense = fy2030ProjectedSupportedExpense * (1 + futureExpenseInflationRate);
  const fy2032ProjectedSupportedExpense = fy2031ProjectedSupportedExpense * (1 + futureExpenseInflationRate);

  const historicalYears = historicalActualRevenues.map((item) => ({
    year: item.year,
    revenue: item.revenue,
    baselineRevenue: item.revenue,
    revenueShortfall: 0,
    historicalSupportedExpense: item.year === "FY2026" ? null : getHistoricalSupportedExpense(item.year),
    projectedSupportedExpense: null,
    revenueReduction: 0,
    type: item.type,
    historical: true
  }));

  const forecastYears = [
    { year: "FY2027", revenue: fy2027, baselineRevenue: fy2027, revenueShortfall: Math.max(fy2027ProjectedSupportedExpense - fy2027, 0), historicalSupportedExpense: null, projectedSupportedExpense: fy2027ProjectedSupportedExpense, revenueReduction: 0, type: "Forecast", historical: false },
    { year: "FY2028", revenue: fy2028, baselineRevenue: fy2028Baseline, revenueShortfall: Math.max(fy2028ProjectedSupportedExpense - fy2028, 0), historicalSupportedExpense: null, projectedSupportedExpense: fy2028ProjectedSupportedExpense, revenueReduction: fy2028Reduction, type: "Forecast", historical: false },
    { year: "FY2029", revenue: fy2029, baselineRevenue: fy2029Baseline, revenueShortfall: Math.max(fy2029ProjectedSupportedExpense - fy2029, 0), historicalSupportedExpense: null, projectedSupportedExpense: fy2029ProjectedSupportedExpense, revenueReduction: fy2029Reduction, type: "Forecast", historical: false },
    { year: "FY2030", revenue: fy2030, baselineRevenue: fy2030Baseline, revenueShortfall: Math.max(fy2030ProjectedSupportedExpense - fy2030, 0), historicalSupportedExpense: null, projectedSupportedExpense: fy2030ProjectedSupportedExpense, revenueReduction: 0, type: "Forecast", historical: false },
    { year: "FY2031", revenue: fy2031, baselineRevenue: fy2031Baseline, revenueShortfall: Math.max(fy2031ProjectedSupportedExpense - fy2031, 0), historicalSupportedExpense: null, projectedSupportedExpense: fy2031ProjectedSupportedExpense, revenueReduction: 0, type: "Forecast", historical: false },
    { year: "FY2032", revenue: fy2032, baselineRevenue: fy2032Baseline, revenueShortfall: Math.max(fy2032ProjectedSupportedExpense - fy2032, 0), historicalSupportedExpense: null, projectedSupportedExpense: fy2032ProjectedSupportedExpense, revenueReduction: 0, type: "Forecast", historical: false }
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
    const operatingReduction = Number(state.operatingReductions[department.id] || 0);
    const departmentPersonnelReduction = fteReduction * department.averageFteCost;
    const departmentOperatingReduction = department.operatingBudget * (operatingReduction / 100);

    personnelReductions += departmentPersonnelReduction;
    operatingReductions += departmentOperatingReduction;

    return {
      department,
      fteReduction,
      operatingReduction,
      personnelReduction: departmentPersonnelReduction,
      operatingReductionAmount: departmentOperatingReduction,
      totalReduction: departmentPersonnelReduction + departmentOperatingReduction
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

function createHero() {
  const scenario = getScenario();
  document.querySelector("#heroRevenueShortfall").textContent = formatCurrency(scenario.revenueShortfall);
}

function createPersonnelControls() {
  const container = document.querySelector("#personnelControls");
  const adjustableDepartments = budgetData.departments.filter(isFteAdjustable);

  container.innerHTML = adjustableDepartments
    .map((department) => {
      state.fteReductions[department.id] = Number(state.fteReductions[department.id] || 0);
      return `
        <tr>
          <td><strong>${department.name}</strong></td>
          <td>${formatNumber(department.fteCount)}</td>
          <td>${formatCurrency(department.averageFteCost)}</td>
          <td><input type="number" min="0" max="${department.fteCount}" step="0.5" value="${state.fteReductions[department.id]}" data-control="fte" data-department="${department.id}" aria-label="FTE reduction for ${department.name}"></td>
          <td id="personnel-reduction-${department.id}">${formatCurrency(0)}</td>
        </tr>
      `;
    })
    .join("");
}


function isConstitutionalOrSheriff(department) {
  return [
    "tax-collector",
    "supervisor-of-elections",
    "clerk-of-court",
    "sheriffs-office",
    "property-appraiser"
  ].includes(department.id);
}

function isRemovedScenarioDepartment(department) {
  const removedIds = [
    "medical-examiner",
    "state-attorney",
    "public-defender",
    "county-court",
    "circuit-court",
    "guardian-ad-litem",
    "human-services"
  ];
  const removedNames = [
    "Medical Examiner",
    "State Attorney",
    "Public Defender",
    "County Court",
    "Circuit Court",
    "Guardian ad Litem",
    "Human Services"
  ];

  return removedIds.includes(department.id) || removedNames.includes(department.name);
}

function createOperatingControls() {
  const container = document.querySelector("#operatingControls");
  const departmentsWithOperatingBudget = budgetData.departments.filter((department) => department.operatingBudget > 0 && !isRemovedScenarioDepartment(department));
  const protectedDepartments = departmentsWithOperatingBudget.filter(isConstitutionalOrSheriff);
  const adjustableDepartments = departmentsWithOperatingBudget.filter((department) => !isConstitutionalOrSheriff(department));
  const protectedOperatingTotal = protectedDepartments.reduce((total, department) => total + department.operatingBudget, 0);

  container.innerHTML = `
    ${protectedDepartments.length ? `
      <section class="protected-operating-card" aria-label="Constitutional offices and Sheriff operating budgets">
        <div class="protected-operating-header">
          <div>
            <h4>Constitutional Office Operating Budgets</h4>
            <p>These operating budgets are shown for context and are not adjustable in this scenario tool.</p>
          </div>
          <strong>${formatCurrency(protectedOperatingTotal)}</strong>
        </div>
        <div class="protected-operating-list">
          ${protectedDepartments.map((department) => `
            <div>
              <span>${department.name}</span>
              <strong>${formatCurrency(department.operatingBudget)}</strong>
            </div>
          `).join("")}
        </div>
      </section>
    ` : ""}

    ${adjustableDepartments.map((department) => {
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
    }).join("")}
  `;
}

function createCapitalControls() {
  const container = document.querySelector("#capitalControls");

  container.innerHTML = budgetData.capitalProjects
    .map((project) => {
      if (typeof state.keptProjects[project.id] === "undefined") {
        state.keptProjects[project.id] = true;
      }
      return `
        <div class="project-card">
          <input id="project-${project.id}" type="checkbox" ${state.keptProjects[project.id] ? "checked" : ""} data-control="capital" data-project="${project.id}">
          <div>
            <label for="project-${project.id}">${project.name}</label>
            <p>${getDepartmentName(project.departmentId)} &bull; ${formatCurrency(project.cost)}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function createBuildScenarioCollapsibles() {
  const builder = document.querySelector("#builder");
  if (!builder) return;

  if (!document.querySelector("#collapsibleScenarioStyles")) {
    const style = document.createElement("style");
    style.id = "collapsibleScenarioStyles";
    style.textContent = `
      .collapsible-panel .panel-header {
        cursor: pointer;
      }

      .collapse-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
        border: 1px solid rgba(0, 98, 49, 0.2);
        border-radius: 999px;
        background: #ffffff;
        color: #006231;
        font-size: 18px;
        font-weight: 900;
        line-height: 1;
        cursor: pointer;
      }

      .collapse-toggle:hover,
      .collapse-toggle:focus {
        background: rgba(0, 98, 49, 0.08);
        outline: none;
      }

      .collapsible-content[hidden] {
        display: none;
      }

      .protected-operating-card {
        border: 1px solid rgba(0, 98, 49, 0.22);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(0, 98, 49, 0.08) 0%, rgba(0, 98, 49, 0.03) 100%);
        padding: 18px;
        margin-bottom: 16px;
      }

      .protected-operating-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 14px;
      }

      .protected-operating-header h4 {
        margin: 0 0 6px;
        color: #006231;
        font-size: 18px;
      }

      .protected-operating-header p {
        margin: 0;
        color: #4a5568;
        line-height: 1.45;
      }

      .protected-operating-header > strong {
        color: #006231;
        font-size: 24px;
        white-space: nowrap;
      }

      .protected-operating-list {
        display: grid;
        gap: 8px;
      }

      .protected-operating-list > div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;
        border-top: 1px solid rgba(0, 98, 49, 0.14);
      }

      .protected-operating-list span {
        font-weight: 800;
      }

      .protected-operating-list strong {
        color: #006231;
        white-space: nowrap;
      }

      .protected-impact-row {
        background: rgba(0, 98, 49, 0.08);
      }

      .protected-impact-row td {
        border-top-color: rgba(0, 98, 49, 0.16);
      }

      .protected-impact-row td:first-child {
        color: #006231;
      }

      @media (max-width: 640px) {
        .protected-operating-header,
        .protected-operating-list > div {
          display: block;
        }

        .protected-operating-header > strong,
        .protected-operating-list strong {
          display: block;
          margin-top: 6px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const collapsibleTitles = [
    "Reduce FTE Positions",
    "Adjust Department Operating Budgets",
    "Select Capital Projects to Keep",
    "Equipment and Capital Reductions"
  ];

  builder.querySelectorAll("article.panel").forEach((panel, index) => {
    const title = panel.querySelector("h3")?.textContent?.trim();
    if (title === "Select Capital Projects to Keep") {
      const heading = panel.querySelector("h3");
      const description = panel.querySelector("p:not(.eyebrow)");
      if (heading) heading.textContent = "Equipment and Capital Reductions";
      if (description) description.textContent = "Select Machinery & Equipment and capital projects to keep.";
    }
    const updatedTitle = panel.querySelector("h3")?.textContent?.trim();
    if (!collapsibleTitles.includes(updatedTitle) || panel.classList.contains("collapsible-panel")) {
      return;
    }

    const header = panel.querySelector(".panel-header");
    if (!header) return;

    const content = document.createElement("div");
    content.className = "collapsible-content";
    content.id = `scenario-collapse-${index}`;
    content.hidden = true;

    Array.from(panel.children).forEach((child) => {
      if (child !== header) {
        content.appendChild(child);
      }
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "collapse-toggle";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", content.id);
    button.setAttribute("aria-label", `Expand ${updatedTitle}`);
    button.textContent = "+";

    header.appendChild(button);
    panel.appendChild(content);
    panel.classList.add("collapsible-panel");

    header.addEventListener("click", (event) => {
      if (event.target.closest("a, input, select, textarea")) return;

      const isExpanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!isExpanded));
      button.setAttribute("aria-label", `${isExpanded ? "Expand" : "Collapse"} ${updatedTitle}`);
      button.textContent = isExpanded ? "+" : "−";
      content.hidden = isExpanded;
    });
  });
}

function getHistoricalRecord(departmentName, fiscalYear) {
  const department = historicalFundingData.find((item) => item.department === departmentName);
  return department?.history.find((record) => record.fiscalYear === fiscalYear) || null;
}

function getRankingRows(fiscalYear = "FY2025") {
  const departmentsByName = new Map(budgetData.departments.map((department) => [department.name, department]));
  const names = Array.from(new Set([
    ...historicalFundingData.map((department) => department.department),
    ...budgetData.departments.map((department) => department.name)
  ]));

  return names.map((name) => {
    const department = departmentsByName.get(name);
    const record = getHistoricalRecord(name, fiscalYear);
    const support = record?.adValoremSupport || 0;
    return {
      name,
      support,
      fte: department?.fteCount || 0,
      budget: department?.totalBudget || 0
    };
  });
}

function createTopServicesBars() {
  const container = document.querySelector("#topServicesBars");
  const rows = getRankingRows(state.overviewFiscalYear)
    .filter((row) => row.support > 0)
    .sort((a, b) => b.support - a.support);
  const visibleRows = state.showAllTopServices ? rows : rows.slice(0, 6);
  const max = Math.max(...rows.map((row) => row.support), 1);

  container.innerHTML = `
    ${visibleRows.map((row, index) => `
      <div class="rank-bar-row">
        <div class="rank-label"><strong>${index + 1}. ${row.name}</strong><span>${formatCurrency(row.support)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${(row.support / max) * 100}%"></div></div>
      </div>
    `).join("")}
    ${rows.length > 6 ? `
      <button type="button" class="view-all-button" data-control="toggle-top-services">
        ${state.showAllTopServices ? "Show Less" : "View All"}
      </button>
    ` : ""}
  `;
}

function getRankingSortValue(row) {
  if (state.rankingTab === "fte") return row.fte;
  if (state.rankingTab === "budget") return row.budget;
  return row.support;
}

function createRankings() {
  const query = state.rankingSearch.trim().toLowerCase();
  const rows = getRankingRows("FY2025")
    .filter((row) => !query || row.name.toLowerCase().includes(query))
    .sort((a, b) => getRankingSortValue(b) - getRankingSortValue(a));
  const max = Math.max(...rows.map(getRankingSortValue), 1);

  document.querySelectorAll("[data-control='ranking-tab']").forEach((button) => {
    button.classList.toggle("active", button.dataset.ranking === state.rankingTab);
  });

  document.querySelector("#rankingCards").innerHTML = rows.slice(0, 12).map((row, index) => `
    <article class="ranking-card">
      <div><span>${index + 1}</span><strong>${row.name}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(getRankingSortValue(row) / max) * 100}%"></div></div>
      <dl>
        <div><dt>Ad Valorem Support</dt><dd>${formatCurrency(row.support)}</dd></div>
        <div><dt>FTE</dt><dd>${formatNumber(row.fte)}</dd></div>
        <div><dt>Budget</dt><dd>${formatCurrency(row.budget)}</dd></div>
      </dl>
    </article>
  `).join("");

  document.querySelector("#rankingTable").innerHTML = rows.map((row) => `
    <tr>
      <td><strong>${row.name}</strong></td>
      <td>${formatCurrency(row.support)}</td>
      <td>${formatNumber(row.fte)}</td>
      <td>${formatCurrency(row.budget)}</td>
    </tr>
  `).join("");
}

function createDepartmentCards() {
  const container = document.querySelector("#departmentCards");
  const departmentsByName = new Map(budgetData.departments.map((department) => [department.name, department]));
  const names = budgetData.departments
    .map((department) => department.name)
    .sort((a, b) => a.localeCompare(b));
  const visibleNames = state.showAllDepartmentCards ? names : names.slice(0, 2);
  const isBudgetYear = state.departmentFiscalYear === "FY2027 Budget";

  container.innerHTML = `
    ${visibleNames.map((name) => {
      const department = departmentsByName.get(name);
      const record = isBudgetYear ? null : getHistoricalRecord(name, state.departmentFiscalYear);
      const primaryValue = isBudgetYear ? department?.totalBudget : record?.adValoremSupport;
      return `
        <article class="panel department-card">
          <div>
            <h3>${name}</h3>
          </div>
          <div class="department-primary-metric">
            <span>${isBudgetYear ? "Total Budget" : "Ad Valorem Support"}</span>
            <strong>${typeof primaryValue === "number" ? formatCurrency(primaryValue) : "Not available"}</strong>
          </div>
          <div class="detail-grid">
            ${isBudgetYear ? (department ? budgetDetailItems(department) : "") : (record ? historicalDetailItems(record) : "")}
          </div>
        </article>
      `;
    }).join("")}
    ${names.length > 2 ? `
      <button type="button" class="view-all-button department-view-all-button" data-control="toggle-department-cards">
        ${state.showAllDepartmentCards ? "Show Less" : "View All"}
      </button>
    ` : ""}
  `;
}

function detailItem(label, value, formatter = formatCurrency) {
  return `<div class="detail-item"><span>${label}</span><strong>${formatter(value)}</strong></div>`;
}

function historicalDetailItems(record) {
  return [
    detailItem("Gross Expense", record.grossExpense),
    hasValue(record.departmentRevenue) ? detailItem("Department Revenue", record.departmentRevenue) : "",
    hasValue(record.netExpense) ? detailItem("Net Expense", record.netExpense) : "",
    detailItem("Ad Valorem Support", record.adValoremSupport)
  ].join("");
}

function budgetDetailItems(department) {
  return [
    hasValue(department.personnelBudget) ? detailItem("Personnel Budget", department.personnelBudget) : "",
    hasValue(department.operatingBudget) ? detailItem("Operating Budget", department.operatingBudget) : "",
    hasValue(department.capitalBudget) ? detailItem("Capital Budget", department.capitalBudget) : "",
    hasValue(department.totalBudget) ? detailItem("Total Budget", department.totalBudget) : "",
    hasValue(department.fteCount) ? detailItem("FTE Count", department.fteCount, formatNumber) : "",
    hasValue(department.averageFteCost) ? detailItem("Average Personnel Cost", department.averageFteCost) : ""
  ].join("");
}

function createRevenueAssumptionsPanel() {
  const container = document.querySelector("#revenueAssumptionControls");
  container.innerHTML = `
    <label class="assumption-control" for="futureRevenueGrowthRate"><span>Revenue Growth Rate</span><input id="futureRevenueGrowthRate" type="number" min="-10" max="10" step="0.1" value="${state.revenueAssumptions.futureRevenueGrowthRate * 100}" data-control="revenue-assumption" data-assumption="futureRevenueGrowthRate"></label>
    <label class="assumption-control" for="fy2028ExpenseInflationRate"><span>FY2028 Supported Expense Inflation Rate</span><input id="fy2028ExpenseInflationRate" type="number" min="-10" max="10" step="0.1" value="${state.revenueAssumptions.fy2028ExpenseInflationRate * 100}" data-control="revenue-assumption" data-assumption="fy2028ExpenseInflationRate"></label>
    <label class="assumption-control" for="futureExpenseInflationRate"><span>FY2029+ Supported Expense Inflation Rate</span><input id="futureExpenseInflationRate" type="number" min="-10" max="10" step="0.1" value="${state.revenueAssumptions.futureExpenseInflationRate * 100}" data-control="revenue-assumption" data-assumption="futureExpenseInflationRate"></label>
    <label class="assumption-control" for="fy2028RevenueReduction"><span>FY2028 Revenue Reduction</span><input id="fy2028RevenueReduction" type="text" inputmode="decimal" value="${formatCurrencyInput(state.revenueAssumptions.fy2028RevenueReduction)}" data-control="revenue-assumption" data-assumption="fy2028RevenueReduction" data-format="currency"></label>
    <label class="assumption-control" for="fy2029RevenueReduction"><span>FY2029 Revenue Reduction</span><input id="fy2029RevenueReduction" type="text" inputmode="decimal" value="${formatCurrencyInput(state.revenueAssumptions.fy2029RevenueReduction)}" data-control="revenue-assumption" data-assumption="fy2029RevenueReduction" data-format="currency"></label>
    <div class="forecast-table-wrap"><table class="forecast-table"><thead><tr><th>Fiscal Year</th><th>Revenue</th><th>Supported Expense</th><th>Status</th><th>Revenue Shortfall</th></tr></thead><tbody id="forecastTable"></tbody></table></div>
  `;
}

function updateForecastTable() {
  document.querySelector("#forecastTable").innerHTML = getFiscalYears().map((year) => {
    const supportedExpense = year.historicalSupportedExpense ?? year.projectedSupportedExpense;
    const shortfall = year.historical || year.year === "FY2027" ? "-" : formatCurrency(year.revenueShortfall);
    return `<tr><td><strong>${year.year}</strong></td><td>${formatCurrency(year.revenue)}</td><td>${supportedExpense === null ? "-" : formatCurrency(supportedExpense)}</td><td>${year.type}</td><td>${shortfall}</td></tr>`;
  }).join("");
}

function createAssumptions() {
  const revenueAssumptions = [
    "Historical ad valorem revenue is included for FY2022 through FY2026.",
    "FY2027 revenue forecast is $163,473,140.",
    "FY2028 revenue equals FY2027 x 1.03 minus the FY2028 revenue reduction.",
    "FY2029 revenue equals the reduced FY2028 revenue x 1.02 minus the FY2029 revenue reduction.",
    "FY2030 through FY2032 revenue uses the editable future revenue growth rate."
  ];
  const expenditureAssumptions = [
    "The main trend chart uses ad valorem supported expense, not gross total county expenditures.",
    "Historical ad valorem supported expense reconciles to historical ad valorem revenue for FY2022 through FY2025.",
    "FY2027 projected supported expense equals the FY2027 ad valorem-supported department budget baseline. FY2028 grows by the FY2028 supported expense inflation rate, and FY2029 through FY2032 grow by the FY2029+ supported expense inflation rate.",
    "Departments outside the property-tax simulation are not stored in the active scenario reduction model."
  ];
  const methodology = [
    "The projected revenue shortfall is calculated as projected ad valorem supported expense minus projected ad valorem revenue for the selected forecast year.",
    "Reductions are calculated only from user-selected personnel, operating, and capital changes and are not recommendations.",
    "The application prevents total selected reductions from exceeding the projected revenue shortfall.",
    "Building Department, Public Works, Solid Waste, Mosquito Control, Housing & Urban Development, Mossy Head Wastewater Treatment Facility, and Tourism departments are excluded from the active scenario reduction model.",
    "Tax Collector, Supervisor of Elections, Clerk of Court, Sheriff's Office, and Property Appraiser remain visible but are not FTE-adjustable.",
    historicalMethodologyText
  ].filter(Boolean);
  const formulas = [
    { name: "Revenue Shortfall", formula: "Projected Ad Valorem Supported Expense - Projected Ad Valorem Revenue" },
    { name: "Revenue Shortfall Addressed", formula: "Selected Reductions / Total Revenue Shortfall, capped at 100%" },
    { name: "Personnel Reduction", formula: "FTE Reduction x Average Cost Per FTE" },
    { name: "Operating Reduction", formula: "Operating Budget x Reduction Percentage" },
    { name: "Capital Reduction", formula: "Sum of Removed Capital Project Costs" }
  ];
  const renderList = (selector, items) => {
    document.querySelector(selector).innerHTML = items.map((item) => `<li>${item}</li>`).join("");
  };
  renderList("#revenueAssumptions", revenueAssumptions);
  renderList("#inflationAssumptions", expenditureAssumptions);
  renderList("#methodologyList", methodology);
  document.querySelector("#formulaDefinitions").innerHTML = formulas.map((item) => `<div class="formula-item"><strong>${item.name}</strong><code>${item.formula}</code></div>`).join("");
}

function createCharts() {
  const fiscalYears = getFiscalYears();
  const shortfallYears = getProjectedShortfallYears();
  Chart.defaults.font.family = "Arial, Helvetica, sans-serif";
  Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue("--color-text-muted").trim();
  trendChart = new Chart(document.querySelector("#trendChart"), {
    type: "line",
    data: {
      labels: fiscalYears.map((year) => year.year),
      datasets: [
        { label: "Historical Ad Valorem Revenue", data: fiscalYears.map((year) => year.historical ? year.revenue : null), borderColor: "#006231", backgroundColor: "rgba(0, 98, 49, 0.12)", tension: 0.25, fill: false, spanGaps: false },
        { label: "Projected Revenue", data: fiscalYears.map((year) => year.historical ? null : year.revenue), borderColor: "#006231", backgroundColor: "rgba(0, 98, 49, 0.08)", borderDash: [6, 6], tension: 0.25, fill: false, spanGaps: false },
        { label: "Historical Ad Valorem Supported Expense", data: fiscalYears.map((year) => year.historicalSupportedExpense), borderColor: "#24445a", backgroundColor: "rgba(36, 68, 90, 0.12)", tension: 0.25, fill: false, spanGaps: false },
        { label: "Projected Ad Valorem Supported Expense", data: fiscalYears.map((year) => year.projectedSupportedExpense), borderColor: "#d1be78", backgroundColor: "rgba(209, 190, 120, 0.16)", tension: 0.25, fill: false, spanGaps: false }
      ]
    },
    options: getLineChartOptions()
  });
  shortfallChart = new Chart(document.querySelector("#shortfallChart"), {
    type: "bar",
    data: { labels: shortfallYears.map((year) => year.year), datasets: [{ label: "Projected Revenue Shortfall", data: shortfallYears.map((year) => year.revenueShortfall), backgroundColor: "rgba(0, 98, 49, 0.74)", borderColor: "#006231", borderWidth: 1 }] },
    options: getBarChartOptions()
  });
}

function getLineChartOptions() {
  return { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.raw === null ? "N/A" : formatCurrency(context.raw)}` } } }, scales: { y: { ticks: { callback: (value) => formatCurrency(value) } } } };
}

function getBarChartOptions() {
  return { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.raw === null ? "N/A" : formatCurrency(context.raw)}` } } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => formatCurrency(value) } } } };
}

function updateCharts() {
  const fiscalYears = getFiscalYears();
  const shortfallYears = getProjectedShortfallYears();
  trendChart.data.labels = fiscalYears.map((year) => year.year);
  trendChart.data.datasets[0].data = fiscalYears.map((year) => year.historical ? year.revenue : null);
  trendChart.data.datasets[1].data = fiscalYears.map((year) => year.historical ? null : year.revenue);
  trendChart.data.datasets[2].data = fiscalYears.map((year) => year.historicalSupportedExpense);
  trendChart.data.datasets[3].data = fiscalYears.map((year) => year.projectedSupportedExpense);
  trendChart.update();
  shortfallChart.data.labels = shortfallYears.map((year) => year.year);
  shortfallChart.data.datasets[0].data = shortfallYears.map((year) => year.revenueShortfall);
  shortfallChart.update();
}

function updateScenario() {
  const totals = getScenarioTotals();
  const shortfallAddressed = totals.revenueShortfall > 0 ? Math.min(Math.max((totals.totalReductions / totals.revenueShortfall) * 100, 0), 100) : 100;
  createHero();
  updateCharts();
  updateForecastTable();
  document.querySelector("#startingShortfall").textContent = formatCurrency(totals.revenueShortfall);
  document.querySelector("#resultRevenueShortfall").textContent = formatCurrency(totals.revenueShortfall);
  document.querySelector("#resultSelectedReductions").textContent = formatCurrency(totals.totalReductions);
  document.querySelector("#resultRemainingShortfall").textContent = formatCurrency(totals.remainingShortfall);
  document.querySelector("#resultPersonnelReductions").textContent = formatCurrency(totals.personnelReductions);
  document.querySelector("#resultOperatingReductions").textContent = formatCurrency(totals.operatingReductions);
  document.querySelector("#resultCapitalReductions").textContent = formatCurrency(totals.capitalReductions);
  document.querySelector("#shortfallAddressedPercent").textContent = formatPercent(shortfallAddressed);
  document.querySelector("#shortfallProgress").style.width = `${shortfallAddressed}%`;
  const statusBanner = document.querySelector("#budgetStatus");
  statusBanner.className = "status-banner";
  if (totals.remainingShortfall > 0) {
    statusBanner.classList.add("status-deficit");
    statusBanner.textContent = `${formatCurrency(totals.remainingShortfall)} revenue shortfall remaining`;
  } else {
    statusBanner.classList.add("status-balanced");
    statusBanner.textContent = "Revenue shortfall fully addressed";
  }
  totals.departmentImpacts.forEach((impact) => {
    const personnelReductionCell = document.querySelector(`#personnel-reduction-${impact.department.id}`);
    const operatingPercent = document.querySelector(`#operating-percent-${impact.department.id}`);
    if (personnelReductionCell) personnelReductionCell.textContent = formatCurrency(impact.personnelReduction);
    if (operatingPercent) operatingPercent.textContent = formatPercent(impact.operatingReduction);
  });
  const visibleImpacts = totals.departmentImpacts.filter((impact) => !isRemovedScenarioDepartment(impact.department));
  const protectedImpacts = visibleImpacts.filter((impact) => isConstitutionalOrSheriff(impact.department));
  const adjustableImpacts = visibleImpacts.filter((impact) => !isConstitutionalOrSheriff(impact.department));

  const protectedRows = protectedImpacts.map((impact) =>
    `<tr class="protected-impact-row"><td><strong>${impact.department.name}</strong></td><td>${formatNumber(impact.fteReduction)}</td><td>Not adjustable</td><td>${formatCurrency(impact.personnelReduction)}</td><td>${formatCurrency(impact.department.operatingBudget)}</td><td>${formatCurrency(impact.totalReduction)}</td></tr>`
  ).join("");

  const adjustableRows = adjustableImpacts.map((impact) =>
    `<tr><td><strong>${impact.department.name}</strong></td><td>${formatNumber(impact.fteReduction)}</td><td>${formatPercent(impact.operatingReduction)}</td><td>${formatCurrency(impact.personnelReduction)}</td><td>${formatCurrency(impact.operatingReductionAmount)}</td><td>${formatCurrency(impact.totalReduction)}</td></tr>`
  ).join("");

  document.querySelector("#impactTable").innerHTML = protectedRows + adjustableRows;
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
      state.revenueAssumptions[assumption] = assumption === "futureRevenueGrowthRate" || assumption === "fy2028ExpenseInflationRate" || assumption === "futureExpenseInflationRate" ? value / 100 : value;
      updateScenario();
    }
    if (target.dataset.control === "ranking-search") {
      state.rankingSearch = target.value;
      createRankings();
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
      createDepartmentCards();
    }
    if (target.dataset.control === "overview-year") {
      state.overviewFiscalYear = target.value;
      createTopServicesBars();
    }
  });
  document.addEventListener("click", (event) => {
    const rankingTab = event.target.closest("[data-control='ranking-tab']");
    if (rankingTab) {
      state.rankingTab = rankingTab.dataset.ranking;
      createRankings();
      return;
    }

    const topServicesToggle = event.target.closest("[data-control='toggle-top-services']");
    if (topServicesToggle) {
      state.showAllTopServices = !state.showAllTopServices;
      createTopServicesBars();
      return;
    }

    const departmentCardsToggle = event.target.closest("[data-control='toggle-department-cards']");
    if (departmentCardsToggle) {
      state.showAllDepartmentCards = !state.showAllDepartmentCards;
      createDepartmentCards();
    }
  });
  document.addEventListener("blur", (event) => {
    const target = event.target;
    if (target.dataset.control === "revenue-assumption" && target.dataset.format === "currency") {
      target.value = formatCurrencyInput(parseCurrencyInput(target.value));
    }
  }, true);
}

function init() {
  document.querySelector("#brandMount").innerHTML = window.WaltonSplitLogo.getHtml();
  createHero();
  createTopServicesBars();
  createRankings();
  createPersonnelControls();
  createOperatingControls();
  createCapitalControls();
  createBuildScenarioCollapsibles();
  createDepartmentCards();
  createRevenueAssumptionsPanel();
  createAssumptions();
  createCharts();
  bindEvents();
  updateScenario();
}

init();
