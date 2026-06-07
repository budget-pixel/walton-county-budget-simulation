const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
console.info('app.js loaded');
const currencyInputFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const historicalActualRevenues = [["FY2022", 89972682], ["FY2023", 110875024], ["FY2024", 131679989], ["FY2025", 149437335], ["FY2026", 152900634]];
const historicalFundingData = window.historicalDepartmentFunding || [];
const expenseDetailData = window.wcExpenseDetail || [];
const isStaffMode = new URLSearchParams(window.location.search).get("mode") === "staff";
const scenarioStoreKey = "waltonBudgetScenarios";

const state = {
  revenueAssumptions: {
    ...budgetData.revenueForecast.defaultAssumptions,
    baselineRevenue: budgetData.revenueForecast.baseRevenue,
    baselineExpense: budgetData.budgetBaselineTotals.adValoremSupportedExpenseBaseline,
    futureRevenueGrowthRate: 0.01,
    futureExpenseInflationRate: 0.01,
    rollbackRate: 3.3531,
    fy2029RevenueReduction: 9700000
  },
  personnelDrivers: { ...budgetData.personnelCostDrivers },
  scenarioMeta: { name: "", author: "", notes: "" },
  fteReductions: {},
  buyoutCounts: {},
  buyoutCosts: {},
  operatingReductions: {},
  removedOperatingItems: {},
  operatingDetailOpen: {},
  keptProjects: {},
  keptExpenseCapitalItems: {},
  lockedDepartments: {},
  departmentFiscalYear: "FY2027 Budget",
  overviewFiscalYear: "FY2027 Budget",
  rankingTab: "support",
  rankingSearch: "",
  departmentSearch: "",
  selectedDepartmentId: "",
  showAllTopServices: false,
  showAllRankings: false,
  showImpactTable: false,
  proposedMillage: budgetData.millageAssumptions.adoptedMillage,
  selectedScenarioName: "",
  serviceAreaDraft: [],
  serviceAreaSourceFileName: "",
  serviceAreaWarnings: []
};

let trendChart;
let shortfallChart;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const money = (value) => currencyFormatter.format(Math.round(Number(value || 0)));
const moneyInput = (value) => currencyInputFormatter.format(Number(value || 0));
const wholeMoneyInput = (value) => money(value);
const parseMoney = (value) => Number(String(value || "").replace(/[^0-9.-]/g, "")) || 0;
const number = (value) => numberFormatter.format(Number(value || 0));
const percent = (value) => `${percentFormatter.format(Number(value || 0))}%`;
const signedMoney = (value) => `${Number(value || 0) < 0 ? "-" : ""}${money(Math.abs(Number(value || 0)))}`;
const negativeMoney = (value) => `-${money(Math.abs(Number(value || 0)))}`;
const toneClass = (value) => Number(value || 0) < 0 ? "negative-value" : Number(value || 0) > 0 ? "positive-value" : "";
const millage = (value) => Number(value || 0).toFixed(4).replace(/0$/, "").replace(/0$/, "");
const constitutional = (department) => budgetData.constitutionalOfficeIds.includes(department.id);
const excluded = (department) => budgetData.excludedScenarioDepartmentIds.includes(department.id);
const locked = (id) => isStaffMode && Boolean(state.lockedDepartments[id]);
const departments = () => budgetData.departments.filter((department) => !excluded(department));
const departmentName = (id) => budgetData.departments.find((department) => department.id === id)?.name || "Countywide";

function showMessage(text) {
  const message = $("#scenarioMessage");
  const publicMessage = $("#publicCapMessage");
  if (message) message.textContent = text;
  if (publicMessage) publicMessage.textContent = text;
}

function historicalSupport(year) {
  return historicalFundingData.reduce((total, department) => total + (department.history.find((record) => record.fiscalYear === year)?.adValoremSupport || 0), 0);
}

function fy2027Support(department) {
  const total = departments().reduce((sum, item) => sum + item.totalBudget, 0) || 1;
  return department.totalBudget / total * budgetData.budgetBaselineTotals.adValoremSupportedExpenseBaseline;
}

function departmentSupport(department, fiscalYear = "FY2027 Budget") {
  if (fiscalYear === "FY2027 Budget") return fy2027Support(department);
  return historicalFundingData.find((item) => item.department === department.name)?.history.find((record) => record.fiscalYear === fiscalYear)?.adValoremSupport || 0;
}

function currentMillageRevenue() {
  return budgetData.millageAssumptions.taxableValueBase * budgetData.millageAssumptions.adoptedMillage / 1000;
}

function estimatedMillageRevenue(rate = state.proposedMillage) {
  return budgetData.millageAssumptions.taxableValueBase * Number(rate || 0) / 1000;
}

function calculatedRollbackRate() {
  return Number(state.revenueAssumptions.baselineRevenue || budgetData.revenueForecast.baseRevenue) / budgetData.millageAssumptions.taxableValueBase * 1000;
}

function rollbackRate() {
  return state.revenueAssumptions.rollbackRate === "" || state.revenueAssumptions.rollbackRate == null
    ? calculatedRollbackRate()
    : Number(state.revenueAssumptions.rollbackRate || 0);
}

function rollbackRevenueTarget() {
  return estimatedMillageRevenue(Number(rollbackRate().toFixed(4)));
}

function millageRevenueImpact() {
  return estimatedMillageRevenue() - currentMillageRevenue();
}

function fiscalYears() {
  const baseRevenue = Number(state.revenueAssumptions.baselineRevenue || budgetData.revenueForecast.baseRevenue);
  const baselineExpense = Number(state.revenueAssumptions.baselineExpense || budgetData.budgetBaselineTotals.adValoremSupportedExpenseBaseline);
  const growth = Number(state.revenueAssumptions.futureRevenueGrowthRate || 0);
  const expenseGrowth = Number(state.revenueAssumptions.futureExpenseInflationRate || 0);
  const fy2028Reduction = Number(state.revenueAssumptions.fy2028RevenueReduction || 0);
  const fy2029Reduction = Number(state.revenueAssumptions.fy2029RevenueReduction || 0);
  const fy2028Revenue = baseRevenue - fy2028Reduction;
  const fy2029Revenue = fy2028Revenue * (1 + growth) - fy2029Reduction;
  const revenue = [baseRevenue, fy2028Revenue, fy2029Revenue];
  const expense = [baselineExpense];
  for (let index = 1; index < 6; index += 1) {
    if (index > 2) revenue[index] = revenue[index - 1] * (1 + growth);
    expense[index] = expense[index - 1] * (1 + expenseGrowth);
  }
  const forecastYears = ["FY2027", "FY2028", "FY2029", "FY2030", "FY2031", "FY2032"].map((year, index) => ({
    year,
    revenue: revenue[index],
    projectedSupportedExpense: expense[index],
    revenueShortfall: Math.max(expense[index] - revenue[index], 0),
    type: "Forecast",
    historical: false
  }));
  return historicalActualRevenues.map(([year, revenueValue]) => ({
    year,
    revenue: revenueValue,
    historicalSupportedExpense: year === "FY2026" ? null : historicalSupport(year),
    revenueShortfall: 0,
    type: year === "FY2026" ? "Budget" : "Actual",
    historical: true
  })).concat(forecastYears);
}

function forecastYears() { return fiscalYears().filter((year) => !year.historical); }
function scenarioYear() { return forecastYears().find((year) => year.year === budgetData.scenarioYear); }
function driverTotal() { return Object.values(state.personnelDrivers).reduce((total, value) => total + Number(value || 0), 0) || 1; }
function baseDriverTotal() { return Object.values(budgetData.personnelCostDrivers).reduce((total, value) => total + value, 0) || 1; }
function fteCost(department) { return Math.round((department.averageFteCost || 0) * driverTotal() / baseDriverTotal()); }

function scenarioTotals(raw = false) {
  const revenueShortfall = scenarioYear().revenueShortfall;
  let personnelReductions = 0;
  let operatingReductions = 0;
  let buyoutOneTimeCosts = 0;
  const departmentImpacts = budgetData.departments.map((department) => {
    const isLocked = locked(department.id) || excluded(department);
    const averageCost = fteCost(department);
    const fteReduction = !isLocked && department.fteCount > 0 && !department.nonFteAdjustable && department.name !== "Board of County Commissioners" ? Number(state.fteReductions[department.id] || 0) : 0;
    const buyoutCount = isLocked || department.name === "Board of County Commissioners" ? 0 : Math.min(Number(state.buyoutCounts[department.id] || 0), Math.max(department.fteCount - fteReduction, 0));
    const buyoutCost = isLocked ? 0 : Number(state.buyoutCosts[department.id] || 0);
    const operatingPercent = isLocked || constitutional(department) ? 0 : Number(state.operatingReductions[department.id] || 0);
    const personnelReduction = (fteReduction + buyoutCount) * averageCost;
    const oneTimeBuyoutCost = buyoutCount * buyoutCost;
    const removedOperatingAmount = isLocked ? 0 : removedOperatingAmountForDepartment(department);
    const effectiveOperatingBudget = Math.max(department.operatingBudget - removedOperatingAmount, 0);
    const operatingReductionAmount = Math.round(effectiveOperatingBudget * operatingPercent / 100);
    personnelReductions += personnelReduction;
    operatingReductions += operatingReductionAmount + removedOperatingAmount;
    buyoutOneTimeCosts += oneTimeBuyoutCost;
    return {
      department,
      locked: isLocked,
      fteReduction,
      buyoutCount,
      buyoutCost,
      personnelReduction,
      buyoutOneTimeCost: oneTimeBuyoutCost,
      firstYearNetImpact: personnelReduction - oneTimeBuyoutCost,
      operatingReduction: operatingPercent,
      operatingReductionAmount,
      removedOperatingAmount,
      totalReduction: personnelReduction + operatingReductionAmount + removedOperatingAmount
    };
  });
  const capitalReductions = budgetData.capitalProjects.reduce((total, project) => locked(project.departmentId) || state.keptProjects[project.id] ? total : total + project.cost, 0) + expenseCapitalReductionAmount();
  const actualTotalReductions = personnelReductions + operatingReductions + capitalReductions;
  const displayTotalReductions = !isStaffMode && !raw ? Math.min(actualTotalReductions, revenueShortfall) : actualTotalReductions;
  return {
    revenueShortfall,
    personnelReductions,
    buyoutOneTimeCosts,
    operatingReductions,
    capitalReductions,
    actualTotalReductions,
    totalReductions: displayTotalReductions,
    remainingShortfall: Math.max(revenueShortfall - displayTotalReductions, 0),
    surplus: isStaffMode ? Math.max(actualTotalReductions - revenueShortfall, 0) : 0,
    departmentImpacts
  };
}

function currentReductionValue(type, id) {
  if (type === "fte") {
    const department = budgetData.departments.find((item) => item.id === id);
    return department ? Number(state.fteReductions[id] || 0) * fteCost(department) : 0;
  }
  if (type === "buyout") {
    const department = budgetData.departments.find((item) => item.id === id);
    return department ? Number(state.buyoutCounts[id] || 0) * fteCost(department) : 0;
  }
  if (type === "operating") {
    const department = budgetData.departments.find((item) => item.id === id);
    if (!department) return 0;
    const removed = removedOperatingAmountForDepartment(department);
    return Math.round(Math.max(department.operatingBudget - removed, 0) * Number(state.operatingReductions[id] || 0) / 100) + removed;
  }
  if (type === "operating-item") {
    const item = expenseItemByKey(id);
    return item && state.removedOperatingItems[id] ? Number(item.amount || 0) : 0;
  }
  if (type === "capital") {
    const project = budgetData.capitalProjects.find((item) => item.id === id);
    const expenseProject = expenseItemByKey(id);
    if (project) return !state.keptProjects[id] ? project.cost : 0;
    return expenseProject && !state.keptExpenseCapitalItems[id] ? Number(expenseProject.amount || 0) : 0;
  }
  return 0;
}

function availableShortfallExcluding(type, id) {
  const totals = scenarioTotals(true);
  return Math.max(totals.revenueShortfall - (totals.actualTotalReductions - currentReductionValue(type, id)), 0);
}

function capPublicFte(department, requested) {
  if (isStaffMode) return Math.min(Math.max(requested, 0), department.fteCount);
  const cost = fteCost(department);
  const maxByShortfall = cost > 0 ? Math.floor((availableShortfallExcluding("fte", department.id) / cost) * 2) / 2 : 0;
  const capped = Math.min(Math.max(requested, 0), department.fteCount, maxByShortfall);
  if (capped < requested) showMessage("Selected reductions cannot exceed the projected revenue shortfall.");
  return capped;
}

