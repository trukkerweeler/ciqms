# Creating a Trend Report Like carptopen13.html

## Overview

`carptopen13.html` is a 13-month trend report displaying open Corrective Actions with dual Y-axes:

- **Left axis**: Count of open items
- **Right axis**: Average age (in days)

This document explains the architecture so you can create similar reports efficiently.

---

## Architecture Components

### 1. **Frontend HTML** (`public/carptopen13.html`)

- Minimal page with a single canvas element for Chart.js
- Header/footer loaded dynamically via `loadHeaderFooter()`
- Uses Chart.js library (v4.4.0) for rendering

**Key structure:**

```html
<canvas id="openCAChart"></canvas>
```

### 2. **Frontend JavaScript** (`public/js/carptopen13.mjs`)

- Calls API endpoint: `/corrective/trend-open-13months`
- Parses response with structure: `{ labels[], counts[], aging[] }`
- Creates Chart.js instance with dual Y-axes configuration
- Error handling displays user-friendly messages

### 3. **Backend API Endpoint** (`routes/corrective.js`)

- Route: `GET /corrective/trend-open-13months`
- Generates 13-month date ranges (last day of each month)
- Executes UNION query to count open items per month
- Calculates average age using `DATEDIFF` from last day of month
- Returns JSON: `{ labels, counts, aging }`

---

## To Create a Similar Report

### Step 1: Choose Your Data Source

Decide what table and condition to query:

- **Example (Corrective)**: Count items where `CLOSED_DATE IS NULL OR CLOSED_DATE > LDOM`
- **For NCM**: Count items where `NCM_CLOSED IS NULL OR NCM_CLOSED > LDOM`
- **For Requests (DCR)**: Count items where `RESOLVED IS NULL OR RESOLVED > LDOM`

### Step 2: Define the Metric(s)

- **Primary metric**: What to count (e.g., "Open Corrective Actions")
- **Secondary metric** (optional): What to average or calculate (e.g., "Average Age (Days)")

### Step 3: Create Backend Endpoint

Location: `routes/[entity].js`

**Template:**

```javascript
router.get("/trend-open-13months", (req, res) => {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("❌ DB connection failed:", err.stack);
      return res.status(500).json({ error: "Database connection failed" });
    }

    try {
      // Generate last 13 months with date ranges
      const months = [];
      const now = new Date();

      for (let i = 12; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthName = monthStart.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        const monthStartStr = monthStart.toISOString().split("T")[0];
        const monthEndStr = monthEnd.toISOString().split("T")[0];
        const LDOM = monthEndStr;

        months.push({
          monthName,
          monthStart: monthStartStr,
          monthEnd: monthEndStr,
          LDOM,
        });
      }

      // Build UNION query for each month
      // CUSTOMIZE: Change table name, date field, and closed field
      const queries = months
        .map(
          (m) =>
            `SELECT '${m.monthName}' as month_name, COUNT(*) as count, 
             ROUND(COALESCE(AVG(DATEDIFF('${m.LDOM}', YOUR_DATE_FIELD)), 0), 0) as avg_age 
             FROM YOUR_TABLE 
             WHERE YOUR_DATE_FIELD <= '${m.LDOM}' 
             AND (YOUR_CLOSED_FIELD IS NULL OR YOUR_CLOSED_FIELD > '${m.LDOM}')`,
        )
        .join(" UNION ALL ");

      connection.query(queries, (err, rows) => {
        if (err) {
          console.error("❌ Query failed:", err);
          res.status(500).json({ error: "Query execution failed" });
        } else {
          const labels = rows.map((row) => row.month_name);
          const counts = rows.map((row) => row.count);
          const aging = rows.map((row) => row.avg_age || 0);
          res.json({ labels, counts, aging });
        }
        connection.end();
      });
    } catch (error) {
      console.error("❌ Error in trend endpoint:", error);
      res.status(500).json({ error: "Server error" });
      connection.end();
    }
  });
});
```

**Customize:**

- `YOUR_TABLE` → Database table name (e.g., `CORRECTIVE`, `NCM`, `REQUESTS`)
- `YOUR_DATE_FIELD` → Date field for opening (e.g., `CORRECTIVE_DATE`, `NCM_DATE`, `REQUEST_DATE`)
- `YOUR_CLOSED_FIELD` → Date field for closing (e.g., `CLOSED_DATE`, `NCM_CLOSED`, `RESOLVED`)

### Step 4: Create Frontend JavaScript Module

Location: `public/js/[reportname].mjs`

**Template:**

```javascript
import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

window.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  const chartCanvas = document.getElementById("chartId");

  try {
    const response = await fetch(`${apiUrl}/[entity]/trend-open-13months`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP ${response.status}: ${errorData.error || "Unknown error"}`,
      );
    }

    const data = await response.json();

    if (!data.labels || !data.counts) {
      throw new Error(`Invalid data format`);
    }

    // Customize chart appearance here
    new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "YOUR_METRIC_NAME",
            data: data.counts,
            borderColor: "#000000", // Change color as needed
            backgroundColor: "rgba(255, 107, 107, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "#000000",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            yAxisID: "y",
          },
          {
            label: "YOUR_SECONDARY_METRIC",
            data: data.aging,
            borderColor: "#ff6b35", // Change color as needed
            backgroundColor: "rgba(255, 107, 53, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "#ff6b35",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
          title: {
            display: false,
          },
        },
        scales: {
          y: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            title: {
              display: true,
              text: "YOUR_PRIMARY_AXIS_LABEL",
            },
          },
          y1: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            title: {
              display: true,
              text: "YOUR_SECONDARY_AXIS_LABEL",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
          x: {
            title: {
              display: true,
              text: "Month",
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Error loading trend data:", error);
    chartCanvas.parentElement.innerHTML = `<p style="color: red; padding: 20px; background: #fee; border: 1px solid #f99; border-radius: 4px;">Error loading trend data: ${error.message}</p>`;
  }
});
```

**Customize:**

- `${apiUrl}/[entity]/trend-open-13months` → Your endpoint path
- `#chartId` → Your canvas element ID
- `borderColor` and `backgroundColor` → Chart colors
- Axis labels and legend labels

