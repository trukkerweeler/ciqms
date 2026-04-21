# SYSDOC Issues Report

**Report Template**: Professional, Read-Only Data Report
**Status**: Active | **Last Updated**: April 21, 2026

---

## Quick Reference

| Parameter           | Value                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| **Report Name**     | SYSDOC Issues Report                                                                                  |
| **URL**             | `/sysdoc-issues.html`                                                                                 |
| **Base Table**      | `PEOPLE_INPUT`                                                                                        |
| **Filter 1**        | `SUBJECT like '%DOC%'`                                                                                |
| **Filter 2**        | `CLOSED_DATE >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 YEAR), '%Y-01-01') OR CLOSED_DATE IS NULL` |
| **Join 1**          | `PPL_INPT_TEXT` (request details)                                                                     |
| **Join 2**          | `PPL_INPT_RSPN` (response details)                                                                    |
| **Source Endpoint** | `GET /input/sysdocissues`                                                                             |
| **Route File**      | `routes/input.js` (new endpoint)                                                                      |
| **HTML File**       | `public/sysdoc-issues.html`                                                                           |
| **JS Module**       | `public/js/sysdoc-issues.mjs`                                                                         |
| **CSS File**        | `public/css/sysdoc-issues-report.css`                                                                 |
| **JSON Config**     | `public/json/reports.json`                                                                            |

---

## Overview

The **SYSDOC Issues Report** is a professional, read-only report that displays all System Document Management issues that were closed after January 1st of the previous year, as well as any currently open document management items (with no close date). It provides visibility into documentation and compliance action items to ensure system documentation is current and properly managed. Closed items do not display overdue status indicators even if the due date has passed.

## Access

- **URL**: `/sysdoc-issues.html`
- **Navigation**: Reports page → "Compliance & Documentation" card → "SYSDOC Issues"
- **Availability**: All authenticated users

## Data Source

The report pulls data from:

- **Table**: `PEOPLE_INPUT` with `SUBJECT like '%DOC%'` and `CLOSED_DATE >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 YEAR), '%Y-01-01') OR CLOSED_DATE IS NULL`
- **Request Details**: `PPL_INPT_TEXT` table for detailed document requirements
- **Response Details**: `PPL_INPT_RSPN` table for document responses and completions
- **API Endpoint**: `GET /input/sysdocissues`

## Report Features

### Search Functionality

- **Real-time search** across all SYSDOC records
- Search terms match against:
  - Issue ID
  - Subject
  - Assigned To (person)
  - Document Request (description)

### Print Support

- **Print button** for hard copy output
- Professional print formatting with proper colors
- Optimized for standard paper sizes

### CSV Export

- **Export button** to download all SYSDOC data
- Filename format: `sysdoc-issues-YYYY-MM-DD.csv`
- Includes all columns for external analysis

### Timestamp

- Report shows generation time at the top
- Automatically updated on page load

## Columns

| Column          | Width | Description                                    |
| --------------- | ----- | ---------------------------------------------- |
| **ID**          | 50px  | SYSDOC item ID (7-digit format)                |
| **Date**        | 70px  | Date the document request was created          |
| **Age (Days)**  | 70px  | Number of days since request was entered       |
| **Subject**     | 70px  | Document category/type                         |
| **Assigned To** | 90px  | Person responsible for documentation           |
| **Due Date**    | 70px  | Target completion date with status indicators  |
| **Closed Date** | 80px  | Date the item was closed (blank if still open) |
| **Request**     | 250px | Document request/requirement details           |

## Color Coding

### Age Column

- **Red** (bold): Items older than **60 days** (needs urgent attention)
- **Orange** (bold): Items older than **30 days** (approaching deadline)
- **Normal**: Items less than 30 days old

### Due Date Column

- **Red** (⚠️ OVERDUE): Due date has passed (only for open items)
- **Orange** with days: Due within next 7 days (only for open items, e.g., "3d")
- **Green**: On track (more than 7 days until due, open items only)
- **Gray**: Date shown without status indicators (item is closed/completed)

## SYSDOC Context

SYSDOC (System Document) items are documentation and compliance-related action items tracked within the quality management system. They may include:

- System documentation updates required
- Policy and procedure revisions
- Compliance documentation
- Record management and archival
- Document control and version management
- Quality system documentation maintenance

## Usage Examples

### Viewing All Current SYSDOC Issues