function capPublicBuyout(department, requested) {
  const maxPositions = Math.max(department.fteCount - Number(state.fteReductions[department.id] || 0), 0);
  if (isStaffMode) return Math.min(Math.max(requested, 0), maxPositions);
  const cost = fteCost(department);
  const maxByShortfall = cost > 0 ? Math.floor(availableShortfallExcluding("buyout", department.id) / cost) : 0;
  const capped = Math.min(Math.max(requested, 0), maxPositions, maxByShortfall);
  if (capped < requested) showMessage("Selected reductions cannot exceed the projected revenue shortfall.");
  return capped;
}

function capPublicOperating(department, requested) {
  if (isStaffMode) return Math.min(Math.max(requested, 0), 100);
  const maxPercent = department.operatingBudget > 0 ? Math.floor(availableShortfallExcluding("operating", department.id) / department.operatingBudget * 100) : 0;
  const capped = Math.min(Math.max(requested, 0), 100, maxPercent);
  if (capped < requested) showMessage("Selected reductions cannot exceed the projected revenue shortfall.");
  return capped;
}

function sortDepartments(a, b) {
  const departmentA = a.department || a;
  const departmentB = b.department || b;
  const constitutionalA = constitutional(departmentA);
  const constitutionalB = constitutional(departmentB);
  if (constitutionalA !== constitutionalB) return constitutionalA ? -1 : 1;
  return departmentA.name.localeCompare(departmentB.name);
}

function renderChrome() {
  if (window.WaltonSplitLogo) {
    $("#brandMount").innerHTML = window.WaltonSplitLogo.getHtml();
    window.WaltonSplitLogo.injectStyles?.();
  }

  if (!$("#departmentDetailCompactStyles")) {
    const style = document.createElement("style");
    style.id = "departmentDetailCompactStyles";
    style.textContent = `
      .department-side-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .department-side-grid .detail-item {
        padding: 10px 12px;
        min-height: auto;
      }

      .department-side-grid .detail-item span {
        font-size: 0.72rem;
        line-height: 1.15;
      }

      .department-side-grid .detail-item strong {
        font-size: 1rem;
        line-height: 1.2;
      }

      #departmentTable thead,
      .department-table thead {
        background: #ffffff;
        position: sticky;
        top: 0;
        z-index: 5;
      }

      #departmentTable thead tr,
      .department-table thead tr,
      #departmentTable th,
      .department-table th {
        background: #ffffff;
        position: relative;
        z-index: 6;
      }

      #departmentTable th,
      .department-table th {
        box-shadow: 0 1px 0 rgba(0, 98, 49, 0.16);
        background-clip: padding-box;
      }

      /* --- Custom department search wide styles --- */
      .department-search-wide {
        min-width: 340px;
        flex: 1 1 340px;
      }

      .department-search-wide input {
        width: 100%;
        min-width: 320px;
      }

      /* --- Begin resulting-shortfall-forecast styles --- */

      .resulting-shortfall-forecast {
        display: block;
        margin-top: 10px;
      }

      .resulting-shortfall-table {
        display: grid;
        width: 100%;
        margin-top: 4px;
        border-top: 1px solid rgba(0, 98, 49, 0.14);
      }

      .resulting-shortfall-table-header,
      .resulting-shortfall-table-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 7px 0;
      }

      .resulting-shortfall-table-header {
        color: var(--color-muted);
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .resulting-shortfall-table-row {
        border-top: 1px solid rgba(0, 98, 49, 0.08);
      }

      .resulting-shortfall-table-row strong {
        color: #006231;
        font-size: 0.95rem;
        line-height: 1.1;
      }

      .resulting-shortfall-table-row em {
        font-style: normal;
        font-size: 0.95rem;
        font-weight: 800;
        text-align: right;
      }

      /* --- End resulting-shortfall-forecast styles --- */

      @media (max-width: 780px) {
        .department-side-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 520px) {
        .department-side-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.classList.toggle("staff-mode", isStaffMode);
  $$('[data-staff-only]').forEach((element) => { element.hidden = !isStaffMode; });
}

function infoButton(text) {
  return `<button class="info-button" type="button" aria-label="More information" data-tip="${text.replace(/"/g, "&quot;")}">i</button>`;
}

function personnelDriverCardsMarkup() {
  return budgetData.personnelCostFactors.map((factor) => `
    <div class="driver-card compact-driver-card">
      <span>${factor.label} ${infoButton(factor.note)}</span>
      <strong>${percent(factor.percentOfTotal)}</strong>
    </div>
  `).join("");
}

function renderDrivers() {
  const oldContainer = $("#personnelDriverControls");
  if (!oldContainer) return;
  oldContainer.innerHTML = "";
  const oldPanel = oldContainer.closest("article, .panel, section");
  if (oldPanel) oldPanel.hidden = true;
}

function renderStaffRevenueControls() {
  const container = $("#staffRevenueControls");
  if (!container) return;
  const rollbackValue = state.revenueAssumptions.rollbackRate === "" || state.revenueAssumptions.rollbackRate == null ? calculatedRollbackRate() : Number(state.revenueAssumptions.rollbackRate || 0);
  container.innerHTML = `
    <label><span>Revenue Growth</span><input type="number" step="0.1" value="${state.revenueAssumptions.futureRevenueGrowthRate * 100}" data-control="revenue-assumption" data-assumption="futureRevenueGrowthRate"></label>
    <label><span>Baseline Revenue</span><input type="text" value="${wholeMoneyInput(state.revenueAssumptions.baselineRevenue)}" data-control="revenue-assumption" data-assumption="baselineRevenue" data-format="currency"></label>
    <label><span>FY2029+ Annaul Service Cost Growth</span><input type="number" step="0.1" value="${state.revenueAssumptions.futureExpenseInflationRate * 100}" data-control="revenue-assumption" data-assumption="futureExpenseInflationRate"></label>
    <label><span>Baseline Expense</span><input type="text" value="${wholeMoneyInput(state.revenueAssumptions.baselineExpense)}" data-control="revenue-assumption" data-assumption="baselineExpense" data-format="currency"></label>
    <label><span>FY2028 Revenue Reduction</span><input type="text" value="${wholeMoneyInput(state.revenueAssumptions.fy2028RevenueReduction)}" data-control="revenue-assumption" data-assumption="fy2028RevenueReduction" data-format="currency"></label>
    <label><span>Rollback Rate</span><input type="number" step="0.0001" value="${Number(rollbackValue || 0).toFixed(4)}" data-control="revenue-assumption" data-assumption="rollbackRate" data-format="millage"></label>
    <label><span>FY2029 Revenue Reduction</span><input type="text" value="${wholeMoneyInput(state.revenueAssumptions.fy2029RevenueReduction)}" data-control="revenue-assumption" data-assumption="fy2029RevenueReduction" data-format="currency"></label>
  `;
}

function renderLocks() {
  const container = $("#departmentLocks");
  if (!container) return;
  container.innerHTML = departments().sort(sortDepartments).map((department) => `<label class="lock-card ${constitutional(department) ? "constitutional-card" : ""}"><input type="checkbox" ${state.lockedDepartments[department.id] ? "checked" : ""} data-control="department-lock" data-department="${department.id}"><span>${department.name}</span></label>`).join("");
}

function renderPersonnel() {
  const costFactors = $("#personnelCostFactorsInline");
  if (costFactors) {
    costFactors.innerHTML = `<div class="personnel-factor-compact-header"><h4>Personnel Cost Factors</h4><p>Percentage of total personnel cost.</p></div><div class="personnel-driver-grid personnel-driver-grid-compact">${personnelDriverCardsMarkup()}</div>`;
  }
  $("#personnelControls").innerHTML = departments().filter((department) => department.fteCount > 0 && !department.nonFteAdjustable && department.name !== "Board of County Commissioners").sort(sortDepartments).map((department) => {
    const isLocked = locked(department.id);
    const averageCost = fteCost(department);
    state.buyoutCosts[department.id] ??= Math.round(averageCost * 0.35);
    if (isLocked) { state.fteReductions[department.id] = 0; state.buyoutCounts[department.id] = 0; }
    const recurring = (Number(state.fteReductions[department.id] || 0) + Number(state.buyoutCounts[department.id] || 0)) * averageCost;
    const oneTime = Number(state.buyoutCounts[department.id] || 0) * Number(state.buyoutCosts[department.id] || 0);
    return `<tr class="${isLocked ? "locked-row" : ""}"><td><strong>${department.name}</strong>${isLocked ? "<small>Locked</small>" : ""}</td><td>${number(department.fteCount)}</td><td>${money(averageCost)}</td><td><input type="number" step="0.5" min="0" max="${department.fteCount}" value="${state.fteReductions[department.id] || 0}" data-control="fte" data-department="${department.id}" ${isLocked ? "disabled" : ""}></td><td><input type="number" step="1" min="0" max="${department.fteCount}" value="${state.buyoutCounts[department.id] || 0}" data-control="buyout-count" data-department="${department.id}" ${isLocked ? "disabled" : ""}></td><td><input type="text" value="${moneyInput(state.buyoutCosts[department.id])}" data-control="buyout-cost" data-department="${department.id}" ${isLocked ? "disabled" : ""}></td><td>${money(recurring)}</td><td>${money(recurring - oneTime)}</td></tr>`;
  }).join("");
}

function renderOperating() {
  const protectedDepartments = departments().filter((department) => department.operatingBudget > 0 && constitutional(department));
  const adjustableDepartments = departments().filter((department) => department.operatingBudget > 0 && !constitutional(department)).sort(sortDepartments);
  $("#operatingControls").innerHTML = `<section class="protected-operating-card"><div class="protected-operating-header"><div><h4>Constitutional Office Operating Budgets</h4></div><strong>${money(protectedDepartments.reduce((total, department) => total + department.operatingBudget, 0))}</strong></div><div class="protected-operating-list">${protectedDepartments.map((department) => `<div><span>${department.name}</span><strong>${money(department.operatingBudget)}</strong></div>`).join("")}</div></section>` + adjustableDepartments.map((department) => {
    const isLocked = locked(department.id);
    if (isLocked) state.operatingReductions[department.id] = 0;
    const reductionPercent = Number(state.operatingReductions[department.id] || 0);
    const removedOperatingAmount = removedOperatingAmountForDepartment(department);
    const newOperatingBudget = Math.max(department.operatingBudget - removedOperatingAmount, 0) * (1 - reductionPercent / 100);
    const programsMarkup = serviceFieldList("Services & Programs", getDepartmentServicePrograms(department.id));
    return `<div class="slider-row ${isLocked ? "locked-row" : ""}"><div><label>${department.name}</label><div class="slider-meta">Operating budget: ${money(department.operatingBudget)}${removedOperatingAmount ? ` | Line items removed: ${money(removedOperatingAmount)}` : ""}${isLocked ? " | Locked" : ""}</div><div class="slider-meta slider-meta-secondary">New operating budget: <span class="new-operating-budget-value">${money(newOperatingBudget)}</span></div></div><input class="operating-slider" type="range" min="0" max="100" value="${reductionPercent}" data-control="operating" data-department="${department.id}" ${isLocked ? "disabled" : ""}><label class="percent-entry"><input type="number" min="0" max="100" step="1" value="${reductionPercent}" data-control="operating-percent" data-department="${department.id}" ${isLocked ? "disabled" : ""}><span>%</span></label>${programsMarkup}${renderOperatingLineItems(department, isLocked)}</div>`;
  }).join("");
}

function renderCapital() {
  $("#capitalControls").innerHTML = budgetData.capitalProjects.map((project) => {
    state.keptProjects[project.id] ??= true;
    const isLocked = locked(project.departmentId);
    if (isLocked) state.keptProjects[project.id] = true;
    return `<div class="project-card ${isLocked ? "locked-row" : ""}"><input type="checkbox" ${state.keptProjects[project.id] ? "checked" : ""} data-control="capital" data-project="${project.id}" ${isLocked ? "disabled" : ""}><div><label>${project.name}</label><p>${departmentName(project.departmentId)} | ${money(project.cost)}${isLocked ? " | Locked" : ""}</p></div></div>`;
  }).join("") + renderExpenseCapitalProjects();
}

function rankingRows(fiscalYear = state.overviewFiscalYear) {
  return departments().map((department) => ({ name: department.name, id: department.id, support: departmentSupport(department, fiscalYear), fte: department.fteCount, budget: department.totalBudget, constitutional: constitutional(department), department }));
}

