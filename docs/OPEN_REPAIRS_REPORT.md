# Open Repairs Report

**Report Template**: Professional, Read-Only Data Report
**Status**: Active | **Last Updated**: April 20, 2026

---

## Quick Reference

| Parameter           | Value                                |
| ------------------- | ------------------------------------ |
| **Report Name**     | Open Repairs Report                  |
| **URL**             | `/open-repairs.html`                 |
| **Base Table**      | `PEOPLE_INPUT`                       |
| **Filter 1**        | `PROJECT_ID = '8511'`                |
| **Filter 2**        | `INPUT_TYPE = 'REP'`                 |
| **Filter 3**        | `CLOSED = 'N'`                       |
| **Source Endpoint** | `GET /input/openrepairs`             |
| **Route File**      | `routes/input.js` (line ~924)        |
| **HTML File**       | `public/open-repairs.html`           |
| **JS Module**       | `public/js/open-repairs.mjs`         |
| **CSS File**        | `public/css/open-repairs-report.css` |
| **JSON Config**     | `public/json/reports.json`           |

---

## Template: Creating Similar Reports

To create a similar report for another project, follow this pattern:

### 1. Add Route (`routes/input.js` or new route file)

```javascript
router.get("/endpoint-name", (req, res) => {
  // ... connection code ...
  const query = `SELECT columns FROM TABLE WHERE conditions`;
  connection.query(query, (err, rows) => {
    if (err) res.sendStatus(500);
    else res.json(rows);
  });
});
```

### 2. Create HTML (`public/[report-name].html`)

```html
<link rel="stylesheet" href="/css/[report-name].css" />
<script type="module" src="/js/[report-name].mjs"></script>
```

### 3. Create JavaScript (`public/js/[report-name].mjs`)

- Load data from API endpoint
- Define columns array with labels and widths
- Implement `displayTable()`, `performSearch()`, `exportToCSV()`, `printReport()`

### 4. Create CSS (`public/css/[report-name].css`)

- Copy `open-repairs-report.css` and customize colors/spacing

### 5. Add to Reports Menu (`public/json/reports.json`)

```json
{
  "h2": "Report Title",
  "a": "Go to Report",
  "html": "report-name.html"
}
```

---

## Overview

The **Open Repairs Report** is a professional, read-only report that displays all active repair items (INPUT_TYPE = 'REP') for Project 8511 that have not yet been closed. It provides a quick overview of pending repairs with age tracking, due dates, and assignment information.

## Access

- **URL**: `/open-repairs.html`
- **Navigation**: Reports page → "Preventive Maintenance" card → "Open Repairs"
- **Availability**: All authenticated users

## Data Source

The report pulls data from:

- **Table**: `PEOPLE_INPUT` with `PROJECT_ID = '8511'`, `INPUT_TYPE = 'REP'`, and `CLOSED = 'N'`
- **Associated Text**: `PPL_INPT_TEXT` table for detailed repair descriptions
- **API Endpoint**: `GET /input/openrepairs`

## Report Features

### Search Functionality

- **Real-time search** across all repair records
- Search terms match against:
  - Repair ID
  - Subject
  - Assigned To (person)
  - Details/Description

### Print Support

- **Print button** for hard copy output
- Professional print formatting with proper colors
- Optimized for standard paper sizes

### CSV Export

- **Export button** to download all repair data
- Filename format: `open-repairs-YYYY-MM-DD.csv`
- Includes all columns for external analysis

### Timestamp

- Report shows generation time at the top
- Automatically updated on page load

## Columns

| Column          | Width | Description                                   |
| --------------- | ----- | --------------------------------------------- |
| **ID**          | 80px  | Repair item ID (7-digit format)               |
| **Date**        | 100px | Date the repair was created/reported          |
| **Age (Days)**  | 100px | Number of days since repair was entered       |
| **Subject**     | 80px  | Brief repair category (e.g., INOP, EQ, PM)    |
| **Assigned To** | 120px | Person responsible for the repair             |
| **Due Date**    | 100px | Target completion date with status indicators |
| **Details**     | 300px | Full repair description/notes                 |

## Color Coding

### Age Column

- **Red** (bold): Repairs older than **30 days** (needs urgent attention)
- **Orange** (bold): Repairs older than **14 days** (approaching concern threshold)
- **Normal**: Repairs less than 14 days old

### Due Date Column

- **Red** (⚠️ OVERDUE): Due date has passed
- **Orange** with days: Due within next 7 days (e.g., "3d")
- **Green**: On track (more than 7 days until due)

## Usage Examples

### Viewing All Open Repairs

1. Navigate to the Open Repairs Report
2. Table automatically loads with all active repairs
3. Repairs are sorted by repair date (oldest first)

### Finding Specific Repairs

1. Use the **Search** box at the top
2. Enter any part of:
   - The repair ID (e.g., "0000248")
   - The subject (e.g., "INOP")
   - The assigned person's name (e.g., "CHARRISON")
   - Part of the repair description (e.g., "Mist Buster")
3. Table filters in real-time

### Identifying Problem Repairs

1. Look for **red text in Age column** (30+ days old)
2. Look for **⚠️ OVERDUE** in Due Date column
3. These repairs need immediate attention

### Creating a Report

1. Click the **Print** button for on-screen print preview
2. Or click **Export** to download CSV for spreadsheet analysis

## Technical Details

### Route Handler

- **File**: `routes/input.js`
- **Route**: `GET /input/openrepairs`
- **Query**: Filters by PROJECT_ID='8511', INPUT_TYPE='REP', CLOSED='N'
- **Order**: Sorted by INPUT_DATE ascending (oldest first)

### Frontend Files

- **HTML**: `public/open-repairs.html`
- **JavaScript**: `public/js/open-repairs.mjs` (ES6 module)
- **CSS**: `public/css/open-repairs-report.css` (dedicated styling)

### Key Functions

#### `loadRepairsData()`

Fetches data from the API endpoint and populates the table.

#### `displayRepairsTable(data)`

Renders the table with all columns and formatting.

- Creates dynamic `th` headers with consistent styling
- Calculates age in days from INPUT_DATE
- Applies color coding based on age and due date
- Truncates long descriptions with hover tooltips

#### `performSearch()`

Filters table in real-time based on search input.

- Case-insensitive
- Searches across ID, Subject, Assigned To, and Details

#### `exportToCSV()`

Generates CSV file with proper escaping and formatting.

#### `printReport()`

Triggers browser print dialog with optimized formatting.

## Notes

- **Read-Only**: This is a report; no data modifications are available
- **Auto-Load**: Data loads automatically on page access
- **Responsive**: Works on desktop and tablet screens
- **Performance**: All filtering happens client-side (no page refreshes)
- **Timestamp**: Report regenerates fresh timestamp on each page load

## Related Reports

- Preventive Maintenance Report
- Open NCM Trend Report
- Open Corrective Action Report
- Open DCR Trend Report

## Maintenance

If you need to modify this report:

1. **Filter criteria**: Edit the SQL query in `routes/input.js` (line ~924)
2. **Column layout**: Modify the `columns` array in `open-repairs.mjs` (line ~100)
3. **Styling**: Update `open-repairs-report.css` for CSS changes
4. **Color thresholds**: Adjust age limits in `open-repairs.mjs` display function

---

**Last Updated**: April 20, 2026
**Status**: Active
