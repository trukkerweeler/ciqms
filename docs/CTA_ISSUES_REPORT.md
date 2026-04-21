# CTA Issues Report

**Report Template**: Professional, Read-Only Data Report
**Status**: Active | **Last Updated**: April 21, 2026

---

## Quick Reference

| Parameter           | Value                                            |
| ------------------- | ------------------------------------------------ |
| **Report Name**     | CTA Issues Report                                |
| **URL**             | `/cta-issues.html`                               |
| **Base Table**      | `PEOPLE_INPUT`                                   |
| **Filter 1**        | `SUBJECT like '%CTA%'`                           |
| **Filter 2**        | `CLOSED_DATE YEAR = 2025 OR CLOSED_DATE IS NULL` |
| **Join 1**          | `PPL_INPT_TEXT` (request details)                |
| **Join 2**          | `PPL_INPT_RSPN` (response details)               |
| **Source Endpoint** | `GET /input/ctaissues`                           |
| **Route File**      | `routes/input.js` (new endpoint)                 |
| **HTML File**       | `public/cta-issues.html`                         |
| **JS Module**       | `public/js/cta-issues.mjs`                       |
| **CSS File**        | `public/css/cta-issues-report.css`               |
| **JSON Config**     | `public/json/reports.json`                       |

---

## Overview

The **CTA Issues Report** is a professional, read-only report that displays all Corrective Training Action (CTA) issues that were closed in 2025 as well as any currently open CTAs (with no close date). It provides visibility into training-related action items and requests to ensure competency and compliance tracking. Closed CTAs do not display overdue status indicators even if the due date has passed.

## Access

- **URL**: `/cta-issues.html`
- **Navigation**: Reports page → "Competency & Training" card → "CTA Issues"
- **Availability**: All authenticated users

## Data Source

The report pulls data from:

- **Table**: `PEOPLE_INPUT` with `SUBJECT like '%CTA%'` and `CLOSED_DATE YEAR = 2025 OR CLOSED_DATE IS NULL`
- **Request Details**: `PPL_INPT_TEXT` table for detailed training requests
- **Response Details**: `PPL_INPT_RSPN` table for training responses and completions
- **API Endpoint**: `GET /input/ctaissues`

## Report Features

### Search Functionality

- **Real-time search** across all CTA records
- Search terms match against:
  - Issue ID
  - Subject
  - Assigned To (person)
  - Training Request (description)

### Print Support

- **Print button** for hard copy output
- Professional print formatting with proper colors
- Optimized for standard paper sizes

### CSV Export

- **Export button** to download all CTA data
- Filename format: `cta-issues-YYYY-MM-DD.csv`
- Includes all columns for external analysis

### Timestamp

- Report shows generation time at the top
- Automatically updated on page load

## Columns

| Column          | Width | Description                                   |
| --------------- | ----- | --------------------------------------------- |
| **ID**          | 80px  | CTA item ID (7-digit format)                  |
| **Date**        | 100px | Date the CTA was created/reported             |
| **Age (Days)**  | 100px | Number of days since CTA was entered          |
| **Subject**     | 80px  | CTA category/type                             |
| **Assigned To** | 120px | Person responsible for the training action    |
| **Due Date**    | 100px | Target completion date with status indicators |
| **Request**     | 250px | Training request/requirement details          |
| **Closed Date** | 100px | Date the CTA was closed (blank if still open) |

## Color Coding

### Age Column

- **Red** (bold): CTAs older than **60 days** (needs urgent attention)
- **Orange** (bold): CTAs older than **30 days** (approaching deadline)
- **Normal**: CTAs less than 30 days old

### Due Date Column

- **Red** (⚠️ OVERDUE): Due date has passed (only for open CTAs)
- **Orange** with days: Due within next 7 days (only for open CTAs, e.g., "3d")
- **Green**: On track (more than 7 days until due, open CTAs only)
- **Gray**: Date shown without status indicators (CTA is closed/completed)

## CTA Context

CTAs (Corrective Training Actions) are training-related action items tracked within the quality management system. They may include:

- Competency verification requirements
- Training certifications needed
- Skill assessments or reassessments
- Compliance training obligations
- Job-specific training updates