function sortedRankingRows() {
  const rows = rankingRows("FY2027 Budget").filter((row) => !state.rankingSearch || row.name.toLowerCase().includes(state.rankingSearch.toLowerCase()));
  if (state.rankingTab === "fte") return rows.sort((a, b) => b.fte - a.fte || sortDepartments(a, b));
  if (state.rankingTab === "budget") return rows.sort((a, b) => b.budget - a.budget || sortDepartments(a, b));
  return rows.sort((a, b) => b.support - a.support || sortDepartments(a, b));
}

function renderTopServices() {
  const target = $("#topServicesBars");
  if (!target) return;
  const rows = rankingRows(state.overviewFiscalYear).filter((row) => row.support > 0).sort((a, b) => b.support - a.support);
  const visibleRows = state.showAllTopServices ? rows : rows.slice(0, 6);
  const max = Math.max(...rows.map((row) => row.support), 1);
  target.innerHTML = visibleRows.map((row, index) => `<div class="rank-bar-row ${row.constitutional ? "constitutional-row" : ""}"><div class="rank-label"><strong>${index + 1}. ${row.name}</strong><span>${money(row.support)}</span></div><div class="bar-track"><div class="bar-fill" style="width:${row.support / max * 100}%"></div></div></div>`).join("") + (rows.length > 6 ? `<button class="view-all-button" data-control="toggle-top-services">${state.showAllTopServices ? "Show Less" : "View All"}</button>` : "");
}

function renderRankings() {
  const rows = sortedRankingRows();
  const rankingCards = $("#rankingCards");
  if (rankingCards) rankingCards.innerHTML = "";
  const rankingTable = $("#rankingTable");
  if (rankingTable) rankingTable.innerHTML = rows.map((row) => `<tr><td>${row.name}</td><td>${money(row.support)}</td><td>${number(row.fte)}</td><td>${money(row.budget)}</td></tr>`).join("");
  const rankingTableWrap = $("#rankingTableWrap");
  if (rankingTableWrap) rankingTableWrap.hidden = true;
}

function departmentExplorerRows() {
  const query = state.departmentSearch.trim().toLowerCase();
  const rows = departments()
    .filter((department) => !query || department.name.toLowerCase().includes(query));

  return rows.sort((a, b) => departmentSupport(b, state.departmentFiscalYear) - departmentSupport(a, state.departmentFiscalYear) || sortDepartments(a, b));
}

const serviceAreaCategories = [
  "Public Safety",
  "Infrastructure Services",
  "Parks & Recreation",
  "Community Development",
  "Administrative Support",
  "Environmental & Beach Services",
  "Judicial & Statutory Services",
  "Other County Services"
];

let serviceAuditLogged = false;

function serviceDataSource() {
  const candidates = [
    { name: "window.departmentServices", value: window.departmentServices },
    { name: "window.departmentServiceAreas", value: window.departmentServiceAreas }
  ];
  const source = candidates.find((candidate) => candidate.value && (candidate.value.departments || Array.isArray(candidate.value.serviceAreas)));
  return {
    name: source?.name || "none",
    data: source?.value || { departments: {}, serviceAreas: [], departmentMappings: {} }
  };
}

function normalizeDepartmentServiceRecord(id, record) {
  if (!record) return null;
  const department = budgetData.departments.find((item) => item.id === id || item.name === record.department);
  return {
    departmentId: id || department?.id || slug(record.department),
    departmentName: record.department || department?.name || id,
    serviceArea: record.serviceArea || "",
    description: record.description || "",
    services: record.services || [],
    capitalProjects: record.capitalProjects || [],
    performanceMeasures: record.performanceMeasures || [],
    notes: record.notes || ""
  };
}

function normalizedServiceRows() {
  const { data } = serviceDataSource();
  if (data.departments && typeof data.departments === "object") {
    return Object.entries(data.departments)
      .map(([id, record]) => normalizeDepartmentServiceRecord(id, record))
      .filter(Boolean);
  }
  return (data.serviceAreas || []).map((row) => ({
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    serviceArea: row.serviceArea,
    description: row.description || row.mission || "",
    services: splitServiceItems(row.programName || row.services),
    capitalProjects: splitServiceItems(row.capitalProjects),
    performanceMeasures: splitServiceItems(row.performanceMeasures),
    notes: row.notes || row.reviewNotes || ""
  }));
}

function getDepartmentServices(departmentId) {
  return normalizedServiceRows().filter((row) => row && row.departmentId === departmentId);
}

function splitServiceItems(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => String(item || "").split(/\n|;|\||\u2022/))
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueItems(items) {
  return [...new Map(items.map((item) => [item.toLowerCase(), item])).values()];
}

function getDepartmentDescription(departmentId) {
  const rows = getDepartmentServices(departmentId);
  return rows.find((row) => row.description)?.description || rows.find((row) => row.mission)?.mission || "";
}

function getDepartmentServicePrograms(departmentId) {
  const rows = getDepartmentServices(departmentId);
  return uniqueItems(rows.flatMap((row) => splitServiceItems(row.services)));
}

function getDepartmentPerformanceMeasures(departmentId) {
  const rows = getDepartmentServices(departmentId);
  return uniqueItems(rows.flatMap((row) => splitServiceItems(row.performanceMeasures)));
}

