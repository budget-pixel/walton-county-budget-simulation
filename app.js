const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const currencyInputFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const historicalActualRevenues = [["FY2022", 89972682], ["FY2023", 110875024], ["FY2024", 131679989], ["FY2025", 149437335], ["FY2026", 152900634]];
const historicalFundingData = window.historicalDepartmentFunding || [];
const isStaffMode = new URLSearchParams(window.location.search).get("mode") === "staff";
const scenarioStoreKey = "waltonBudgetScenarios";

const state = {
  revenueAssumptions: {
    ...budgetData.revenueForecast.defaultAssumptions,
    baselineRevenue: budgetData.revenueForecast.baseRevenue,
    baselineExpense: budgetData.budgetBaselineTotals.adValoremSupportedExpenseBaseline,
    futureRevenueGrowthRate: 0.01,
    futureExpenseInflationRate: 0.03,
    fy2029RevenueReduction: 9700000
  },
  personnelDrivers: { ...budgetData.personnelCostDrivers },
  scenarioMeta: { name: "", author: "", notes: "" },
  fteReductions: {},
  buyoutCounts: {},
  buyoutCosts: {},
  operatingReductions: {},
  keptProjects: {},
  lockedDepartments: {},
  departmentFiscalYear: "FY2027 Budget",
  overviewFiscalYear: "FY2027 Budget",
  rankingTab: "support",
  rankingSearch: "",
  departmentSort: "support",
  departmentSearch: "",
  showAllTopServices: false,
  showAllDepartmentCards: false,
  showAllRankings: false,
  showImpactTable: false,
  proposedMillage: budgetData.millageAssumptions.adoptedMillage,
  selectedScenarioName: "",
  selectedParcel: budgetData.sampleParcels[0],
  parcelQuery: "",
  useHomesteadExemption: true
};

let trendChart;
let shortfallChart;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const money = (value) => currencyFormatter.format(Math.round(Number(value || 0)));
const moneyInput = (value) => currencyInputFormatter.format(Number(value || 0));
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

