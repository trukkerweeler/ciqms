# Supplier Performance Scorecard

## Overview

The **Supplier Performance Scorecard** provides two views of purchasing data drawn from the Global ERP database:

1. **Top 10 Suppliers** — ranked by a weighted score combining spend, PO volume, line count, and on-time delivery performance
2. **Supplier Delivery Trend** — quarterly on-time % chart for a single selected supplier

**Primary Database**: Global ERP (Pervasive SQL via ADODB / ODBC, accessed through VBScript)

> **Data source**: Both VBScripts UNION `V_POHIST_LINES` (received/closed PO lines) with `V_PO_LINES` (open PO lines) to give a complete picture of supplier activity for the period.

---

## Architecture

### Component Stack

```
User Browser (Supplier Scorecard Page)
        ↓
HTML Frontend (supplier-scorecard.html)
        ↓
ES6 Module (supplier-scorecard.mjs) — Period selection, fetch, render
        ↓
Express API Routes (routes/supplier-scorecard.js)
        ↓
VBScripts (SysWOW64 cscript.exe)
   ├── supplier-scorecard-top10.vbs   — Top 10 SQL query, returns JSON
   └── supplier-scorecard-trend.vbs   — All PO lines for a vendor, returns JSON
        ↓
Global ERP Database (Pervasive SQL / ODBC)
   ├── V_POHIST_LINES   — received / closed PO lines
   └── V_PO_LINES       — open PO lines (UNIONed with above)
```

---

## Files

| File                                  | Purpose                           |
| ------------------------------------- | --------------------------------- |
| `public/supplier-scorecard.html`      | Page shell, period toggle markup  |
| `public/js/supplier-scorecard.mjs`    | All client-side logic             |
| `public/css/supplier-scorecard.css`   | Page-specific styles              |
| `routes/supplier-scorecard.js`        | Express route handlers            |
| `routes/supplier-scorecard-top10.vbs` | Top 10 query (date-parameterised) |
| `routes/supplier-scorecard-trend.vbs` | Full PO history for one vendor    |

---

## Features

### Period Toggle

A radio button control above both sections lets the user switch between:

| Option                  | Label                  | Date Range                           |
| ----------------------- | ---------------------- | ------------------------------------ |
| `rolling12` _(default)_ | Rolling 12 Months      | 1st of month, 12 months ago → today  |
| `prev-cy`               | Previous Calendar Year | Jan 1 → Dec 31 of last calendar year |

The selection affects **both** the Top 10 table and the Trend chart simultaneously. Changing the period resets the vendor selection and reloads the top 10 table.

**Date calculation (client-side, `getPeriodDates()`):**

```javascript
// Rolling 12 — start = first of the month 12 months ago
const start = new Date(today.getFullYear(), today.getMonth() - 12, 1);

// Previous CY
const prevYear = today.getFullYear() - 1;
startDate = new Date(prevYear, 0, 1); // Jan 1
endDate = new Date(prevYear, 11, 31); // Dec 31
```

---

### Top 10 Suppliers Table

**Endpoint**: `GET /supplier-scorecard/top-suppliers?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

The VBScript UNIONs `V_POHIST_LINES` and `V_PO_LINES` filtered to the chosen date range, aggregates per vendor, and returns the top 50 by spend. The Express route then calculates weighted scores and returns the top 10.

**Excluded PART values** (non-material charges):
`FEE`, `FEE #2`, `SURCHARGE`, `INSPECT`, `CERTIFICATION`, `FREIGHT`, `EXPEDITE FEE`, `CC FEE`, `INSPECTION`, `MISSED PAYMENT`, `TAX`

**Weighted scoring formula** (calculated in `routes/supplier-scorecard.js`):

| Component   | Weight | Normalisation              |
| ----------- | ------ | -------------------------- |
| Total Spend | 70%    | `spend / maxSpend`         |
| Line Count  | 10%    | `lineCount / maxLineCount` |
| PO Count    | 5%     | `poCount / maxPoCount`     |
| On-Time %   | 15%    | `onTimePercent / 100`      |

`WEIGHTED_SCORE = spendScore + lineScore + poScore + onTimeScore`

Vendors are sorted descending by `WEIGHTED_SCORE`; top 10 are returned.

**Table columns**: Rank · Vendor Code · Vendor Name · Total Spend · PO Count · Line Count · On-Time % · Weighted Score

**Excluded vendors**: Certain vendor codes are excluded from the ranking entirely (filtered in SQL and never returned). The list is maintained in `EXCLUDED_VENDORS` in `routes/supplier-scorecard.js` and mirrored in the `WHERE src.VENDOR NOT IN (...)` clause of `supplier-scorecard-top10.vbs`. The page displays a note below the table listing the excluded codes, fetched from `GET /supplier-scorecard/excluded-vendors`.

---

### Supplier Delivery Trend Chart

**Endpoint**: `GET /supplier-scorecard/trend?vendor=XXXX`

The VBScript UNIONs `V_POHIST_LINES` and `V_PO_LINES` for the vendor with no date filter. Date filtering and aggregation are done entirely client-side.

**Client-side processing (`buildTrend`):**

1. Lines are pre-filtered to the selected period window **before** PO-level collapsing. This prevents a PO with any line outside the period from being excluded by its max due date.
2. Lines are then collapsed to PO level (latest due date and latest received date among in-period lines).
3. POs are bucketed by quarter (`YYYY-Qn`).
4. On-time = `receivedDate <= dueDate` (string comparison of ISO date strings).

**Chart type**: Line chart (Chart.js), dual Y-axes:

- Left: On-Time Delivery % (0–100)
- Right: PO Count

The vendor dropdown is populated from the Top 10 result, so only top-10 suppliers are selectable. Excluded vendors are blocked at the route level (returns `[]`) and cannot be queried even directly.

---

### Export All Charts (ZIP Download)

An **Export All Charts** button in the trend section iterates through all top-10 suppliers, fetches each vendor's trend data, renders a 1200×500 off-screen Chart.js canvas with animations disabled, and bundles the resulting PNGs into a ZIP file for download.

- **File naming**: `01_VENDORCODE_trend.png`, `02_VENDORCODE_trend.png`, … (rank-prefixed, sorted in scorecard order)
- **ZIP filename**: `supplier-trends_YYYY-MM-DD.zip`
- **Background**: white (applied via a Chart.js `beforeDraw` inline plugin using `destination-over` compositing)
- **Library**: [JSZip 3.10.1](https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js) loaded from CDN
- Vendors with no in-period data are skipped; errors per vendor are logged and skipped without aborting the batch

---

## API Reference

### GET `/supplier-scorecard/excluded-vendors`

No parameters. Returns the current `EXCLUDED_VENDORS` array as a JSON array of vendor code strings.

```json
["NACA01", "WEST2"]
```

### GET `/supplier-scorecard/top-suppliers`

| Parameter   | Type         | Required | Description                       |
| ----------- | ------------ | -------- | --------------------------------- |
| `startDate` | `YYYY-MM-DD` | ✅       | Period start (validated by regex) |
| `endDate`   | `YYYY-MM-DD` | ✅       | Period end (validated by regex)   |

**Response**: JSON array of up to 10 supplier objects, sorted by `WEIGHTED_SCORE` descending.

```json
[
  {
    "VENDOR": "GREYB",
    "NAME_VENDOR": "Grey Brothers Inc.",
    "TOTAL_SPEND": "284500.00",
    "PO_COUNT": "12",
    "LINE_COUNT": "47",
    "ON_TIME_PERCENT": "85.1",
    "WEIGHTED_SCORE": 0.812
  }
]
```

### GET `/supplier-scorecard/trend`

| Parameter | Type   | Required | Description               |
| --------- | ------ | -------- | ------------------------- |
| `vendor`  | string | ✅       | Vendor code (URL-encoded) |

**Response**: JSON array of raw PO line objects (all history, unfiltered by date).

```json
[
  {
    "po": "PO12345",
    "dueDate": "2025-09-30",
    "receivedDate": "2025-09-28",
    "vendor": "GREYB",
    "poType": "O",
    "part": "A1234-001"
  }
]
```

---

## VBScript Details

Both VBScripts follow the standard pattern: read credentials from `.env` (`GLOBAL_DSN`, `GLOBAL_UID`, `GLOBAL_PWD`), open an ADODB connection, run a query, write JSON to stdout.

### `supplier-scorecard-top10.vbs`

Accepts two command-line arguments:

- `Arguments(0)` — `startDate` (YYYY-MM-DD)
- `Arguments(1)` — `endDate` (YYYY-MM-DD)

SQL filter uses Pervasive SQL date syntax:

```sql
AND DATE_DUE_LINE >= CONVERT('2025-07-01', SQL_DATE)
AND DATE_DUE_LINE <= CONVERT('2026-07-13', SQL_DATE)
```

Returns up to 50 vendors sorted by total spend; the Express route further reduces to top 10 after scoring.

### `supplier-scorecard-trend.vbs`

Accepts one command-line argument:

- `Arguments(0)` — vendor code

Returns all rows for that vendor from both `V_POHIST_LINES` and `V_PO_LINES` (UNIONed, no date filter). Outputs camelCase JSON keys (`po`, `dueDate`, `receivedDate`, `vendor`, `poType`, `part`).

---

## Database View

### `V_POHIST_LINES` + `V_PO_LINES` (via UNION)

Both queries UNION the two views so that open orders (not yet received) are included alongside historical records. Key fields used:

| Field                | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `VENDOR`             | Vendor code                                                                 |
| `PURCHASE_ORDER`     | PO number                                                                   |
| `DATE_DUE_LINE`      | Line-level due date                                                         |
| `DATE_LAST_RECEIVED` | Most recent receipt date; empty/null for open POs                           |
| `EXTENSION`          | Line extended cost (ordered value for open POs, invoiced value for history) |
| `PO_TYPE`            | Order type; filtered to `'O'` (regular orders)                              |
| `PART`               | Part number                                                                 |

**Important**: `UNION` (not `UNION ALL`) is used to prevent duplicate lines in cases where a partially-received PO line appears in both views.

Open PO lines (no `DATE_LAST_RECEIVED`) count toward `LINE_COUNT` and `TOTAL_SPEND` but score 0 in the on-time calculation, accurately reflecting pending deliveries.

---

## Known Issues / Notes

- **Recent quarters may appear incomplete**: Open POs contribute spend and line counts but have no received date, so they count as 0% on-time until delivered. Quarter coverage should now be complete for any supplier with activity in `V_POHIST_LINES` or `V_PO_LINES`.
- **Vendor dropdown is limited to Top 10**: Only suppliers in the current period's top 10 can be selected for trend analysis. To view a trend for another supplier, the vendor would need to appear in the top 10 for that period.
- **Long load time**: The top 10 query can take 30–90 seconds as it scans both `V_POHIST_LINES` and `V_PO_LINES` across the full date range. A 120-second client-side timeout is in place.