function serviceFieldList(title, items) {
  if (!items.length) return "";
  return `<div class="department-service-block"><h4>${title}</h4><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
}

function departmentServiceAreaName(departmentId, rows = getDepartmentServices(departmentId)) {
  const mappedAreaId = window.serviceAreaMappings?.departmentMappings?.[departmentId];
  const mappedArea = window.serviceAreaMappings?.serviceAreas?.find((area) => area.id === mappedAreaId)?.name;
  return rows.find((row) => row.serviceArea)?.serviceArea || mappedArea || "Department Services";
}

function renderDepartmentServices(departmentId) {
  const rows = getDepartmentServices(departmentId);
  const department = budgetData.departments.find((dept) => dept.id === departmentId);
  if (!rows.length) {
    return isStaffMode && department && !constitutional(department)
      ? `<section class="department-service-section department-service-fallback" aria-label="Department service and program information"><p>Service information is currently being developed for this department.</p></section>`
      : "";
  }
  const programs = getDepartmentServicePrograms(departmentId);
  return `
    <section class="department-service-section" aria-label="Department service and program information">
      ${serviceFieldList("Services & Programs", programs)}
    </section>
  `;
}

function normalizeExpenseDepartmentName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function expenseDepartmentAliases(value) {
  const normalized = normalizeExpenseDepartmentName(value);
  const aliases = {
    procurement: ["purchasing"],
    purchasing: ["procurement"]
  };
  return [normalized, ...(aliases[normalized] || [])];
}

function expenseDetailForDepartment(department) {
  if (!department || !Array.isArray(expenseDetailData)) return null;
  const departmentNames = new Set([
    ...expenseDepartmentAliases(department.name),
    ...expenseDepartmentAliases(department.id),
    ...expenseDepartmentAliases(slug(department.name))
  ]);
  return expenseDetailData.find((detail) => {
    const names = [detail.department, detail.departmentId, detail.proposal, detail.id].map(normalizeExpenseDepartmentName);
    return names.some((name) => departmentNames.has(name));
  }) || null;
}

function compactMoney(value) {
  const amount = Number(value || 0);
  const absolute = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (absolute >= 1000000) return `${sign}$${number(absolute / 1000000)} Million`;
  if (absolute >= 1000) return `${sign}$${number(absolute / 1000)}K`;
  return money(amount);
}

function expenseCategoriesForDetail(detail) {
  const total = Number(detail?.total || 0);
  if (Array.isArray(detail?.categories) && detail.categories.length) {
    return detail.categories
      .map((category) => {
        const amount = Number(category.amount || 0);
        return {
          category: category.category || "Uncategorized",
          amount,
          percent: Number.isFinite(Number(category.percent)) ? Number(category.percent) : (total ? amount / total * 100 : 0),
          items: Array.isArray(category.items) ? category.items : []
        };
      })
      .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
  }
  const grouped = new Map();
  (detail?.items || []).forEach((item) => {
    const categoryName = item.category || "Uncategorized";
    if (!grouped.has(categoryName)) grouped.set(categoryName, { category: categoryName, amount: 0, items: [] });
    const row = grouped.get(categoryName);
    row.amount += Number(item.amount || 0);
    row.items.push(item);
  });
  return [...grouped.values()]
    .map((category) => ({ ...category, percent: total ? category.amount / total * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
}

function normalizeAndCombineCategories(categories) {
  const map = new Map();
  categories.forEach((cat) => {
    let key = String(cat.category || "");
    // combine personnel & benefits
    if (/^\s*(personnel|benefits)\s*$/i.test(key) || /^Personnel & Benefits$/i.test(key)) key = "Personnel & Benefits";
    // remap by category text
    if (/freight|postage/i.test(key)) key = "Supplies & Fuel";
    // if category is uncategorized or doesn't reflect freight/postage or personnel, inspect items for account codes or names
    if (!/supplies|fuel|freight|postage/i.test(key)) {
      const hasFreight = (cat.items || []).some((it) => String(it.accountCode || "") === "542000" || /freight|postage/i.test(String(it.accountName || "")));
      if (hasFreight) key = "Supplies & Fuel";
    }
    // map specific account codes to desired categories
    if (!/personnel|benefits/i.test(key)) {
      const hasOtherSalaries = (cat.items || []).some((it) => String(it.accountCode || "").trim() === "513000" || /other salaries|other salary/i.test(String(it.accountName || "")));
      if (hasOtherSalaries) key = "Personnel & Benefits";
    }
    if (!/supplies|fuel|freight|postage/i.test(key)) {
      const hasOtherCurrentCharges = (cat.items || []).some((it) => String(it.accountCode || "").trim() === "549000" || /other current charges/i.test(String(it.accountName || "")));
      if (hasOtherCurrentCharges) key = "Supplies & Fuel";
    }
    const existing = map.get(key) || { category: key, amount: 0, percent: 0, items: [] };
    existing.amount += Number(cat.amount || 0);
    existing.items = existing.items.concat(cat.items || []);
    map.set(key, existing);
  });
  const total = [...map.values()].reduce((s, c) => s + Number(c.amount || 0), 0) || 1;
  const out = [...map.values()].map((c) => ({ ...c, percent: total ? c.amount / total * 100 : 0 }));
  return out.sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
}

const expenseCategoryTips = {
  "Personnel & Benefits": "Pay and benefits for county employees. This includes salaries, wages, temporary or seasonal help, payroll taxes, retirement, health insurance, workers’ compensation, and unemployment costs.",

  "Professional Services": "Specialized work provided by outside professionals or vendors. This can include legal, engineering, auditing, consulting, appraisal, technology, medical, or other contracted professional support.",

  "Communications & Technology": "Tools and services that help the department communicate, process information, or operate digitally. This can include phones, internet, mobile devices, software, subscriptions, memberships, publications, data tools, and printing.",

  "Travel & Training": "Costs for employees to attend meetings, conferences, certifications, continuing education, required training, and related travel expenses.",

  "Supplies & Fuel": "Everyday materials used to operate the department. This can include office supplies, operating supplies, fuel, uniforms, small equipment, software under the capitalization threshold, chemicals, food, and other consumable items.",

  "Facilities, Utilities & Maintenance": "Costs to operate, rent, insure, repair, and maintain county facilities, vehicles, equipment, and workspaces. This can include utilities, leases, insurance, repairs, maintenance contracts, tires, and facility upkeep.",

  "Buildings, Infrastructure & Capital": "Larger capital costs for public assets. This can include buildings, renovations, roads, sidewalks, drainage, parking areas, lighting, parks, fields, land improvements, and other infrastructure.",

  "Vehicles & Equipment": "Purchases of vehicles, machinery, heavy equipment, office furniture, computers, tools, and other equipment expected to last beyond normal daily use.",

  "Grants, Aid & Transfers": "Funding passed through to other governments, agencies, nonprofits, or outside organizations to support public services, required contributions, grants, or intergovernmental obligations.",

  "Debt Service": "Payments on borrowed money, including principal and interest.",

  "Contingency & Other": "Budgeted reserve or other costs that do not fit neatly into another category. This may include contingency, public notices, promotional activities, current charges, or other miscellaneous uses.",

  "Uncategorized": "Expense items that were not automatically matched to one of the standard categories. These should be reviewed by staff."
};

function expenseCategoryTip(category) {
  return expenseCategoryTips[category] || expenseCategoryTips.Uncategorized;
}

function expenseItemsForDetail(detail, categories) {
  if (Array.isArray(detail?.items) && detail.items.length) return detail.items;
  return categories.flatMap((category) => category.items || []);
}

function expenseItemKey(department, item, index) {
  return [department.id, item.accountCode, item.accountName, item.projectName || item.name, item.description, index]
    .map((value) => slug(value || "item"))
    .join("--");
}

function expenseItemsForDepartment(department) {
  const detail = expenseDetailForDepartment(department);
  if (!detail) return [];
  const categories = expenseCategoriesForDetail(detail);
  return expenseItemsForDetail(detail, categories)
    .map((item, index) => ({ ...item, expenseKey: expenseItemKey(department, item, index), departmentId: department.id }))
    .filter((item) => Number(item.amount || 0) > 0);
}

function expenseItemCode(item) {
  return String(item.accountCode || "").trim();
}

function isPersonnelExpenseItem(item) {
  const category = String(item.category || "").toLowerCase();
  const code = expenseItemCode(item);
  return category === "personnel" || category === "benefits" || code.startsWith("51") || code.startsWith("52");
}

function isCapitalExpenseItem(item) {
  const category = String(item.category || "").toLowerCase();
  const type = String(item.type || "").toLowerCase();
  const code = expenseItemCode(item);
  return category === "buildings & infrastructure" || category === "vehicles & equipment" || type.includes("capital") || code.startsWith("56");
}

function operatingExpenseItemsForDepartment(department) {
  return expenseItemsForDepartment(department).filter((item) => !isPersonnelExpenseItem(item) && !isCapitalExpenseItem(item));
}

function expenseCapitalItems() {
  return departments().flatMap((department) => expenseItemsForDepartment(department).filter(isCapitalExpenseItem));
}

function expenseItemByKey(key) {
  return departments().flatMap(expenseItemsForDepartment).find((item) => item.expenseKey === key);
}

function removedOperatingItemsForDepartment(department) {
  return operatingExpenseItemsForDepartment(department).filter((item) => state.removedOperatingItems[item.expenseKey]);
}

function removedOperatingAmountForDepartment(department) {
  return removedOperatingItemsForDepartment(department).reduce((total, item) => total + Number(item.amount || 0), 0);
}

function expenseCapitalReductionAmount() {
  return expenseCapitalItems().reduce((total, item) => {
    if (locked(item.departmentId) || state.keptExpenseCapitalItems[item.expenseKey] !== false) return total;
    return total + Number(item.amount || 0);
  }, 0);
}

function groupedExpenseItems(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = `${item.accountCode || "No code"} ${item.accountName || "Account"}`.trim();
    if (!groups.has(key)) groups.set(key, { label: key, amount: 0, items: [] });
    const group = groups.get(key);
    group.amount += Number(item.amount || 0);
    group.items.push(item);
  });
  return [...groups.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

function renderOperatingLineItems(department, isLocked) {
  const groups = groupedExpenseItems(operatingExpenseItemsForDepartment(department));
  if (!groups.length) return "";
  return `
    <details class="operating-line-detail" data-department="${department.id}" ${state.operatingDetailOpen[department.id] ? "open" : ""}>
      <summary>Operating budget accounts and line items</summary>
      <div class="operating-account-list">
        ${groups.map((group) => `
          <section class="operating-account-group">
            <header><strong>${escapeHtml(group.label)}</strong><span>${money(group.amount)}</span></header>
            ${group.items.map((item) => {
              const removed = Boolean(state.removedOperatingItems[item.expenseKey]);
              const projectLabel = (item.projectName && !/^\s*Description pending\s*$/i.test(String(item.projectName))) ? item.projectName : (item.name || item.accountName || "Line item");
              const desc = (item.description && !/^\s*Description pending\s*$/i.test(String(item.description))) ? item.description : "";
              return `
                <div class="operating-line-item ${removed ? "line-item-removed" : ""}">
                  <div>
                    <strong>${escapeHtml(projectLabel)}</strong>
                    ${desc ? `<small>${escapeHtml(desc)}</small>` : ""}
                  </div>
                  <span>${money(item.amount)}</span>
                  <button type="button" class="line-item-toggle" data-control="toggle-operating-item" data-item="${item.expenseKey}" ${isLocked ? "disabled" : ""}>${removed ? "Keep" : "Remove"}</button>
                </div>
              `;
            }).join("")}
          </section>
        `).join("")}
      </div>
    </details>
  `;
}

function renderExpenseCapitalProjects() {
  return expenseCapitalItems().map((item) => {
    const isLocked = locked(item.departmentId);
    if (isLocked) state.keptExpenseCapitalItems[item.expenseKey] = true;
    const kept = state.keptExpenseCapitalItems[item.expenseKey] !== false;
    return `<div class="project-card expense-project-card ${isLocked ? "locked-row" : ""}"><input type="checkbox" ${kept ? "checked" : ""} data-control="expense-capital" data-item="${item.expenseKey}" ${isLocked ? "disabled" : ""}><div><label>${escapeHtml(item.projectName || item.name || item.accountName || "Capital item")}</label><p>${departmentName(item.departmentId)} | ${escapeHtml(item.accountCode || "Capital")} ${escapeHtml(item.accountName || "")} | ${money(item.amount)}${isLocked ? " | Locked" : ""}</p>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}</div></div>`;
  }).join("");
}

function renderExpenseLineItems(items) {
  // Detailed line items removed from the inline expense card per request.
  return "";
}

function renderExpenseDetail(department) {
  const detail = expenseDetailForDepartment(department);
  if (!detail) return "";
  const total = Number(detail.total || 0);
  let categories = expenseCategoriesForDetail(detail);
  if (!categories.length) return "";
  categories = normalizeAndCombineCategories(categories);

  const showAll = Boolean(state.expenseDetailShowAll && state.expenseDetailShowAll[department.id]);
  const visibleCategories = showAll ? categories : categories.slice(0, 3);

  return `
    <section class="department-expense-section" aria-label="Where the money goes">
      <div class="department-expense-heading">
        <p class="eyebrow">Expense Detail</p>
        <h4>Where the money goes</h4>
        <p class="department-expense-total"><span>Total expense detail</span><strong>${compactMoney(total)}</strong></p>
      </div>
      <div class="expense-bars">
        ${visibleCategories.map((category) => {
          const categoryPercent = Math.max(0, Math.min(100, Number(category.percent || 0)));
          return `
            <div class="expense-bar-row">
              <div class="expense-bar-label">
                    <strong>${escapeHtml(category.category)} ${infoButton(expenseCategoryTip(category.category))}</strong>
                    <span>${money(category.amount)}</span>
                    <em>${percent(category.percent)}</em>
                  </div>
              <div class="expense-bar-track" aria-hidden="true"><div class="expense-bar-fill" style="width:${categoryPercent}%"></div></div>
            </div>
          `;
        }).join("")}
      </div>
      ${renderExpenseLineItems(expenseItemsForDetail(detail, categories))}
      ${categories.length > 3 ? `<div class="expense-show-toggle"><button type="button" class="view-all-button small-toggle-button" data-control="toggle-expense-categories" data-department="${department.id}">${showAll ? "Show Less" : "Show All"}</button></div>` : ""}
    </section>
  `;
}

function serviceCoverageAudit() {
  const { name, data } = serviceDataSource();
  const excludedDepartmentIds = new Set([
    "property-appraiser",
    "tax-collector",
    "supervisor-of-elections",
    "clerk-of-court",
    "medical-examiner",
    "south-walton-fire-district",
    "state-attorney",
    "public-defender",
    "county-court",
    "circuit-court",
    "guardian-ad-litem",
    "human-services",
    "sheriff-s-office"
  ]);
  const allDepartments = (budgetData.departments || []).filter((department) => !excludedDepartmentIds.has(department.id));
  const serviceRows = normalizedServiceRows();
  const departmentIds = new Set(allDepartments.map((department) => department.id));
  const serviceDepartmentIds = new Set(serviceRows.map((row) => row.departmentId).filter(Boolean));
  const withServiceData = allDepartments.filter((department) => serviceDepartmentIds.has(department.id));
  const missingServiceData = allDepartments.filter((department) => !serviceDepartmentIds.has(department.id));
  const unmatchedServiceRecords = serviceRows.filter((row) => row.departmentId && !departmentIds.has(row.departmentId));
  const coveragePercentage = allDepartments.length ? Math.round(withServiceData.length / allDepartments.length * 1000) / 10 : 0;
  return { sourceName: name, departments: allDepartments, withServiceData, missingServiceData, unmatchedServiceRecords, coveragePercentage };
}

function serviceAreaForDepartment(departmentId) {
  const rows = getDepartmentServices(departmentId);
  const name = departmentServiceAreaName(departmentId, rows);
  return serviceAreaCategories.includes(name) ? name : "Other County Services";
}

function logServiceDataAudit() {
  if (serviceAuditLogged) return;
  serviceAuditLogged = true;
  const audit = serviceCoverageAudit();
  console.groupCollapsed("Department service data audit");
  console.info("Service data source", audit.sourceName);
  console.info("Departments with service data", audit.withServiceData.map((department) => department.name));
  console.info("Departments missing service data", audit.missingServiceData.map((department) => department.name));
  console.info("Service records not matched to departments", audit.unmatchedServiceRecords.map((row) => row.departmentName || row.departmentId));
  console.info("Coverage percentage", `${audit.coveragePercentage}%`);
  console.table([{ departments: audit.departments.length, departmentsWithServiceData: audit.withServiceData.length, missingDepartments: audit.missingServiceData.length, unmatchedServiceRecords: audit.unmatchedServiceRecords.length, coverage: `${audit.coveragePercentage}%` }]);
  console.groupEnd();
  console.table(serviceAreaCategories.map((category) => ({
    serviceArea: category,
    departments: audit.departments.filter((department) => serviceAreaForDepartment(department.id) === category).map((department) => department.name).join(", ") || "None"
  })));
}

function renderServiceDiagnostics() {
  const panel = $("#serviceDiagnosticsPanel");
  if (!panel || !isStaffMode) return;
  const audit = serviceCoverageAudit();
  const summary = $("#serviceDiagnosticsSummary");
  const missing = $("#serviceDiagnosticsMissing");
  if (summary) {
    summary.innerHTML = `
      <div><span>Departments</span><strong>${audit.departments.length}</strong></div>
      <div><span>Departments with Service Data</span><strong>${audit.withServiceData.length}</strong></div>
      <div><span>Coverage</span><strong>${audit.coveragePercentage}%</strong></div>
    `;
  }
  if (missing) {
    missing.innerHTML = audit.missingServiceData.length
      ? `<h4>Departments still missing service data</h4><ul>${audit.missingServiceData.map((department) => `<li>${escapeHtml(department.name)}</li>`).join("")}</ul>`
      : `<p>All departments have service data.</p>`;
  }
}

function renderDepartments() {
  const rows = departmentExplorerRows();
  const budgetYear = state.departmentFiscalYear === "FY2027 Budget";
  if (!rows.some((department) => department.id === state.selectedDepartmentId)) {
    state.selectedDepartmentId = rows[0]?.id || "";
  }

  const controlsTarget = $("#departmentExplorerControls");
  if (controlsTarget && !controlsTarget.querySelector('[data-control="department-search"]')) {
    controlsTarget.innerHTML = `
      <label class="department-search-wide"><span>Search Departments</span><input type="search" value="${state.departmentSearch.replace(/\"/g, "&quot;")}" placeholder="Search department" data-control="department-search"></label>
      <button type="button" class="view-all-button compact-export-button" data-control="export-rankings">Export</button>
    `;
  }

  const budgetColumn = $("#departmentBudgetColumn");
  if (budgetColumn) budgetColumn.textContent = budgetYear ? "Total Budget" : "Gross Expense";

  const table = $("#departmentTable");
  if (table) {
    table.innerHTML = rows.map((department) => {
      const record = historicalFundingData.find((item) => item.department === department.name)?.history.find((item) => item.fiscalYear === state.departmentFiscalYear);
      const support = budgetYear ? departmentSupport(department) : record?.adValoremSupport || 0;
      const budget = budgetYear ? department.totalBudget : record?.grossExpense || 0;
      const selected = department.id === state.selectedDepartmentId;
      return `<tr class="${constitutional(department) ? "constitutional-row" : ""} ${selected ? "selected-row" : ""}"><td><button type="button" class="table-link-button" data-control="select-department" data-department="${department.id}">${department.name}</button></td><td>${money(support)}</td><td>${money(budget)}</td><td>${number(department.fteCount)}</td></tr>`;
    }).join("") || '<tr><td colspan="4">No departments match the current search.</td></tr>';
  }

  const selectedDepartment = rows.find((department) => department.id === state.selectedDepartmentId);
  const panel = $("#departmentDetailPanel");
  if (!panel) return;
  if (!selectedDepartment) {
    panel.innerHTML = '<p class="historical-note">Select a department to view funding details.</p>';
    return;
  }

  const record = historicalFundingData.find((item) => item.department === selectedDepartment.name)?.history.find((item) => item.fiscalYear === state.departmentFiscalYear);
  const description = getDepartmentDescription(selectedDepartment.id);
  panel.innerHTML = `
    <div class="department-side-header">
      <h3>${selectedDepartment.name}</h3>
      ${constitutional(selectedDepartment) ? '<span class="department-badge">Constitutional Office</span>' : ''}
    </div>
    ${description ? `<p class="department-service-description department-side-description">${escapeHtml(description)}</p>` : ""}
    <div class="department-primary-metric"><span>${budgetYear ? "FY2027 Ad Valorem Support" : "Ad Valorem Support"}</span><strong>${money(budgetYear ? departmentSupport(selectedDepartment) : record?.adValoremSupport || 0)}</strong></div>
    <div class="detail-grid department-side-grid">${
      budgetYear
        ? detail("Personnel Budget", selectedDepartment.personnelBudget)
          + detail("Operating Budget", selectedDepartment.operatingBudget)
          + detail("Capital Budget", selectedDepartment.capitalBudget)
          + detail("Total Budget", selectedDepartment.totalBudget)
          + detail("FTE Count", selectedDepartment.fteCount, number)
          + (!constitutional(selectedDepartment) && selectedDepartment.name !== "Board of County Commissioners"
              ? detail("Average Personnel Cost", fteCost(selectedDepartment))
              : "")
        : record
          ? detail("Gross Expense", record.grossExpense)
            + detail("Department Revenue", record.departmentRevenue)
            + detail("Net Expense", record.netExpense)
            + detail("Ad Valorem Support", record.adValoremSupport)
          : '<p class="historical-note">No historical record is available for this department and fiscal year.</p>'
    }</div>
    ${renderExpenseDetail(selectedDepartment)}
    ${renderDepartmentServices(selectedDepartment.id)}
  `;
}

function detail(label, value, formatter = money) { return `<div class="detail-item"><span>${label}</span><strong>${formatter(value || 0)}</strong></div>`; }

function setupScenarioAccordions() {
  const accordionTitles = [
    "Personnel Reduction",
    "Personnel Reductions",
    "Reduce FTE Positions",
    "Operating Reduction",
    "Operating Reductions",
    "Adjust Department Operating Budgets",
    "Equipment and Capital Reductions",
    "Capital Reduction",
    "Capital Reductions"
  ];

  if (!$("#scenarioAccordionStyles")) {
    const style = document.createElement("style");
    style.id = "scenarioAccordionStyles";
    style.textContent = `
      .scenario-accordion-panel .panel-header,
      .scenario-accordion-panel > h3 {
        cursor: pointer;
      }

      .scenario-accordion-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  $$('article.panel').forEach((panel, index) => {
    const heading = panel.querySelector('h3');
    const title = heading?.textContent?.trim();
    if (!title || !accordionTitles.includes(title)) return;

    if (panel.classList.contains('scenario-accordion-panel')) {
      const content = panel.querySelector('.scenario-accordion-content');
      if (content && !panel.classList.contains('scenario-accordion-open')) {
        content.hidden = true;
      }
      return;
    }

    const header = panel.querySelector('.panel-header') || heading.parentElement || heading;
    header.classList.add('scenario-accordion-heading');

    const content = document.createElement('div');
    content.className = 'scenario-accordion-content';
    content.id = `scenario-accordion-${index}`;
    content.hidden = true;

    Array.from(panel.children).forEach((child) => {
      if (child !== header) content.appendChild(child);
    });

    panel.appendChild(content);
    panel.classList.add('scenario-accordion-panel');

    header.addEventListener('click', (event) => {
      if (event.target.closest('a, button, input, select, textarea, label')) return;
      const expanded = !content.hidden;
      content.hidden = expanded;
      panel.classList.toggle('scenario-accordion-open', !expanded);
    });
  });
}