function rollbackRate() {
  return budgetData.millageAssumptions.fy2026BudgetedAdValoremRevenue / budgetData.millageAssumptions.taxableValueBase * 1000;
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
  const revenue = [baseRevenue, baseRevenue - fy2028Reduction, baseRevenue - fy2028Reduction - fy2029Reduction];
  const expense = [baselineExpense, 164673140];
  for (let index = 2; index < 6; index += 1) {
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
    const fteReduction = !isLocked && department.fteCount > 0 && !department.nonFteAdjustable ? Number(state.fteReductions[department.id] || 0) : 0;
    const buyoutCount = isLocked ? 0 : Math.min(Number(state.buyoutCounts[department.id] || 0), Math.max(department.fteCount - fteReduction, 0));
    const buyoutCost = isLocked ? 0 : Number(state.buyoutCosts[department.id] || 0);
    const operatingPercent = isLocked || constitutional(department) ? 0 : Number(state.operatingReductions[department.id] || 0);
    const personnelReduction = (fteReduction + buyoutCount) * averageCost;
    const oneTimeBuyoutCost = buyoutCount * buyoutCost;
    const operatingReductionAmount = department.operatingBudget * operatingPercent / 100;
    personnelReductions += personnelReduction;
    operatingReductions += operatingReductionAmount;
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
      totalReduction: personnelReduction + operatingReductionAmount
    };
  });
  const capitalReductions = budgetData.capitalProjects.reduce((total, project) => locked(project.departmentId) || state.keptProjects[project.id] ? total : total + project.cost, 0);
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
    return department ? department.operatingBudget * Number(state.operatingReductions[id] || 0) / 100 : 0;
  }
  if (type === "capital") {
    const project = budgetData.capitalProjects.find((item) => item.id === id);
    return project && !state.keptProjects[id] ? project.cost : 0;
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
  container.innerHTML = `
    <label><span>Revenue Growth</span><input type="number" step="0.1" value="${state.revenueAssumptions.futureRevenueGrowthRate * 100}" data-control="revenue-assumption" data-assumption="futureRevenueGrowthRate"></label>
    <label><span>Baseline Revenue</span><input type="text" value="${moneyInput(state.revenueAssumptions.baselineRevenue)}" data-control="revenue-assumption" data-assumption="baselineRevenue" data-format="currency"></label>
    <label><span>Baseline Expense</span><input type="text" value="${moneyInput(state.revenueAssumptions.baselineExpense)}" data-control="revenue-assumption" data-assumption="baselineExpense" data-format="currency"></label>
    <label><span>FY2029+ Inflation Rate</span><input type="number" step="0.1" value="${state.revenueAssumptions.futureExpenseInflationRate * 100}" data-control="revenue-assumption" data-assumption="futureExpenseInflationRate"></label>
    <label><span>FY2028 Revenue Reduction</span><input type="text" value="${moneyInput(state.revenueAssumptions.fy2028RevenueReduction)}" data-control="revenue-assumption" data-assumption="fy2028RevenueReduction" data-format="currency"></label>
    <label><span>FY2029 Revenue Reduction</span><input type="text" value="${moneyInput(state.revenueAssumptions.fy2029RevenueReduction)}" data-control="revenue-assumption" data-assumption="fy2029RevenueReduction" data-format="currency"></label>
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
  $("#personnelControls").innerHTML = departments().filter((department) => department.fteCount > 0 && !department.nonFteAdjustable).sort(sortDepartments).map((department) => {
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
    const newOperatingBudget = department.operatingBudget * (1 - reductionPercent / 100);
    return `<div class="slider-row ${isLocked ? "locked-row" : ""}"><div><label>${department.name}</label><div class="slider-meta">Operating budget: ${money(department.operatingBudget)}${isLocked ? " | Locked" : ""}</div><div class="slider-meta slider-meta-secondary">New operating budget: <span class="new-operating-budget-value">${money(newOperatingBudget)}</span></div></div><input class="operating-slider" type="range" min="0" max="100" value="${reductionPercent}" data-control="operating" data-department="${department.id}" ${isLocked ? "disabled" : ""}><label class="percent-entry"><input type="number" min="0" max="100" step="1" value="${reductionPercent}" data-control="operating-percent" data-department="${department.id}" ${isLocked ? "disabled" : ""}><span>%</span></label></div>`;
  }).join("");
}

function renderCapital() {
  $("#capitalControls").innerHTML = budgetData.capitalProjects.map((project) => {
    state.keptProjects[project.id] ??= true;
    const isLocked = locked(project.departmentId);
    if (isLocked) state.keptProjects[project.id] = true;
    return `<div class="project-card ${isLocked ? "locked-row" : ""}"><input type="checkbox" ${state.keptProjects[project.id] ? "checked" : ""} data-control="capital" data-project="${project.id}" ${isLocked ? "disabled" : ""}><div><label>${project.name}</label><p>${departmentName(project.departmentId)} | ${money(project.cost)}${isLocked ? " | Locked" : ""}</p></div></div>`;
  }).join("");
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
  const rows = rankingRows(state.overviewFiscalYear).filter((row) => row.support > 0).sort((a, b) => b.support - a.support);
  const visibleRows = state.showAllTopServices ? rows : rows.slice(0, 6);
  const max = Math.max(...rows.map((row) => row.support), 1);
  $("#topServicesBars").innerHTML = visibleRows.map((row, index) => `<div class="rank-bar-row ${row.constitutional ? "constitutional-row" : ""}"><div class="rank-label"><strong>${index + 1}. ${row.name}</strong><span>${money(row.support)}</span></div><div class="bar-track"><div class="bar-fill" style="width:${row.support / max * 100}%"></div></div></div>`).join("") + (rows.length > 6 ? `<button class="view-all-button" data-control="toggle-top-services">${state.showAllTopServices ? "Show Less" : "View All"}</button>` : "");
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

  if (state.departmentSort === "support") return rows.sort((a, b) => departmentSupport(b, state.departmentFiscalYear) - departmentSupport(a, state.departmentFiscalYear) || sortDepartments(a, b));
  if (state.departmentSort === "fte") return rows.sort((a, b) => b.fteCount - a.fteCount || sortDepartments(a, b));
  if (state.departmentSort === "budget") return rows.sort((a, b) => b.totalBudget - a.totalBudget || sortDepartments(a, b));
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function renderDepartments() {
  const rows = departmentExplorerRows();
  const visibleRows = state.showAllDepartmentCards ? rows : rows.slice(0, 4);
  const budgetYear = state.departmentFiscalYear === "FY2027 Budget";
  const controlsTarget = $("#departmentExplorerControls");
  if (controlsTarget) {
    controlsTarget.innerHTML = `
      <label><span>Sort Departments</span><select data-control="department-sort">
        <option value="support" ${state.departmentSort === "support" ? "selected" : ""}>Ad Valorem Support</option>
        <option value="fte" ${state.departmentSort === "fte" ? "selected" : ""}>FTE</option>
        <option value="budget" ${state.departmentSort === "budget" ? "selected" : ""}>Total Budget</option>
        <option value="alpha" ${state.departmentSort === "alpha" ? "selected" : ""}>A-Z</option>
      </select></label>
      <label><span>Search Departments</span><input type="search" value="${state.departmentSearch.replace(/"/g, "&quot;")}" placeholder="Search department" data-control="department-search"></label>
      <button type="button" class="view-all-button" data-control="export-rankings">Export Department Data</button>
    `;
  }
  $("#departmentCards").innerHTML = visibleRows.map((department) => {
    const record = historicalFundingData.find((item) => item.department === department.name)?.history.find((item) => item.fiscalYear === state.departmentFiscalYear);
    return `<article class="panel department-card ${constitutional(department) ? "constitutional-card" : ""}"><h3>${department.name}</h3><div class="department-primary-metric"><span>${budgetYear ? "FY2027 Ad Valorem Support" : "Ad Valorem Support"}</span><strong>${money(budgetYear ? departmentSupport(department) : record?.adValoremSupport || 0)}</strong></div><div class="detail-grid">${budgetYear ? detail("Personnel Budget", department.personnelBudget) + detail("Operating Budget", department.operatingBudget) + detail("Capital Budget", department.capitalBudget) + detail("Total Budget", department.totalBudget) + detail("FTE Count", department.fteCount, number) + detail("Average Personnel Cost", fteCost(department)) : record ? detail("Gross Expense", record.grossExpense) + detail("Department Revenue", record.departmentRevenue) + detail("Net Expense", record.netExpense) + detail("Ad Valorem Support", record.adValoremSupport) : '<p class="historical-note">No record available.</p>'}</div></article>`;
  }).join("") + (rows.length > 4 ? `<button class="view-all-button department-view-all-button" data-control="toggle-department-cards">${state.showAllDepartmentCards ? "Show Less" : "View All"}</button>` : "");
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
    "Expense Inflation Pressure = Revenue Shortfall - Direct Revenue Reduction",
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
      y: { beginAtZero: bar, stacked, ticks: { callback: (value) => money(value) } }
    },
    plugins: { tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${money(context.raw)}` } } }
  };
}

