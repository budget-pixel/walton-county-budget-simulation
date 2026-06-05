# Walton County Budget Simulation

A static browser-based MVP that helps users explore the financial impact of projected property tax revenue reductions and build their own balanced budget scenario.

The application does not recommend cuts. Users adjust personnel, operating, and capital levers and immediately see the resulting savings, remaining deficit, balanced position, or surplus.

## Features

- Executive dashboard with FY2027 and FY2028 revenue loss estimates
- Revenue vs expense trend chart
- Budget gap trend chart
- Interactive budget builder with real-time calculations
- Personnel reduction controls by department
- FTE modeling rules for zero-FTE and non-FTE-adjustable departments
- Editable revenue forecast assumptions
- Operating reduction sliders by department
- Capital project checkboxes
- Savings breakdown doughnut chart
- Remaining gap progress bar
- Department impact table
- Department detail cards
- Assumptions, methodology, and formula definitions

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js loaded from CDN
- No backend
- No database

## Project Structure

```text
/
├── index.html
├── styles.css
├── app.js
├── data/
│   └── budgetData.js
└── README.md
```

## Running Locally

Open `index.html` in a browser, or serve the folder with any static file server.

Example:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Deploying to GitHub Pages

1. Push these files to a GitHub repository.
2. Open the repository settings.
3. Go to Pages.
4. Set the source to the main branch and root folder.
5. Save the settings.

The app is fully static and can be hosted directly from GitHub Pages.

## Data

Mock budget data is stored in `data/budgetData.js`. It includes:

- FY2026-2027 department budget baseline data
- Active FTE department baselines and historical FTE reference values
- Excluded FTE departments stored separately for future use
- FY2027 through FY2032 revenue forecast assumptions
- Revenue assumptions
- Inflation assumptions
- Methodology notes
- Formula definitions

All data is for demonstration and planning simulation purposes only.