function renderAssumptions() {
  $("#inflationAssumptions").innerHTML = "<li>Personnel cost factors show both dollars and percent of total personnel cost.</li><li>Staff mode can edit revenue forecast settings, millage targets, and department locks.</li><li>Expense inflation pressure represents year-over-year growth in projected supported expense.</li>";
  $("#methodologyList").innerHTML = "<li>Public reductions are capped at the projected revenue shortfall.</li><li>Staff mode may model surplus for internal planning.</li><li>Ranking exports are generated from internal data even though the full support table is hidden.</li>";
  $("#formulaDefinitions").innerHTML = [
    "Revenue Shortfall = Projected Supported Expense - Projected Revenue",
    "Direct Revenue Reduction = Staff revenue reduction setting for the fiscal year",
    "Structural Budget Gap = Revenue Shortfall - Direct Revenue Reduction",
    "Estimated Ad Valorem Revenue = Taxable Value Base x Millage / 1,000",
    "Required Millage = Target Revenue / Taxable Value Base x 1,000",
    "Rollback Rate = FY2026 Budgeted Ad Valorem Revenue / Taxable Value Base x 1,000",
    "Buy-Out First-Year Net = Recurring Reduction - One-Time Cost"
  ].map((item) => `<div class="formula-item"><code>${item}</code></div>`).join("");
}

function shortfallComponents() {
  const directReductionByYear = {
    FY2028: Number(state.revenueAssumptions.fy2028RevenueReduction || 0),
    FY2029: Number(state.revenueAssumptions.fy2029RevenueReduction || 0)
  };

  return forecastYears().filter((year) => year.year !== "FY2027").map((year) => {
    const directRevenueReduction = Number(directReductionByYear[year.year] || 0);
    const expenseInflationPressure = Math.max(year.revenueShortfall - directRevenueReduction, 0);
    return { ...year, directRevenueReduction, expenseInflationPressure };
  });
}

function renderForecast() {
  const table = $("#forecastTable");
  if (!table) return;
  table.innerHTML = fiscalYears().map((year) => `<tr><td><strong>${year.year}</strong></td><td>${money(year.revenue)}</td><td>${year.historicalSupportedExpense == null ? money(year.projectedSupportedExpense) : money(year.historicalSupportedExpense)}</td><td>${year.type}</td><td class="${!year.historical && year.revenueShortfall ? "negative-value" : ""}">${year.historical ? "-" : year.revenueShortfall ? negativeMoney(year.revenueShortfall) : "$0"}</td></tr>`).join("");
}

function chartOptions(bar = false, stacked = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked },
      y: {
        beginAtZero: bar,
        stacked,
        ticks: {
          stepSize: bar ? 4000000 : undefined,
          callback: (value) => `$${(Number(value) / 1000000).toFixed(0)}M`
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${money(context.raw)}`
        }
      }
    }
  };
}

function renderCharts() {
  if (!window.Chart || !$("#trendChart") || !$("#shortfallChart")) return;
  const forecast = forecastYears();
  const components = shortfallComponents();
  Chart.defaults.font.family = "Arial, Helvetica, sans-serif";
  trendChart = new Chart($("#trendChart"), {
    type: "line",
    data: {
      labels: forecast.map((year) => year.year),
      datasets: [
        {
          label: "Projected Revenue",
          data: forecast.map((year) => year.revenue),
          borderColor: "#006231",
          backgroundColor: "#006231",
          borderDash: [6, 6]
        },
        {
          label: "Projected Expenses",
          data: forecast.map((year) => year.projectedSupportedExpense),
          borderColor: "#d1be78",
          backgroundColor: "#d1be78"
        }
      ]
    },
    options: chartOptions()
  });
  shortfallChart = new Chart($("#shortfallChart"), { type: "bar", data: { labels: components.map((year) => year.year), datasets: [{ label: "Direct Revenue Reduction", data: components.map((year) => year.directRevenueReduction), backgroundColor: "rgba(0, 98, 49, 0.78)", stack: "shortfall" }, { label: "Structural Budget Gap", data: components.map((year) => year.expenseInflationPressure), backgroundColor: "rgba(0, 98, 49, 0.28)", stack: "shortfall" }] }, options: chartOptions(true, true) });
}

function updateCharts() {
  if (!trendChart || !shortfallChart) return;
  const forecast = forecastYears();
  const components = shortfallComponents();
  trendChart.data.labels = forecast.map((year) => year.year);
  trendChart.data.datasets[0].data = forecast.map((year) => year.revenue);
  trendChart.data.datasets[1].data = forecast.map((year) => year.projectedSupportedExpense);
  trendChart.update();
  shortfallChart.data.labels = components.map((year) => year.year);
  shortfallChart.data.datasets[0].data = components.map((year) => year.directRevenueReduction);
  shortfallChart.data.datasets[1].data = components.map((year) => year.expenseInflationPressure);
  shortfallChart.update();
}


function renderImpact() {
  const rows = scenarioTotals().departmentImpacts.filter((impact) => !excluded(impact.department)).sort(sortDepartments);
  $("#impactTable").innerHTML = rows.map((impact) => `<tr class="${constitutional(impact.department) ? "constitutional-row" : ""} ${impact.locked ? "locked-row" : ""}"><td><strong>${impact.department.name}</strong>${impact.locked ? "<small>Locked</small>" : ""}</td><td>${number(impact.fteReduction)}</td><td>${constitutional(impact.department) ? "" : percent(impact.operatingReduction)}</td><td>${money(impact.personnelReduction)}</td><td>${money(impact.operatingReductionAmount)}</td><td>${money(impact.totalReduction)}</td></tr>`).join("");
  $("#impactTableWrap").hidden = !state.showImpactTable;
  $('[data-control="toggle-impact-table"]').textContent = state.showImpactTable ? "Show Less" : "View All";
  $("#validationWarnings").innerHTML = isStaffMode ? `<p>${Object.values(state.lockedDepartments).filter(Boolean).length} departments locked. Staff mode can exceed the shortfall and will label any surplus as Modeled Surplus.</p>` : "";
}

function renderMillage() {
  const rollback = rollbackRate();
  const estimatedRevenue = estimatedMillageRevenue();
  $("#currentMillage").textContent = budgetData.millageAssumptions.adoptedMillage.toFixed(3);
  $("#rollbackRate").textContent = `${rollback.toFixed(4)} mills`;
  const proposedMillageInput = $("#proposedMillage");
  if (proposedMillageInput) {
    proposedMillageInput.type = "text";
    proposedMillageInput.inputMode = "decimal";
    proposedMillageInput.placeholder = "Enter millage";
    proposedMillageInput.disabled = !isStaffMode;
    if (document.activeElement !== proposedMillageInput) {
      proposedMillageInput.value = Number(state.proposedMillage || 0).toFixed(4);
    }
  }

  const revenueTarget = $("#revenueTarget");
  if (revenueTarget) {
    const revenueTargetWrapper = revenueTarget.closest("label, .metric-box, .assumption-control, .scenario-control, div");
    if (revenueTargetWrapper) revenueTargetWrapper.hidden = true;
  }
  $("#estimatedMillageRevenue").textContent = money(estimatedRevenue);
  const currentMillageImpact = estimatedRevenue - currentMillageRevenue();
  const currentMillageImpactElement = $("#millageRevenueImpact");
  currentMillageImpactElement.textContent = signedMoney(currentMillageImpact);
  currentMillageImpactElement.className = toneClass(currentMillageImpact);
  const rollbackImpact = estimatedRevenue - rollbackRevenueTarget();
  const rollbackImpactElement = $("#rollbackRevenueImpact");
  rollbackImpactElement.textContent = signedMoney(rollbackImpact);
  rollbackImpactElement.className = toneClass(rollbackImpact);
  const totals = scenarioTotals();
  const millageShortfallImpactElement = $("#millageShortfallImpact");
  millageShortfallImpactElement.textContent = "";
  millageShortfallImpactElement.classList.remove("negative-value");
  renderResultingShortfallForecast(totals);
  $("#taxpayerImpact").textContent = money((budgetData.millageAssumptions.adoptedMillage - state.proposedMillage) * 250);
}

function renderScenarioManager() {
  const select = $("#scenarioSelect");
  if (!select) return;
  const store = getScenarioStore();
  const names = Object.keys(store.scenarios).sort();
  select.innerHTML = `<option value="">Select saved scenario</option>` + names.map((name) => `<option value="${name.replace(/"/g, "&quot;")}" ${state.selectedScenarioName === name ? "selected" : ""}>${name}</option>`).join("");
}