### Step 5: Create Frontend HTML Page

Location: `public/[reportname].html`

**Template:**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="YOUR REPORT TITLE" />
    <meta name="author" content="CI QMS" />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Abel&family=Tapestry&display=swap"
    />
    <link rel="stylesheet" href="/css/styles.css" />
    <link rel="icon" href="images/ci-logo.png" />
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <title>YOUR REPORT TITLE</title>
  </head>
  <body>
    <header id="header"></header>
    <main id="main">
      <div class="recordsaddrecordheading">
        <h1>YOUR REPORT TITLE</h1>
      </div>

      <div
        style="
          margin-top: 20px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        "
      >
        <div style="position: relative; height: 400px">
          <canvas id="chartId"></canvas>
        </div>
        <p style="margin-top: 20px; color: #666; font-size: 0.9em">
          YOUR DESCRIPTION TEXT
        </p>
      </div>
    </main>
    <footer id="footer"></footer>
  </body>
  <script type="module" src="/js/[reportname].mjs"></script>
</html>
```

**Customize:**

- `YOUR REPORT TITLE` → Report name
- `YOUR DESCRIPTION TEXT` → Description of what the report shows
- `chartId` → Must match your canvas ID
- `[reportname]` → Your module filename

### Step 5a: Create a Separate CSS File (Optional but Recommended)

For better maintainability, move inline styles to a separate CSS file instead of using `style` attributes in the HTML.

**Create CSS file:**

Location: `public/css/[reportname].css`

```css
.chart-container {
  margin-top: 20px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.chart-wrapper {
  position: relative;
  height: 400px;
}

.chart-description {
  margin-top: 20px;
  color: #666;
  font-size: 0.9em;
}
```

**Link CSS in HTML:**

```html
<head>
  ...
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/[reportname].css" />
  ...
</head>
```

**Update HTML to use classes:**

```html
<div class="chart-container">
  <div class="chart-wrapper">
    <canvas id="chartId"></canvas>
  </div>
  <p class="chart-description">YOUR DESCRIPTION TEXT</p>
</div>
```

**Benefits:**

- Cleaner HTML markup
- Easier to modify styles
- Consistent with CIQMS architecture
- Allows for `@media print` rules for print-friendly layouts

### Step 6: Register Route (if needed)

Add to `server.js`:

```javascript
app.use("/[entity]", require("./routes/[entity]"));
```

---

## Quick Reference: Similar Reports in CIQMS

These follow the same pattern:

- **NCM Trend**: `public/ncmrptopen13.html` → `routes/ncm.js` + `public/js/ncmrptopen13.mjs`
- **DCR Trend**: `public/dcrrptopen13.html` → `routes/requests.js` + `public/js/dcrrptopen13.mjs`

---

## Testing Checklist

- [ ] Backend endpoint returns valid JSON with `labels`, `counts`, `aging` arrays
- [ ] Frontend module can be imported without errors
- [ ] Canvas element renders with data
- [ ] Both axes display correctly
- [ ] Error messages show if API fails
- [ ] Page loads header/footer correctly

---

## Database Query Pattern Explanation

```sql
SELECT '${m.monthName}' as month_name,
       COUNT(*) as count,
       ROUND(COALESCE(AVG(DATEDIFF('${m.LDOM}', YOUR_DATE_FIELD)), 0), 0) as avg_age
FROM YOUR_TABLE
WHERE YOUR_DATE_FIELD <= '${m.LDOM}'
  AND (YOUR_CLOSED_FIELD IS NULL OR YOUR_CLOSED_FIELD > '${m.LDOM}')
```

**Logic:**

1. `WHERE YOUR_DATE_FIELD <= '${m.LDOM}'` → Include items created by end of month
2. `AND (YOUR_CLOSED_FIELD IS NULL OR YOUR_CLOSED_FIELD > '${m.LDOM}')` → Item is still open at end of month (not closed yet)
3. `DATEDIFF('${m.LDOM}', YOUR_DATE_FIELD)` → Calculate days between creation and last day of month
4. `AVG(...)` → Average age of all open items that month
5. `COALESCE(..., 0)` → Default to 0 if no open items

---

## Color Scheme Reference

| Metric            | Border Color       | Background                               |
| ----------------- | ------------------ | ---------------------------------------- |
| Primary (Count)   | `#000000` (Black)  | `rgba(255, 107, 107, 0.1)` (Light Red)   |
| Secondary (Aging) | `#ff6b35` (Orange) | `rgba(255, 107, 53, 0.1)` (Light Orange) |

Customize as needed for your theme.
