# PM Program Issues Report

**Report Template**: Professional, Read-Only Data Report
**Status**: Active | **Last Updated**: April 20, 2026

---

## Quick Reference

| Parameter           | Value                                     |
| ------------------- | ----------------------------------------- |
| **Report Name**     | PM Program Issues Report                  |
| **URL**             | `/pm-program-issues.html`                 |
| **Base Table**      | `PEOPLE_INPUT`                            |
| **Filter 1**        | `PROJECT_ID = '8511'`                     |
| **Filter 2**        | `INPUT_TYPE != 'REP'`                     |
| **Filter 3**        | `CLOSED = 'N'`                            |
| **Source Endpoint** | `GET /input/pmprogramissues`              |
| **Route File**      | `routes/input.js` (line ~978)             |
| **HTML File**       | `public/pm-program-issues.html`           |
| **JS Module**       | `public/js/pm-program-issues.mjs`         |
| **CSS File**        | `public/css/pm-program-issues-report.css` |
| **JSON Config**     | `public/json/reports.json`                |

---

## Overview

The **PM Program Issues Report** is a professional, read-only report that displays all open program issues, opportunities for improvement, and other non-repair items (INPUT_TYPE != 'REP') for Project 8511 that have not yet been closed. It provides visibility into the broader program health beyond repairs.

## Access

- **URL**: `/pm-program-issues.html`
- **Navigation**: Reports page → "Preventive Maintenance" card → "PM Program Issues"
- **Availability**: All authenticated users

## Data Source

The report pulls data from:

- **Table**: `PEOPLE_INPUT` with `PROJECT_ID = '8511'`, `INPUT_TYPE != 'REP'`, and `CLOSED = 'N'`
- **Associated Text**: `PPL_INPT_TEXT` table for detailed issue descriptions
- **API Endpoint**: `GET /input/pmprogramissues`

## Report Features

### Search Functionality

- **Real-time search** across all issue records
- Search terms match against:
  - Issue ID
  - Subject
  - Assigned To (person)
  - Details/Description

### Print Support

- **Print button** for hard copy output
- Professional print formatting with proper colors
- Optimized for standard paper sizes

### CSV Export

- **Export button** to download all issue data
- Filename format: `pm-program-issues-YYYY-MM-DD.csv`
- Includes all columns for external analysis

### Timestamp

- Report shows generation time at the top
- Automatically updated on page load

## Columns

| Column          | Width | Description                                   |
| --------------- | ----- | --------------------------------------------- |
| **ID**          | 80px  | Issue item ID (7-digit format)                |
| **Date**        | 100px | Date the issue was created/reported           |
| **Age (Days)**  | 100px | Number of days since issue was entered        |
| **Subject**     | 80px  | Issue category (e.g., OFI, RISK, CONCERN)     |
| **Assigned To** | 120px | Person responsible for the issue              |
| **Due Date**    | 100px | Target resolution date with status indicators |
| **Details**     | 300px | Full issue description/notes                  |

## Color Coding

### Age Column

- **Red** (bold): Issues older than **30 days** (needs urgent attention)
- **Orange** (bold): Issues older than **14 days** (approaching concern threshold)
- **Normal**: Issues less than 14 days old

### Due Date Column

- **Red** (⚠️ OVERDUE): Due date has passed
- **Orange** with days: Due within next 7 days (e.g., "3d")
- **Green**: On track (more than 7 days until due)

## Difference from Open Repairs Report

| Aspect           | Open Repairs         | PM Program Issues             |
| ---------------- | -------------------- | ----------------------------- |
| **Filter**       | INPUT_TYPE = 'REP'   | INPUT_TYPE != 'REP'           |
| **Content**      | Repair-focused items | Issues, OFIs, risks, concerns |
| **Header Color** | Blue (#2c3e50)       | Green (#27681d)               |
| **Use Case**     | Equipment repairs    | Program management issues     |

## Usage Examples

### Viewing All Open Issues

1. Navigate to the PM Program Issues Report
2. Table automatically loads with all active issues
3. Issues are sorted by issue date (oldest first)

### Finding Specific Issues

1. Use the **Search** box at the top
2. Enter any part of:
   - The issue ID (e.g., "0000248")
   - The subject (e.g., "OFI")
   - The assigned person's name (e.g., "SMITH")
   - Part of the issue description (e.g., "compliance")
3. Table filters in real-time

### Identifying Problem Issues

1. Look for **red text in Age column** (30+ days old)
2. Look for **⚠️ OVERDUE** in Due Date column
3. These issues need immediate attention

### Creating a Report

1. Click the **Print** button for on-screen print preview
2. Or click **Export** to download CSV for spreadsheet analysis

## Technical Details

### Route Handler

- **File**: `routes/input.js`
- **Route**: `GET /input/pmprogramissues`
- **Query**: Filters by PROJECT_ID='8511', INPUT_TYPE!='REP', CLOSED='N'
- **Order**: Sorted by INPUT_DATE ascending (oldest first)

### Frontend Files

- **HTML**: `public/pm-program-issues.html`
- **JavaScript**: `public/js/pm-program-issues.mjs` (ES6 module)
- **CSS**: `public/css/pm-program-issues-report.css` (dedicated styling with green theme)

### Key Functions

#### `loadIssuesData()`

Fetches data from the API endpoint and populates the table.

#### `displayIssuesTable(data)`

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
- **Green Theme**: Uses green color scheme to distinguish from blue Repairs report
- **Auto-Load**: Data loads automatically on page access
- **Responsive**: Works on desktop and tablet screens
- **Performance**: All filtering happens client-side (no page refreshes)
- **Timestamp**: Report regenerates fresh timestamp on each page load

## Related Reports

- [Open Repairs Report](OPEN_REPAIRS_REPORT.md)
- Preventive Maintenance Report
- Open NCM Trend Report
- Open Corrective Action Report

## Maintenance

If you need to modify this report:

1. **Filter criteria**: Edit the SQL query in `routes/input.js` (line ~978)
2. **Column layout**: Modify the `columns` array in `pm-program-issues.mjs` (line ~95)
3. **Styling**: Update `pm-program-issues-report.css` for CSS changes
4. **Color thresholds**: Adjust age limits in `pm-program-issues.mjs` display function
5. **Theme color**: Change `--primary-color` and `--accent-color` in CSS for different appearance

---

**Last Updated**: April 20, 2026
**Status**: Active
**Template Reference**: [OPEN_REPAIRS_REPORT.md](OPEN_REPAIRS_REPORT.md)