function updateResults() {
  const totals = scenarioTotals();
  if (!totals.remainingShortfall && $("#publicCapMessage")?.textContent && !$("#publicCapMessage").textContent.includes("cannot exceed")) $("#publicCapMessage").textContent = "";
  const scenario = scenarioYear();
  const addressed = totals.revenueShortfall ? Math.min(totals.totalReductions / totals.revenueShortfall * 100, 100) : 100;
  const heroShortfall = $("#heroRevenueShortfall");
  const heroNextShortfall = $("#heroRevenueShortfallNext");
  const fy2028Forecast = forecastYears().find((year) => year.year === "FY2028");
  const fy2029Forecast = forecastYears().find((year) => year.year === "FY2029");
  if (heroShortfall && fy2028Forecast) {
    heroShortfall.textContent = fy2028Forecast.revenueShortfall ? negativeMoney(fy2028Forecast.revenueShortfall) : "$0";
    heroShortfall.classList.add("negative-value");
  }
  if (heroNextShortfall && fy2029Forecast) {
    heroNextShortfall.textContent = fy2029Forecast.revenueShortfall ? negativeMoney(fy2029Forecast.revenueShortfall) : "$0";
    heroNextShortfall.classList.add("negative-value");
  }
  ["#startingShortfall", "#resultRevenueShortfall"].forEach((selector) => {
    const element = $(selector);
    if (element) {
      element.textContent = negativeMoney(totals.revenueShortfall);
      element.classList.add("negative-value");
    }
  });
  $("#resultSelectedReductions").textContent = money(totals.totalReductions);
  const remainingShortfallElement = $("#resultRemainingShortfall");
  remainingShortfallElement.textContent = totals.remainingShortfall ? negativeMoney(totals.remainingShortfall) : "$0";
  remainingShortfallElement.classList.toggle("negative-value", totals.remainingShortfall > 0);
  $("#resultPersonnelReductions").textContent = money(totals.personnelReductions);
  $("#resultOperatingReductions").textContent = money(totals.operatingReductions);
  $("#resultCapitalReductions").textContent = money(totals.capitalReductions);
  $("#shortfallAddressedPercent").textContent = percent(addressed);
  $("#shortfallProgress").style.width = `${addressed}%`;
  $("#budgetStatus").className = `status-banner ${totals.remainingShortfall ? "status-deficit" : "status-balanced"}`;
  $("#budgetStatus").textContent = totals.remainingShortfall ? `${money(totals.remainingShortfall)} revenue shortfall remaining` : isStaffMode && totals.surplus ? `${money(totals.surplus)} Modeled Surplus` : "Balanced scenario: remaining revenue shortfall is $0";
  updateCharts();
  renderForecast();
  renderMillage();
  renderImpact();
  renderScenarioComparison();
}

function csv(name, headings, rows) {
  const text = [headings, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function scenarioSnapshot() {
  return {
    version: 2,
    revenueAssumptions: state.revenueAssumptions,
    personnelDrivers: state.personnelDrivers,
    fteReductions: state.fteReductions,
    buyoutCounts: state.buyoutCounts,
    buyoutCosts: state.buyoutCosts,
    operatingReductions: state.operatingReductions,
    removedOperatingItems: state.removedOperatingItems,
    keptProjects: state.keptProjects,
    keptExpenseCapitalItems: state.keptExpenseCapitalItems,
    lockedDepartments: state.lockedDepartments,
    proposedMillage: state.proposedMillage,
    scenarioMeta: state.scenarioMeta,
    savedTotals: scenarioTotals()
  };
}

function getScenarioStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(scenarioStoreKey) || "{}");
    return parsed.version === 1 && parsed.scenarios ? parsed : { version: 1, scenarios: {} };
  } catch {
    return { version: 1, scenarios: {} };
  }
}

function setScenarioStore(store) { localStorage.setItem(scenarioStoreKey, JSON.stringify(store)); }

function saveScenario() {
  const name = state.scenarioMeta.name.trim();
  if (!name) { showMessage("Enter a scenario name before saving."); return; }
  const store = getScenarioStore();
  const existing = store.scenarios[name];
  const now = new Date().toISOString();
  store.scenarios[name] = {
    name,
    notes: state.scenarioMeta.notes,
    author: state.scenarioMeta.author,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    mode: isStaffMode ? "Staff" : "Public",
    data: scenarioSnapshot()
  };
  state.selectedScenarioName = name;
  setScenarioStore(store);
  renderScenarioManager();
  showMessage(`Saved scenario: ${name}.`);
  renderScenarioComparison();
}

function loadScenario() {
  const name = state.selectedScenarioName || $("#scenarioSelect")?.value;
  const saved = getScenarioStore().scenarios[name];
  if (!saved) { showMessage("Select a saved scenario to load."); return; }
  Object.assign(state.revenueAssumptions, saved.data.revenueAssumptions || {});
  Object.assign(state.personnelDrivers, saved.data.personnelDrivers || {});
  state.fteReductions = { ...(saved.data.fteReductions || {}) };
  state.buyoutCounts = { ...(saved.data.buyoutCounts || {}) };
  state.buyoutCosts = { ...(saved.data.buyoutCosts || {}) };
  state.operatingReductions = { ...(saved.data.operatingReductions || {}) };
  state.removedOperatingItems = { ...(saved.data.removedOperatingItems || {}) };
  state.keptProjects = { ...(saved.data.keptProjects || {}) };
  state.keptExpenseCapitalItems = { ...(saved.data.keptExpenseCapitalItems || {}) };
  state.lockedDepartments = { ...(saved.data.lockedDepartments || {}) };
  state.proposedMillage = saved.data.proposedMillage || budgetData.millageAssumptions.adoptedMillage;
  state.scenarioMeta = { name: saved.name, author: saved.author || "", notes: saved.notes || "" };
  state.selectedScenarioName = name;
  syncScenarioFields();
  rerender();
  showMessage(`Loaded scenario: ${name}.`);
}

function deleteScenario() {
  const name = state.selectedScenarioName || $("#scenarioSelect")?.value;
  const store = getScenarioStore();
  if (!store.scenarios[name]) { showMessage("Select a saved scenario to delete."); return; }
  delete store.scenarios[name];
  state.selectedScenarioName = "";
  setScenarioStore(store);
  renderScenarioManager();
  showMessage(`Deleted scenario: ${name}.`);
  renderScenarioComparison();
}

function resetWorkingScenario() {
  state.fteReductions = {};
  state.buyoutCounts = {};
  state.buyoutCosts = {};
  state.operatingReductions = {};
  state.keptProjects = {};
  state.lockedDepartments = {};
  state.proposedMillage = budgetData.millageAssumptions.adoptedMillage;
  state.scenarioMeta = { name: "", author: "", notes: "" };
  state.selectedScenarioName = "";
  syncScenarioFields();
  rerender();
  showMessage("Working scenario reset.");
}

function syncScenarioFields() {
  $("#scenarioName").value = state.scenarioMeta.name || "";
  $("#scenarioNotes").value = state.scenarioMeta.notes || "";
  const select = $("#scenarioSelect");
  if (select) select.value = state.selectedScenarioName || "";
}


function renderScenarioComparison() {
  const box = $("#scenarioComparison");
  if (!box) return;
  const saved = getScenarioStore().scenarios[state.selectedScenarioName];
  if (!saved?.data?.savedTotals) { box.innerHTML = '<div class="comparison-item"><span>Comparison</span><strong>No saved scenario selected</strong></div>'; return; }
  const current = scenarioTotals();
  const previous = saved.data.savedTotals;
  const rows = [["Shortfall", current.remainingShortfall - previous.remainingShortfall], ["Personnel", current.personnelReductions - previous.personnelReductions], ["Operating", current.operatingReductions - previous.operatingReductions], ["Capital", current.capitalReductions - previous.capitalReductions], ["Total", current.totalReductions - previous.totalReductions]];
  box.innerHTML = rows.map(([label, value]) => `<div class="comparison-item"><span>${label} vs Saved</span><strong>${money(value)}</strong></div>`).join("");
}

function renderResultingShortfallForecast(totals) {
  const anchor = $("#millageShortfallImpact");
  if (!anchor) return;

  let forecastBox = $("#resultingShortfallForecast");
  if (!forecastBox) {
    forecastBox = document.createElement("div");
    forecastBox.id = "resultingShortfallForecast";
    forecastBox.className = "resulting-shortfall-forecast";
    anchor.insertAdjacentElement("afterend", forecastBox);
  }

  const fy2027MillageShortfall = Math.max(currentMillageRevenue() - estimatedMillageRevenue(), 0);

  const rows = [
    { year: "FY2027", amount: fy2027MillageShortfall },
    ...shortfallComponents()
      .filter((year) => ["FY2028", "FY2029", "FY2030", "FY2031", "FY2032"].includes(year.year))
      .map((year) => {
        const forecastShortfall = year.directRevenueReduction + year.expenseInflationPressure;
        return {
          year: year.year,
          amount: Math.max(forecastShortfall + fy2027MillageShortfall - totals.totalReductions, 0)
        };
      })
  ];

  forecastBox.innerHTML = `
    <div class="resulting-shortfall-table">
      ${rows.map((row) => `
        <div class="resulting-shortfall-table-row">
          <strong>${row.year}</strong>
          <em class="${row.amount ? "negative-value" : ""}">${row.amount ? negativeMoney(row.amount) : "$0"}</em>
        </div>
      `).join("")}
    </div>
  `;
}

function reductionRowsForPdf() {
  const impacts = scenarioTotals().departmentImpacts.filter((impact) => !excluded(impact.department) && (impact.fteReduction || impact.buyoutCount || impact.operatingReductionAmount || impact.personnelReduction));
  const capitalRows = budgetData.capitalProjects.filter((project) => !state.keptProjects[project.id]).map((project) => `<tr><td>${departmentName(project.departmentId)}</td><td>${project.name}</td><td>${money(project.cost)}</td></tr>`).join("") || '<tr><td colspan="3">No capital or equipment projects removed.</td></tr>';
  const personnelRows = impacts.filter((impact) => impact.fteReduction || impact.buyoutCount).map((impact) => `<tr><td>${impact.department.name}</td><td>${number(impact.fteReduction)}</td><td>${number(impact.buyoutCount)}</td><td>${money(impact.personnelReduction)}</td><td>${money(impact.buyoutOneTimeCost)}</td></tr>`).join("") || '<tr><td colspan="5">No personnel reductions selected.</td></tr>';
  const operatingRows = impacts.filter((impact) => impact.operatingReductionAmount || impact.removedOperatingAmount).map((impact) => `<tr><td>${impact.department.name}</td><td>${percent(impact.operatingReduction)}</td><td>${money((impact.operatingReductionAmount || 0) + (impact.removedOperatingAmount || 0))}${impact.removedOperatingAmount ? ` <small>(includes ${money(impact.removedOperatingAmount)} removed items)</small>` : ''}</td></tr>`).join("") || '<tr><td colspan="3">No operating reductions selected.</td></tr>';
  const impactRows = scenarioTotals().departmentImpacts.filter((impact) => !excluded(impact.department)).sort(sortDepartments).map((impact) => `<tr><td>${impact.department.name}</td><td>${number(impact.fteReduction)}</td><td>${constitutional(impact.department) ? "" : percent(impact.operatingReduction)}</td><td>${money(impact.personnelReduction)}</td><td>${money((impact.operatingReductionAmount || 0) + (impact.removedOperatingAmount || 0))}</td><td>${money(impact.totalReduction)}</td><td>${impact.locked || constitutional(impact.department) ? "Locked" : "Adjustable"}</td></tr>`).join("");
  return { personnelRows, operatingRows, capitalRows, impactRows };
}