1. Navigate to the SYSDOC Issues Report
2. Table automatically loads with all SYSDOC issues closed in the previous year or currently open
3. Issues are sorted by closure date (most recent first), then by input date

### Finding Specific SYSDOC Issues

1. Use the **Search** box at the top
2. Enter any part of:
   - The SYSDOC ID (e.g., "0001245")
   - The subject (e.g., "DOC-POLICY")
   - The assigned person's name (e.g., "SMITH")
   - Part of the document requirement (e.g., "QMS")
3. Table filters in real-time

### Identifying Overdue SYSDOC Items

1. Look for **red text in Age column** (60+ days old)
2. Look for **⚠️ OVERDUE** in Due Date column (only shown for open items)
3. Note: Closed items do not display overdue status, even if the due date has passed
4. These open overdue items need immediate follow-up

### Creating a Report

1. Click the **Print** button for on-screen print preview
2. Or click **Export** to download CSV for spreadsheet analysis

## Technical Details

### Route Handler

- **File**: `routes/input.js`
- **Route**: `GET /input/sysdocissues`
- **Query**: Filters by SUBJECT like '%DOC%', CLOSED_DATE >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 YEAR), '%Y-01-01') OR CLOSED_DATE IS NULL
- **Joins**: PEOPLE_INPUT with PPL_INPT_TEXT and PPL_INPT_RSPN for complete data
- **Order**: Sorted by CLOSED_DATE DESC, then INPUT_DATE DESC

### Frontend Files

- **HTML**: `public/sysdoc-issues.html`
- **JavaScript**: `public/js/sysdoc-issues.mjs` (ES6 module)
- **CSS**: `public/css/sysdoc-issues-report.css` (dedicated styling with document management theme)

### Key Functions

#### `loadSYSDOCData()`

Fetches data from the API endpoint and populates the table.

#### `displaySYSDOCTable(data)`

Renders the table with all columns and formatting.

- Creates dynamic `th` headers with consistent styling
- Calculates age in days from INPUT_DATE
- Applies color coding based on age and due date (only for open items)
- Shows closed items without overdue status indicators
- Includes request text with wrapping for full visibility

#### `performSearch()`

Filters table in real-time based on search input.

- Case-insensitive
- Searches across ID, Subject, Assigned To, and Request

#### `exportToCSV()`

Generates CSV file with proper escaping and formatting for all columns including document request text and closed date.

#### `printReport()`

Triggers browser print dialog with optimized formatting for documentation.

## SQL Query

```sql
SELECT
  pi.*,
  rq.INPUT_TEXT,
  re.RESPONSE_TEXT
FROM PEOPLE_INPUT pi
LEFT JOIN PPL_INPT_TEXT rq ON pi.INPUT_ID = rq.INPUT_ID
LEFT JOIN PPL_INPT_RSPN re ON pi.INPUT_ID = re.INPUT_ID
WHERE pi.SUBJECT like '%DOC%'
  AND (pi.CLOSED_DATE >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 YEAR), '%Y-01-01') OR pi.CLOSED_DATE IS NULL)
ORDER BY pi.CLOSED_DATE DESC, pi.INPUT_DATE DESC;
```

## Notes

- **Read-Only**: This is a report; no data modifications are available
- **Previous Year Focus**: Report shows SYSDOC issues closed after Jan 1 of the previous year or currently open (no close date)
- **Auto-Load**: Data loads automatically on page access
- **Responsive**: Works on desktop and tablet screens
- **Performance**: All filtering happens client-side (no page refreshes)
- **Timestamp**: Report regenerates fresh timestamp on each page load
- **Dynamic Date Filter**: The date filter automatically adjusts based on the current date

## Related Reports

- [CTA Issues Report](CTA_ISSUES_REPORT.md)
- [Open Repairs Report](OPEN_REPAIRS_REPORT.md)
- [PM Program Issues Report](PM_PROGRAM_ISSUES_REPORT.md)
- Compliance Tracking Report
- Documentation Status Report

## Maintenance

If you need to modify this report:

1. Update the SQL query in `routes/input.js` endpoint `/input/sysdocissues` if filter criteria change
2. Update column definitions in `public/js/sysdoc-issues.mjs` if columns are added/removed
3. Update styling in `public/css/sysdoc-issues-report.css` for visual changes
4. Update this documentation file accordingly
5. Consider adding navigation links in the Reports page HTML to make the report easily discoverable