function renderCharts() {
  const forecast = forecastYears();
  const components = shortfallComponents();
  Chart.defaults.font.family = "Arial, Helvetica, sans-serif";
  trendChart = new Chart($("#trendChart"), { type: "line", data: { labels: forecast.map((year) => year.year), datasets: [{ label: "Projected Revenue", data: forecast.map((year) => year.revenue), borderColor: "#006231", borderDash: [6, 6] }, { label: "Projected Ad Valorem Supported Expense", data: forecast.map((year) => year.projectedSupportedExpense), borderColor: "#d1be78" }] }, options: chartOptions() });
  shortfallChart = new Chart($("#shortfallChart"), { type: "bar", data: { labels: components.map((year) => year.year), datasets: [{ label: "Direct Revenue Reduction", data: components.map((year) => year.directRevenueReduction), backgroundColor: "rgba(0, 98, 49, 0.78)", stack: "shortfall" }, { label: "Expense Inflation Pressure", data: components.map((year) => year.expenseInflationPressure), backgroundColor: "rgba(0, 98, 49, 0.28)", stack: "shortfall" }] }, options: chartOptions(true, true) });
}

function updateCharts() {
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

function renderTax() {
  const parcel = state.selectedParcel;
  const taxable = Math.max((parcel?.taxableValue || 0) - (state.useHomesteadExemption ? 150000 : 0), 0);
  const originalTax = (parcel?.taxableValue || 0) * budgetData.millageAssumptions.adoptedMillage / 1000;
  const tax = taxable * state.proposedMillage / 1000;
  $("#useHomesteadExemption").checked = state.useHomesteadExemption;
  $("#parcelResults").innerHTML = `<div class="metric-box"><span>Selected Parcel</span><strong>${parcel.address}</strong><small>${parcel.city}, FL ${parcel.zip}</small></div><div class="metric-box"><span>Taxable Value</span><strong>${money(parcel.taxableValue)}</strong></div><div class="metric-box"><span>Adjusted Taxable Value</span><strong>${money(taxable)}</strong></div><div class="metric-box"><span>Estimated County Tax</span><strong>${money(tax)}</strong><small>${money(tax - originalTax)} change from current millage</small></div>`;
  const allocationTotal = budgetData.propertyTaxCategories.reduce((sum, item) => sum + item.allocation, 0);
  const impacts = scenarioTotals().departmentImpacts;
  $("#taxBreakdown").innerHTML = budgetData.propertyTaxCategories.map((item) => {
    const impact = impacts.find((entry) => entry.department.id === item.departmentId);
    const reductionRate = impact ? Math.min(impact.totalReduction / Math.max(impact.department.totalBudget, 1), 1) : 0;
    const status = reductionRate >= 0.99 ? "eliminated" : reductionRate > 0 ? "reduced" : "active";
    const label = status === "active" ? "Active service" : status === "reduced" ? `${percent(reductionRate * 100)} reduced in scenario` : "Eliminated in scenario";
    return `<div class="service-row service-${status}"><div><strong>${item.name}</strong><small>${label}</small></div><span>${money(tax * item.allocation / allocationTotal)}</span></div>`;
  }).join("");
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
  const rollbackImpact = estimatedRevenue - budgetData.millageAssumptions.fy2026BudgetedAdValoremRevenue;
  const rollbackImpactElement = $("#rollbackRevenueImpact");
  rollbackImpactElement.textContent = signedMoney(rollbackImpact);
  rollbackImpactElement.className = toneClass(rollbackImpact);
  const totals = scenarioTotals();
  const millageShortfallImpactElement = $("#millageShortfallImpact");
  millageShortfallImpactElement.textContent = totals.remainingShortfall ? negativeMoney(totals.remainingShortfall) : isStaffMode && totals.surplus ? `${money(totals.surplus)} Modeled Surplus` : "$0";
  millageShortfallImpactElement.classList.toggle("negative-value", totals.remainingShortfall > 0);
  renderResultingShortfallForecast(totals);
  $("#taxpayerImpact").textContent = money((state.proposedMillage - budgetData.millageAssumptions.adoptedMillage) * 100);
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
  ["#heroRevenueShortfall", "#startingShortfall", "#resultRevenueShortfall"].forEach((selector) => {
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
  renderTax();
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
    keptProjects: state.keptProjects,
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
  state.keptProjects = { ...(saved.data.keptProjects || {}) };
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
  $("#scenarioAuthor").value = state.scenarioMeta.author || "";
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

  forecastBox.innerHTML = forecastYears()
    .filter((year) => ["FY2028", "FY2029", "FY2030", "FY2031", "FY2032"].includes(year.year))
    .map((year) => {
      const resultingShortfall = Math.max(year.revenueShortfall - totals.totalReductions, 0);
      return `<div><span>${year.year}</span><strong class="${resultingShortfall ? "negative-value" : ""}">${resultingShortfall ? negativeMoney(resultingShortfall) : "$0"}</strong></div>`;
    })
    .join("");
}

function reductionRowsForPdf() {
  const impacts = scenarioTotals().departmentImpacts.filter((impact) => !excluded(impact.department) && (impact.fteReduction || impact.buyoutCount || impact.operatingReductionAmount || impact.personnelReduction));
  const capitalRows = budgetData.capitalProjects.filter((project) => !state.keptProjects[project.id]).map((project) => `<tr><td>${departmentName(project.departmentId)}</td><td>${project.name}</td><td>${money(project.cost)}</td></tr>`).join("") || '<tr><td colspan="3">No capital or equipment projects removed.</td></tr>';
  const personnelRows = impacts.filter((impact) => impact.fteReduction || impact.buyoutCount).map((impact) => `<tr><td>${impact.department.name}</td><td>${number(impact.fteReduction)}</td><td>${number(impact.buyoutCount)}</td><td>${money(impact.personnelReduction)}</td><td>${money(impact.buyoutOneTimeCost)}</td></tr>`).join("") || '<tr><td colspan="5">No personnel reductions selected.</td></tr>';
  const operatingRows = impacts.filter((impact) => impact.operatingReductionAmount).map((impact) => `<tr><td>${impact.department.name}</td><td>${percent(impact.operatingReduction)}</td><td>${money(impact.operatingReductionAmount)}</td></tr>`).join("") || '<tr><td colspan="3">No operating reductions selected.</td></tr>';
  const impactRows = scenarioTotals().departmentImpacts.filter((impact) => !excluded(impact.department)).sort(sortDepartments).map((impact) => `<tr><td>${impact.department.name}</td><td>${number(impact.fteReduction)}</td><td>${constitutional(impact.department) ? "" : percent(impact.operatingReduction)}</td><td>${money(impact.personnelReduction)}</td><td>${money(impact.operatingReductionAmount)}</td><td>${money(impact.totalReduction)}</td><td>${impact.locked || constitutional(impact.department) ? "Locked" : "Adjustable"}</td></tr>`).join("");
  return { personnelRows, operatingRows, capitalRows, impactRows };
}

function exportPdf() {
  const totals = scenarioTotals();
  const scenario = scenarioYear();
  const rows = reductionRowsForPdf();
  const report = window.open("", "_blank");
  if (!report) return;
  report.document.write(`<!doctype html><html><head><title>Walton County Scenario Report</title><style>@page{size:landscape;margin:.45in;@bottom-center{content:"Page " counter(page)}}:root{--green:#006231;--gold:#d1be78;--ink:#1f2a24;--muted:#5f6f66;--line:#d8ded9}body{font-family:Arial,Helvetica,sans-serif;color:var(--ink);margin:0}.report-header{display:flex;justify-content:space-between;gap:24px;align-items:center;border-bottom:4px solid var(--green);padding-bottom:14px;margin-bottom:18px}.brand{display:flex;align-items:center;gap:14px}.seal{width:62px;height:62px;border:4px solid var(--gold);border-radius:50%;display:grid;place-items:center;color:var(--green);font-weight:900}.eyebrow{color:var(--green);font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.04em;margin:0 0 4px}h1,h2,h3{margin:0;color:var(--green)}h1{font-size:28px}h2{font-size:18px;margin:22px 0 10px}.meta,.kpis,.assumptions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.card{border:1px solid var(--line);border-radius:8px;padding:10px;background:#fbfcfc}.card span{display:block;color:var(--muted);font-size:11px;font-weight:800;text-transform:uppercase}.card strong{display:block;margin-top:5px;font-size:18px;color:var(--green)}table{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:11px;page-break-inside:auto}th{background:var(--green);color:white;text-align:left;padding:7px}td{border-bottom:1px solid var(--line);padding:7px;vertical-align:top}.page-break{break-before:page}.footer{border-top:2px solid var(--gold);padding-top:10px;margin-top:18px;color:var(--muted);font-size:11px}</style></head><body><header class="report-header"><div class="brand"><div class="seal">WC</div><div><p class="eyebrow">Walton County Budget Simulation</p><h1>Scenario Report</h1></div></div><div><strong>Generated:</strong> ${new Date().toLocaleString()}<br><strong>Mode:</strong> ${isStaffMode ? "Staff" : "Public"}</div></header><section class="meta"><div class="card"><span>Scenario Name</span><strong>${state.scenarioMeta.name || "Working Scenario"}</strong></div><div class="card"><span>Author</span><strong>${state.scenarioMeta.author || "Not specified"}</strong></div><div class="card"><span>Notes</span><p>${state.scenarioMeta.notes || "None provided"}</p></div><div class="card"><span>Millage</span><strong>${millage(state.proposedMillage)}</strong></div></section><h2>Fiscal Summary</h2><section class="kpis"><div class="card"><span>Projected Revenue</span><strong>${money(scenario.revenue)}</strong></div><div class="card"><span>Projected Supported Expense</span><strong>${money(scenario.projectedSupportedExpense)}</strong></div><div class="card"><span>Projected Revenue Shortfall</span><strong>${money(totals.revenueShortfall)}</strong></div><div class="card"><span>Selected Reductions</span><strong>${money(totals.totalReductions)}</strong></div><div class="card"><span>Remaining Revenue Shortfall</span><strong>${money(totals.remainingShortfall)}</strong></div>${isStaffMode && totals.surplus ? `<div class="card"><span>Modeled Surplus</span><strong>${money(totals.surplus)}</strong></div>` : ""}</section><h2>Assumptions</h2><section class="assumptions"><div class="card"><span>Revenue Growth Rate</span><strong>${percent(state.revenueAssumptions.futureRevenueGrowthRate * 100)}</strong></div><div class="card"><span>FY2028 Revenue Reduction</span><strong>${money(state.revenueAssumptions.fy2028RevenueReduction)}</strong></div><div class="card"><span>FY2029 Revenue Reduction</span><strong>${money(state.revenueAssumptions.fy2029RevenueReduction)}</strong></div><div class="card"><span>Supported Expense Inflation</span><strong>${percent(state.revenueAssumptions.futureExpenseInflationRate * 100)}</strong></div><div class="card"><span>Rollback Rate</span><strong>${rollbackRate().toFixed(4)}</strong></div><div class="card"><span>Personnel Factor Total</span><strong>${percent(driverTotal() * 100)}</strong></div></section><h2>Personnel Reductions and Buy-Outs</h2><table><thead><tr><th>Department</th><th>FTE Reduction</th><th>Buy-Out Count</th><th>Recurring Reduction</th><th>One-Time Buy-Out Cost</th></tr></thead><tbody>${rows.personnelRows}</tbody></table><h2>Operating Reductions</h2><table><thead><tr><th>Department</th><th>Reduction</th><th>Amount</th></tr></thead><tbody>${rows.operatingRows}</tbody></table><h2>Capital / Equipment</h2><table><thead><tr><th>Department</th><th>Project Removed</th><th>Cost</th></tr></thead><tbody>${rows.capitalRows}</tbody></table><h2 class="page-break">Department Impact Summary</h2><table><thead><tr><th>Department</th><th>FTE Reduction</th><th>Operating Reduction</th><th>Personnel Reduction</th><th>Operating Amount</th><th>Total Reduction</th><th>Status</th></tr></thead><tbody>${rows.impactRows}</tbody></table><footer class="footer">This report is a simulation for planning and public education purposes. It is not an adopted budget action.</footer></body></html>`);
  report.document.close();
  report.focus();
  report.print();
}

function searchParcels() {
  const query = (state.parcelQuery || "").toUpperCase();
  $("#parcelSuggestions").innerHTML = query ? budgetData.sampleParcels.filter((parcel) => `${parcel.address}${parcel.city}${parcel.parcel}`.toUpperCase().includes(query)).map((parcel) => `<button class="suggestion-button" data-control="select-parcel" data-parcel="${parcel.parcel}"><strong>${parcel.address}</strong><span>${parcel.city}, FL ${parcel.zip} | ${parcel.parcel}</span></button>`).join("") : "";
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
  renderAssumptions();
  renderScenarioManager();
  setupScenarioAccordions();
  updateResults();
}

document.addEventListener("input", (event) => {
  const control = event.target.dataset.control;
  const id = event.target.dataset.department;
  if (control === "fte") {
    const department = budgetData.departments.find((item) => item.id === id);
    state.fteReductions[id] = capPublicFte(department, Number(event.target.value || 0));
    renderPersonnel(); updateResults();
  }
  if (control === "buyout-count") {
    const department = budgetData.departments.find((item) => item.id === id);
    state.buyoutCounts[id] = capPublicBuyout(department, Number(event.target.value || 0));
    renderPersonnel(); updateResults();
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
    if (newBudget) newBudget.textContent = money(department.operatingBudget * (1 - cappedValue / 100));

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
    if (newBudget) newBudget.textContent = money(department.operatingBudget * (1 - cappedValue / 100));

    updateResults();
  }
  if (control === "revenue-assumption" && isStaffMode) {
    const assumption = event.target.dataset.assumption;
    const value = event.target.dataset.format === "currency" ? parseMoney(event.target.value) : Number(event.target.value || 0);
    state.revenueAssumptions[assumption] = assumption.includes("Rate") ? value / 100 : value;
    updateResults();
  }
  if (control === "ranking-search") { state.rankingSearch = event.target.value; renderRankings(); }
  if (control === "department-search") { state.departmentSearch = event.target.value; state.showAllDepartmentCards = false; renderDepartments(); }
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
  if (control === "parcel-search") { state.parcelQuery = event.target.value; searchParcels(); }
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
  if (control === "department-lock") { state.lockedDepartments[event.target.dataset.department] = event.target.checked; rerender(); }
  if (control === "department-year") { state.departmentFiscalYear = event.target.value; renderDepartments(); }
  if (control === "department-sort") { state.departmentSort = event.target.value; state.showAllDepartmentCards = false; renderDepartments(); }
  if (control === "overview-year") { state.overviewFiscalYear = event.target.value; renderTopServices(); }
  if (control === "scenario-select") { state.selectedScenarioName = event.target.value; renderScenarioComparison(); }
  if (control === "homestead") { state.useHomesteadExemption = event.target.checked; renderTax(); }
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
  if (control === "toggle-department-cards") { state.showAllDepartmentCards = !state.showAllDepartmentCards; renderDepartments(); }
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
    renderOperating();
    updateResults();
  }
  if (control === "clear-capital") {
    state.keptProjects = {};
    renderCapital();
    updateResults();
  }
  if (control === "export-rankings") csv("department-rankings.csv", ["Department", "Ad Valorem Support", "FTE", "Budget"], sortedRankingRows().map((row) => [row.name, money(row.support), number(row.fte), money(row.budget)]));
  if (control === "export-impact") csv("scenario-impact.csv", ["Department", "FTE Reduced", "Operating Reduction", "Personnel Reduction", "Operating Reduction Amount", "Total Department Reduction"], scenarioTotals().departmentImpacts.filter((impact) => !excluded(impact.department)).sort(sortDepartments).map((impact) => [impact.department.name, number(impact.fteReduction), constitutional(impact.department) ? "" : percent(impact.operatingReduction), money(impact.personnelReduction), money(impact.operatingReductionAmount), money(impact.totalReduction)]));
  if (control === "export-pdf") exportPdf();
  if (control === "save-scenario") saveScenario();
  if (control === "load-scenario") loadScenario();
  if (control === "delete-scenario") deleteScenario();
  if (control === "reset-scenario") resetWorkingScenario();
  if (control === "reset-millage" && isStaffMode) { state.proposedMillage = budgetData.millageAssumptions.adoptedMillage; updateResults(); }
  if (control === "select-parcel") { state.selectedParcel = budgetData.sampleParcels.find((parcel) => parcel.parcel === button.dataset.parcel); $("#parcelSearch").value = state.selectedParcel.address; $("#parcelSuggestions").innerHTML = ""; renderTax(); }
});

function init() {
  renderChrome();
  const drawer = $("#scenarioToolsDrawer");
  if (drawer) drawer.hidden = true;

  const toggleButton = $('[data-control="toggle-tools"]');
  if (toggleButton) toggleButton.setAttribute("aria-expanded", "false");

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
  renderAssumptions();
  renderScenarioManager();
  setupScenarioAccordions();
  if (drawer) drawer.hidden = true;
  renderCharts();
  searchParcels();
  updateResults();
}

init();