function exportPdf() {
  const totals = scenarioTotals();
  const scenario = scenarioYear();
  const rows = reductionRowsForPdf();
  const report = window.open("", "_blank");
  if (!report) return;
  report.document.write(`<!doctype html><html><head><title>Walton County Scenario Report</title><style>@page{size:landscape;margin:.45in;@bottom-center{content:"Page " counter(page)}}:root{--green:#006231;--gold:#d1be78;--ink:#1f2a24;--muted:#5f6f66;--line:#d8ded9}body{font-family:Arial,Helvetica,sans-serif;color:var(--ink);margin:0}.report-header{display:flex;justify-content:space-between;gap:24px;align-items:center;border-bottom:4px solid var(--green);padding-bottom:14px;margin-bottom:18px}.brand{display:flex;align-items:center;gap:14px}.seal{width:62px;height:62px;border:4px solid var(--gold);border-radius:50%;display:grid;place-items:center;color:var(--green);font-weight:900}.eyebrow{color:var(--green);font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.04em;margin:0 0 4px}h1,h2,h3{margin:0;color:var(--green)}h1{font-size:28px}h2{font-size:18px;margin:22px 0 10px}.meta,.kpis,.assumptions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.card{border:1px solid var(--line);border-radius:8px;padding:10px;background:#fbfcfc}.card span{display:block;color:var(--muted);font-size:11px;font-weight:800;text-transform:uppercase}.card strong{display:block;margin-top:5px;font-size:18px;color:var(--green)}table{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:11px;page-break-inside:auto}th{background:var(--green);color:white;text-align:left;padding:7px}td{border-bottom:1px solid var(--line);padding:7px;vertical-align:top}.page-break{break-before:page}.footer{border-top:2px solid var(--gold);padding-top:10px;margin-top:18px;color:var(--muted);font-size:11px}</style></head><body><header class="report-header"><div class="brand"><div class="seal">WC</div><div><p class="eyebrow">Walton County Budget Simulation</p><h1>Scenario Report</h1></div></div><div><strong>Generated:</strong> ${new Date().toLocaleString()}<br><strong>Mode:</strong> ${isStaffMode ? "Staff" : "Public"}</div></header><section class="meta"><div class="card"><span>Scenario Name</span><strong>${state.scenarioMeta.name || "Working Scenario"}</strong></div><div class="card"><span>Notes</span><p>${state.scenarioMeta.notes || "None provided"}</p></div><div class="card"><span>Millage</span><strong>${millage(state.proposedMillage)}</strong></div></section><h2>Fiscal Summary</h2><section class="kpis"><div class="card"><span>Projected Revenue</span><strong>${money(scenario.revenue)}</strong></div><div class="card"><span>Projected Supported Expense</span><strong>${money(scenario.projectedSupportedExpense)}</strong></div><div class="card"><span>Projected Revenue Shortfall</span><strong>${money(totals.revenueShortfall)}</strong></div><div class="card"><span>Selected Reductions</span><strong>${money(totals.totalReductions)}</strong></div><div class="card"><span>Remaining Revenue Shortfall</span><strong>${money(totals.remainingShortfall)}</strong></div>${isStaffMode && totals.surplus ? `<div class="card"><span>Modeled Surplus</span><strong>${money(totals.surplus)}</strong></div>` : ""}</section><h2>Assumptions</h2><section class="assumptions"><div class="card"><span>Revenue Growth Rate</span><strong>${percent(state.revenueAssumptions.futureRevenueGrowthRate * 100)}</strong></div><div class="card"><span>FY2028 Revenue Reduction</span><strong>${money(state.revenueAssumptions.fy2028RevenueReduction)}</strong></div><div class="card"><span>FY2029 Revenue Reduction</span><strong>${money(state.revenueAssumptions.fy2029RevenueReduction)}</strong></div><div class="card"><span>Supported Expense Inflation</span><strong>${percent(state.revenueAssumptions.futureExpenseInflationRate * 100)}</strong></div><div class="card"><span>Rollback Rate</span><strong>${rollbackRate().toFixed(4)}</strong></div><div class="card"><span>Personnel Factor Total</span><strong>${percent(driverTotal() * 100)}</strong></div></section><h2>Personnel Reductions and Buy-Outs</h2><table><thead><tr><th>Department</th><th>FTE Reduction</th><th>Buy-Out Count</th><th>Recurring Reduction</th><th>One-Time Buy-Out Cost</th></tr></thead><tbody>${rows.personnelRows}</tbody></table><h2>Operating Reductions</h2><table><thead><tr><th>Department</th><th>Reduction</th><th>Amount</th></tr></thead><tbody>${rows.operatingRows}</tbody></table><h2>Capital / Equipment</h2><table><thead><tr><th>Department</th><th>Project Removed</th><th>Cost</th></tr></thead><tbody>${rows.capitalRows}</tbody></table><h2 class="page-break">Department Impact Summary</h2><table><thead><tr><th>Department</th><th>FTE Reduction</th><th>Operating Reduction</th><th>Personnel Reduction</th><th>Operating Amount</th><th>Total Reduction</th><th>Status</th></tr></thead><tbody>${rows.impactRows}</tbody></table><footer class="footer">This report is a simulation for planning and public education purposes. It is not an adopted budget action.</footer></body></html>`);
  report.document.close();
  report.focus();
  report.print();
}


function rerender() {
  renderDrivers();
  renderStaffRevenueControls();
  renderLocks();
  renderPersonnel();
  renderOperating();
  renderCapital();
  renderTopServices();
  renderRankings();
  renderDepartments();
  renderServiceDiagnostics();
  renderAssumptions();
  renderScenarioManager();
  setupScenarioAccordions();
  updateResults();
}

const serviceAreaConfig = window.serviceAreaMappings || { serviceAreas: [], departmentMappings: {} };
const serviceAreaNameById = () => Object.fromEntries((serviceAreaConfig.serviceAreas || []).map((area) => [area.id, area.name]));
const serviceAreaIdByName = () => Object.fromEntries((serviceAreaConfig.serviceAreas || []).map((area) => [area.name, area.id]));

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "service";
}

function setServiceAreaStatus(message, isError = false) {
  const status = $("#serviceAreaImportStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("negative-value", isError);
}

function loadSheetJs() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (window.sheetJsLoading) return window.sheetJsLoading;
  window.sheetJsLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Spreadsheet parser could not be loaded."));
    document.head.appendChild(script);
  });
  return window.sheetJsLoading;
}

const csvColumnAliases = {
  department: ["department"],
  serviceArea: ["servicearea", "service area"],
  description: ["description"],
  services: ["services", "services and programs", "service and program", "services programs", "services & programs"],
  capitalProjects: ["capitalprojects", "capital projects"],
  performanceMeasures: ["performancemeasures", "performance measures"],
  notes: ["notes", "review notes"]
};

function normalizeCsvHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function headerMatches(header, aliases) {
  const normalizedHeader = normalizeCsvHeader(header);
  return aliases.some((alias) => normalizeCsvHeader(alias) === normalizedHeader);
}

function csvFieldMap(headers) {
  return Object.fromEntries(Object.entries(csvColumnAliases).map(([field, aliases]) => [
    field,
    headers.findIndex((header) => headerMatches(header, aliases))
  ]));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => String(value).trim())) rows.push(row);
  return rows;
}

function isSpreadsheetPackage(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function serviceHeaderScore(row) {
  const fields = csvFieldMap(row || []);
  return Object.values(fields).filter((index) => index >= 0).length;
}

async function spreadsheetRows(buffer) {
  await loadSheetJs();
  const workbook = window.XLSX.read(buffer, { type: "array" });
  let bestRows = [];
  let bestScore = 0;
  workbook.SheetNames.forEach((sheetName) => {
    const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "", blankrows: false });
    rows.forEach((row, index) => {
      const score = serviceHeaderScore(row);
      if (score > bestScore) {
        bestScore = score;
        bestRows = rows.slice(index);
      }
    });
  });
  return bestRows;
}

async function serviceRowsFromFile(file) {
  const buffer = await file.arrayBuffer();
  if (isSpreadsheetPackage(buffer)) return spreadsheetRows(buffer);
  const text = new TextDecoder().decode(buffer);
  return parseCsv(text);
}

function splitCsvList(value) {
  return String(value || "")
    .split(/\n|;|\||\u2022|(?:^|\s)\d+[.)]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const serviceDepartmentAliases = {
  "purchasing": "Procurement",
  "geographic info system": "Geographic Info Systems",
  "environmental resources": "Environmental Services",
  "probation": "Probation Services",
  "planning vacation rental certification program": "Planning"
};

const serviceWarningIgnoreDepartmentIds = new Set([
  ...(budgetData.constitutionalOfficeIds || []),
  ...(budgetData.excludedScenarioDepartmentIds || [])
]);

function matchDepartmentByName(name) {
  const normalized = normalizeCsvHeader(name);
  const aliasName = serviceDepartmentAliases[normalized];
  const normalizedAlias = normalizeCsvHeader(aliasName);
  return budgetData.departments.find((department) => normalizeCsvHeader(department.name) === normalized)
    || budgetData.departments.find((department) => normalizeCsvHeader(department.name) === normalizedAlias)
    || budgetData.departments.find((department) => slug(department.name) === slug(name));
}

function csvCell(row, index) {
  return index >= 0 ? String(row[index] || "").trim() : "";
}

function buildServiceWarnings(rows) {
  const warnings = [];
  const seen = new Map();
  const matchedIds = new Set();
  rows.forEach((row, index) => {
    const label = row.department || `Row ${index + 1}`;
    if (!row.department) warnings.push(`Row ${index + 1}: missing department.`);
    if (!row.serviceArea) warnings.push(`${label}: missing service area.`);
    if (!row.description) warnings.push(`${label}: missing description.`);
    if (!row.services.length) warnings.push(`${label}: no services/programs.`);
    if (seen.has(row.departmentKey)) warnings.push(`${label}: duplicate department row.`);
    seen.set(row.departmentKey, true);
    if (row.matchedDepartment) {
      matchedIds.add(row.departmentId);
    } else if (row.department) {
      warnings.push(`${row.department}: does not match budgetData.departments.`);
    }
  });
  budgetData.departments.forEach((department) => {
    if (serviceWarningIgnoreDepartmentIds.has(department.id)) return;
    if (!matchedIds.has(department.id)) warnings.push(`${department.name}: no CSV service data.`);
  });
  return warnings;
}

function serviceDraftFromCsvRows(csvRows, fileName) {
  if (csvRows.length < 2) throw new Error("CSV must include a header row and at least one data row.");
  const headers = csvRows[0];
  const fields = csvFieldMap(headers);
  const missingColumns = Object.entries(fields).filter(([, index]) => index < 0).map(([field]) => field);
  if (missingColumns.length) throw new Error(`CSV is missing required columns: ${missingColumns.join(", ")}.`);
  const rows = csvRows.slice(1).map((row, index) => {
    const department = csvCell(row, fields.department);
    const matchedDepartment = matchDepartmentByName(department);
    const departmentId = matchedDepartment?.id || slug(department || `csv-row-${index + 1}`);
    return {
      id: departmentId,
      departmentId,
      departmentKey: slug(department || departmentId),
      matchedDepartment,
      department: matchedDepartment?.name || department,
      serviceArea: csvCell(row, fields.serviceArea),
      description: csvCell(row, fields.description),
      services: splitCsvList(csvCell(row, fields.services)),
      capitalProjects: splitCsvList(csvCell(row, fields.capitalProjects)),
      performanceMeasures: splitCsvList(csvCell(row, fields.performanceMeasures)),
      notes: csvCell(row, fields.notes),
      source: fileName
    };
  }).filter((row) => row.department || row.serviceArea || row.description || row.services.length || row.capitalProjects.length || row.performanceMeasures.length || row.notes);
  return { rows, warnings: buildServiceWarnings(rows) };
}

function renderServiceAreaReview() {
  const table = $("#serviceAreaPreviewTable");
  const wrap = table?.closest(".service-review-wrap");
  const exportButton = $('[data-control="export-service-areas"]');
  const sourceFile = $("#serviceAreaSourceFile");
  const warningBox = $("#serviceAreaValidationWarnings");
  if (!table || !wrap || !exportButton) return;
  wrap.hidden = !state.serviceAreaDraft.length;
  exportButton.disabled = !state.serviceAreaDraft.length;
  if (sourceFile) sourceFile.textContent = state.serviceAreaSourceFileName ? `Previewing: ${state.serviceAreaSourceFileName}` : "";
  if (warningBox) {
    warningBox.innerHTML = state.serviceAreaWarnings.length
      ? `<p>${state.serviceAreaWarnings.length} validation warning${state.serviceAreaWarnings.length === 1 ? "" : "s"}</p><ul>${state.serviceAreaWarnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`
      : "";
  }
  table.innerHTML = state.serviceAreaDraft.map((row) => `
    <tr class="${row.matchedDepartment ? "" : "warning-row"}">
      <td><strong>${escapeHtml(row.department)}</strong>${row.matchedDepartment ? "" : "<small>Unmatched department</small>"}</td>
      <td>${escapeHtml(row.serviceArea)}</td>
      <td>${escapeHtml(row.description)}</td>
      <td>${number(row.services.length)}</td>
      <td>${number(row.capitalProjects.length)}</td>
      <td>${number(row.performanceMeasures.length)}</td>
      <td><small>${escapeHtml(row.notes)}</small></td>
    </tr>
  `).join("");
}

async function importServiceCsv(file) {
  if (!file) return;
  if (!isStaffMode) return;
  state.serviceAreaSourceFileName = file.name || "department_services_review.csv";
  setServiceAreaStatus("Reading service data...");
  try {
    const csvRows = await serviceRowsFromFile(file);
    const result = serviceDraftFromCsvRows(csvRows, state.serviceAreaSourceFileName);
    state.serviceAreaDraft = result.rows;
    state.serviceAreaWarnings = result.warnings;
    renderServiceAreaReview();
    setServiceAreaStatus(state.serviceAreaDraft.length ? `Loaded ${state.serviceAreaDraft.length} department service row${state.serviceAreaDraft.length === 1 ? "" : "s"} from CSV.` : "No service rows were detected in this CSV.", !state.serviceAreaDraft.length);
  } catch (error) {
    state.serviceAreaDraft = [];
    state.serviceAreaWarnings = [];
    renderServiceAreaReview();
    setServiceAreaStatus(error.message || "CSV import failed.", true);
  }
}

function updateServiceAreaDraft() {}

function exportServiceAreaDraft() {
  if (!state.serviceAreaDraft.length) {
    setServiceAreaStatus("Import and review a CSV before exporting.", true);
    return;
  }
  const departmentsPayload = state.serviceAreaDraft.reduce((payload, row) => {
    payload[row.departmentId] = {
      department: row.department,
      serviceArea: row.serviceArea,
      description: row.description,
      services: row.services,
      capitalProjects: row.capitalProjects,
      performanceMeasures: row.performanceMeasures,
      notes: row.notes
    };
    return payload;
  }, {});
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: state.serviceAreaSourceFileName || "department_services_review.csv",
    departments: departmentsPayload
  };
  const content = `window.departmentServices = ${JSON.stringify(payload, null, 2)};\n`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/javascript" }));
  link.download = "DepartmentServices.js";
  link.click();
  URL.revokeObjectURL(link.href);
  setServiceAreaStatus(`Exported ${Object.keys(departmentsPayload).length} department service record${Object.keys(departmentsPayload).length === 1 ? "" : "s"}.`);
}