## Usage Examples

### Viewing All 2025 CTAs

1. Navigate to the CTA Issues Report
2. Table automatically loads with all CTA issues closed in 2025 or currently open
3. Issues are sorted by completion/closure date (oldest first)

### Finding Specific CTAs

1. Use the **Search** box at the top
2. Enter any part of:
   - The CTA ID (e.g., "0001245")
   - The subject (e.g., "CTA-CERT")
   - The assigned person's name (e.g., "JOHNSON")
   - Part of the training request (e.g., "FAA")
3. Table filters in real-time

### Identifying Overdue CTAs

1. Look for **red text in Age column** (60+ days old)
2. Look for **⚠️ OVERDUE** in Due Date column (only shown for open CTAs)
3. Note: Closed CTAs do not display overdue status, even if the due date has passed
4. These open overdue CTAs need immediate follow-up

### Creating a Report

1. Click the **Print** button for on-screen print preview
2. Or click **Export** to download CSV for spreadsheet analysis

## Technical Details

### Route Handler

- **File**: `routes/input.js`
- **Route**: `GET /input/ctaissues`
- **Query**: Filters by SUBJECT like '%CTA%', CLOSED_DATE YEAR = 2025 OR CLOSED_DATE IS NULL
- **Joins**: PEOPLE_INPUT with PPL_INPT_TEXT and PPL_INPT_RSPN for complete data
- **Order**: Sorted by CLOSED_DATE, then SUBJECT

### Frontend Files

- **HTML**: `public/cta-issues.html`
- **JavaScript**: `public/js/cta-issues.mjs` (ES6 module)
- **CSS**: `public/css/cta-issues-report.css` (dedicated styling with purple/training theme)

### Key Functions

#### `loadCTAData()`

Fetches data from the API endpoint and populates the table.

#### `displayCTATable(data)`

Renders the table with all columns and formatting.

- Creates dynamic `th` headers with consistent styling
- Calculates age in days from INPUT_DATE
- Applies color coding based on age and due date (only for open CTAs)
- Shows closed CTAs without overdue status indicators
- Includes request text with wrapping for full visibility

#### `performSearch()`

Filters table in real-time based on search input.

- Case-insensitive
- Searches across ID, Subject, Assigned To, and Request

#### `exportToCSV()`

Generates CSV file with proper escaping and formatting for all columns including training request text and closed date.

#### `printReport()`

Triggers browser print dialog with optimized formatting for training documentation.

## SQL Query

```sql
SELECT
  pi.*,
  rq.INPUT_TEXT,
  re.RESPONSE_TEXT
FROM PEOPLE_INPUT pi
LEFT JOIN PPL_INPT_TEXT rq ON pi.INPUT_ID = rq.INPUT_ID
LEFT JOIN PPL_INPT_RSPN re ON pi.INPUT_ID = re.INPUT_ID
WHERE pi.SUBJECT like '%CTA%'
  AND (YEAR(pi.CLOSED_DATE) = 2025 OR pi.CLOSED_DATE IS NULL)
ORDER BY pi.CLOSED_DATE, pi.SUBJECT;
```

## Notes

- **Read-Only**: This is a report; no data modifications are available
- **2025 Focus**: Report shows CTAs closed in 2025 or currently open (no close date)
- **Auto-Load**: Data loads automatically on page access
- **Responsive**: Works on desktop and tablet screens
- **Performance**: All filtering happens client-side (no page refreshes)
- **Timestamp**: Report regenerates fresh timestamp on each page load

## Related Reports

- [Open Repairs Report](OPEN_REPAIRS_REPORT.md)
- [PM Program Issues Report](PM_PROGRAM_ISSUES_REPORT.md)
- Competency Tracking Report
- Certification Expiry Report

## Maintenance

If you need to modify this report:

1. Update the SQL query in `routes/input.js` endpoint `/input/ctaissues` if filter criteria change
2. Update column definitions in `public/cta-issues.mjs` if columns are added/removed
3. Update styling in `public/css/cta-issues-report.css` for visual changes
4. Update this documentation file accordingly