function updateRevenueAssumptionFromInput(input) {
  const assumption = input.dataset.assumption;
  const isCurrency = input.dataset.format === "currency";
  const isMillage = input.dataset.format === "millage";
  const value = isCurrency ? parseMoney(input.value) : Number(input.value || 0);
  if (isMillage && !String(input.value || "").trim()) {
    state.revenueAssumptions[assumption] = "";
  } else {
    state.revenueAssumptions[assumption] = ["futureRevenueGrowthRate", "futureExpenseInflationRate"].includes(assumption) ? value / 100 : value;
  }
  if (isCurrency) input.value = String(input.value || "").trim() ? wholeMoneyInput(value) : "";
  if (assumption === "baselineRevenue" && (state.revenueAssumptions.rollbackRate === "" || state.revenueAssumptions.rollbackRate == null)) {
    const rollbackInput = $('[data-assumption="rollbackRate"]');
    if (rollbackInput && document.activeElement !== rollbackInput) rollbackInput.value = calculatedRollbackRate().toFixed(4);
  }
  updateResults();
}

document.addEventListener("input", (event) => {
  const control = event.target.dataset.control;
  const id = event.target.dataset.department;
  if (control === "fte") {
    const department = budgetData.departments.find((item) => item.id === id);
    state.fteReductions[id] = capPublicFte(department, Number(event.target.value || 0));
    updateResults();
  }
  if (control === "buyout-count") {
    const department = budgetData.departments.find((item) => item.id === id);
    state.buyoutCounts[id] = capPublicBuyout(department, Number(event.target.value || 0));
    updateResults();
  }
  if (control === "buyout-cost") { state.buyoutCosts[id] = parseMoney(event.target.value); updateResults(); }
  if (control === "operating") {
    const department = budgetData.departments.find((item) => item.id === id);
    const cappedValue = capPublicOperating(department, Number(event.target.value || 0));
    state.operatingReductions[id] = cappedValue;
    if (Number(event.target.value || 0) !== cappedValue) event.target.value = cappedValue;

    const row = event.target.closest(".slider-row");
    const percentInput = row?.querySelector('[data-control="operating-percent"]');
    const newBudget = row?.querySelector(".new-operating-budget-value");

    if (percentInput) percentInput.value = cappedValue;
    if (newBudget) newBudget.textContent = money(Math.max(department.operatingBudget - removedOperatingAmountForDepartment(department), 0) * (1 - cappedValue / 100));

    updateResults();
  }
  if (control === "operating-percent") {
    const department = budgetData.departments.find((item) => item.id === id);
    const cappedValue = capPublicOperating(department, Number(event.target.value || 0));
    state.operatingReductions[id] = cappedValue;
    if (Number(event.target.value || 0) !== cappedValue) event.target.value = cappedValue;

    const row = event.target.closest(".slider-row");
    const slider = row?.querySelector('[data-control="operating"]');
    const newBudget = row?.querySelector(".new-operating-budget-value");

    if (slider) slider.value = cappedValue;
    if (newBudget) newBudget.textContent = money(Math.max(department.operatingBudget - removedOperatingAmountForDepartment(department), 0) * (1 - cappedValue / 100));

    updateResults();
  }
  if (control === "revenue-assumption" && isStaffMode) {
    updateRevenueAssumptionFromInput(event.target);
  }
  if (control === "ranking-search") { state.rankingSearch = event.target.value; renderRankings(); }
  if (control === "department-search") { state.departmentSearch = event.target.value; renderDepartments(); }
  if (control === "scenario-meta") { state.scenarioMeta[event.target.dataset.field] = event.target.value; }
  if (control === "millage" && isStaffMode) {
    const cleanedMillage = String(event.target.value || "").replace(/[^0-9.]/g, "");
    const parsedMillage = Number(cleanedMillage);
    if (cleanedMillage === "") {
      state.proposedMillage = 0;
      updateResults();
      return;
    }
    if (!Number.isNaN(parsedMillage)) {
      state.proposedMillage = parsedMillage;
      updateResults();
    }
  }
});

document.addEventListener("change", (event) => {
  const control = event.target.dataset.control;
  if (control === "capital") {
    const project = budgetData.capitalProjects.find((item) => item.id === event.target.dataset.project);
    const removing = !event.target.checked;
    if (!isStaffMode && removing && project.cost > availableShortfallExcluding("capital", project.id)) {
      state.keptProjects[project.id] = true;
      showMessage("Selected reductions cannot exceed the projected revenue shortfall.");
    } else {
      state.keptProjects[project.id] = event.target.checked;
    }
    renderCapital(); updateResults();
  }
  if (control === "expense-capital") {
    const item = expenseItemByKey(event.target.dataset.item);
    const removing = !event.target.checked;
    if (!item) return;
    if (!isStaffMode && removing && Number(item.amount || 0) > availableShortfallExcluding("capital", item.expenseKey)) {
      state.keptExpenseCapitalItems[item.expenseKey] = true;
      event.target.checked = true;
      showMessage("Selected reductions cannot exceed the projected revenue shortfall.");
    } else {
      state.keptExpenseCapitalItems[item.expenseKey] = event.target.checked;
    }
    renderCapital(); updateResults();
  }
  if (control === "department-lock") { state.lockedDepartments[event.target.dataset.department] = event.target.checked; rerender(); }
  if (control === "department-year") { state.departmentFiscalYear = event.target.value; renderDepartments(); }
  if (control === "overview-year") { state.overviewFiscalYear = event.target.value; renderTopServices(); }
  if (control === "scenario-select") { state.selectedScenarioName = event.target.value; renderScenarioComparison(); }
  if (control === "service-csv") { importServiceCsv(event.target.files?.[0]); }
  if (control === "revenue-assumption" && isStaffMode) { updateRevenueAssumptionFromInput(event.target); }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-control]");
  if (!button) return;
  const control = button.dataset.control;
  if (control === "toggle-tools") { $("#scenarioToolsDrawer").hidden = false; button.setAttribute("aria-expanded", "true"); }
  if (control === "close-tools") { $("#scenarioToolsDrawer").hidden = true; $('[data-control="toggle-tools"]')?.setAttribute("aria-expanded", "false"); }
  if (control === "ranking-tab") {
    state.rankingTab = button.dataset.ranking;
    $$('[data-control="ranking-tab"]').forEach((item) => item.classList.toggle("active", item === button));
    renderRankings();
  }
  if (control === "toggle-top-services") { state.showAllTopServices = !state.showAllTopServices; renderTopServices(); }
  if (control === "toggle-rankings") { state.showAllRankings = !state.showAllRankings; renderRankings(); }
  if (control === "toggle-impact-table") { state.showImpactTable = !state.showImpactTable; renderImpact(); }
  if (control === "clear-personnel") {
    state.fteReductions = {};
    state.buyoutCounts = {};
    state.buyoutCosts = {};
    renderPersonnel();
    updateResults();
  }
  if (control === "clear-operating") {
    state.operatingReductions = {};
    state.removedOperatingItems = {};
    renderOperating();
    updateResults();
  }
  if (control === "clear-capital") {
    state.keptProjects = {};
    state.keptExpenseCapitalItems = {};
    renderCapital();
    updateResults();
  }
  if (control === "export-rankings") csv("department-rankings.csv", ["Department", "Ad Valorem Support", "FTE", "Budget"], sortedRankingRows().map((row) => [row.name, money(row.support), number(row.fte), money(row.budget)]));
  if (control === "export-impact") csv("scenario-impact.csv", ["Department", "FTE Reduced", "Operating Reduction", "Personnel Reduction", "Operating Reduction Amount", "Total Department Reduction"], scenarioTotals().departmentImpacts.filter((impact) => !excluded(impact.department)).sort(sortDepartments).map((impact) => [impact.department.name, number(impact.fteReduction), constitutional(impact.department) ? "" : percent(impact.operatingReduction), money(impact.personnelReduction), money(impact.operatingReductionAmount), money(impact.totalReduction)]));
  if (control === "export-pdf") exportPdf();
  if (control === "export-service-areas") exportServiceAreaDraft();
  if (control === "toggle-expense-categories") {
    const dept = button.dataset.department;
    state.expenseDetailShowAll ??= {};
    state.expenseDetailShowAll[dept] = !state.expenseDetailShowAll[dept];
    renderDepartments();
  }
  if (control === "open-service-converter") {
    window.open("service-data-converter.html", "_blank", "noopener");
  }
  if (control === "open-expense-converter") {
    window.open("expense-detail-converter.html", "_blank", "noopener");
  }
  if (control === "open-fte-converter") {
    window.open("fte-converter.html", "_blank", "noopener");
  }
  if (control === "open-ad-valorem-converter") {
    window.open("ad-valorem-support-converter.html", "_blank", "noopener");
  }
  if (control === "save-scenario") saveScenario();
  if (control === "load-scenario") loadScenario();
  if (control === "delete-scenario") deleteScenario();
  if (control === "reset-scenario") resetWorkingScenario();
  if (control === "reset-millage" && isStaffMode) { state.proposedMillage = budgetData.millageAssumptions.adoptedMillage; updateResults(); }
  if (control === "toggle-operating-item") {
    const item = expenseItemByKey(button.dataset.item);
    if (!item) return;
    const openDetail = button.closest(".operating-line-detail");
    if (openDetail?.dataset.department) state.operatingDetailOpen[openDetail.dataset.department] = openDetail.open;
    const removing = !state.removedOperatingItems[item.expenseKey];
    if (!isStaffMode && removing && Number(item.amount || 0) > availableShortfallExcluding("operating-item", item.expenseKey)) {
      showMessage("Selected reductions cannot exceed the projected revenue shortfall.");
      return;
    }
    state.removedOperatingItems[item.expenseKey] = removing;
    renderOperating();
    updateResults();
  }
  if (control === "select-department") { state.selectedDepartmentId = button.dataset.department; renderDepartments(); }
});

document.addEventListener("toggle", (event) => {
  const detail = event.target.closest?.(".operating-line-detail");
  if (detail?.dataset.department) state.operatingDetailOpen[detail.dataset.department] = detail.open;
}, true);

function init() {
  renderChrome();
  logServiceDataAudit();
  const drawer = $("#scenarioToolsDrawer");
  if (drawer) drawer.hidden = true;

  const toggleButton = $('[data-control="toggle-tools"]');
  if (toggleButton) toggleButton.setAttribute("aria-expanded", "false");

  if (drawer) {
    drawer.addEventListener("click", (event) => {
      if (event.target === drawer) {
        drawer.hidden = true;
        toggleButton?.setAttribute("aria-expanded", "false");
      }
    });
  }

  syncScenarioFields();
  renderDrivers();
  renderStaffRevenueControls();
  renderLocks();
  renderPersonnel();
  renderOperating();
  renderCapital();
  renderTopServices();
  renderRankings();
  renderDepartments();
  renderServiceDiagnostics();
  renderAssumptions();
  renderScenarioManager();
  setupScenarioAccordions();
  if (drawer) drawer.hidden = true;
  renderCharts();
  updateResults();
}

init();
