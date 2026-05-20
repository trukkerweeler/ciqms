# ACert Workorder Lookup

## Overview

**ACert** (Aerospace Certificate Workorder Lookup) is a tool for querying and displaying processing traceability for manufactured workorders. It retrieves processing operations performed on work items and associates them with their completion dates and router information.

**Primary Database**: Global (via direct MySQL connection)

**Current Status**: ✅ Fully functional with stable database connections

---

## Architecture

### Component Stack

```
User Browser (ACert Query Page)
     ↓
HTML Frontend (acert.html)
     ↓
ES6 Module (acert.mjs) — Fetches data via API
     ↓
Express API Route (routes/acert.js) — Queries Global DB
     ↓
Global Database (MySQL) — ITEM_HISTORY, ROUTER_LINE, JOB_OPERATIONS, JOB_DETAIL tables
```

---

## Components

### 1. Frontend Page

**File**: [public/acert.html](../public/acert.html)

**Purpose**: Display the ACert workorder lookup interface.

**Key Elements**:

- Company branding (CI Aviation logo and contact info)
- Single form input for 6-digit base workorder number
- Loading spinner during data retrieval
- Results container for dynamic table rendering
- Pre-populated example value: `122353`

**Input Validation**:

- Accepts exactly 6 digits (pattern: `\d{6}`)
- Client-side validation before API call

---

### 2. Frontend Module

**File**: [public/js/acert.mjs](../public/js/acert.mjs)

**Purpose**: Handle form submission, API communication, and results rendering.

**Key Functions**:

#### Form Submission

```javascript
form.addEventListener("submit", async (e) => { ... })
```

- Validates 6-digit workorder format
- Shows loading spinner with elapsed time counter
- Executes sequential API calls for each process type
- Renders results as tables organized by process

#### Process Definition

The module queries six manufacturing processes with their associated operation codes:

| Process | Label          | Operation Codes    |
| ------- | -------------- | ------------------ |
| HEAT    | Heat Treatment | `6061`             |
| SWLD    | Spot Weld      | `D172`             |
| FWLD    | Fusion Weld    | `FUSION`, `D171`   |
| PASS    | Passivation    | `PASSM2`, `PASST6` |
| CHEM    | Chemical       | `FT1C1A`           |
| PAINT   | Paint          | `23377A`, `PAINT2` |

#### Results Rendering

For each process with matching data:

1. Creates an `<h3>` heading with process label
2. Builds table with columns:
   - **#**: Row index
   - **Router**: Router identifier (first word of ROUTER field)
   - **Operation**: Operation code
   - **Description**: Operation description
   - **Traceability**: Date (YYMMDD format) + Job-Suffix reference

#### Traceability Format

Combines completion date and job reference:

- **Date**: Formatted as YYMMDD from `DATE_COMPLETED`
- **Reference**: `(JOB-SUFFIX)` pair, e.g., `(122353-001)`
- **Example**: `260514 (122353-001)` = May 14, 2026, Job 122353, Suffix 001

#### Error Handling

- Network errors: Displays error message to user
- Missing processes: Silently skips (no data to display)
- Success: Displays elapsed query time (up to 1.5 seconds)

---

### 3. Express Route Handler

**File**: [routes/acert.js](../routes/acert.js)

**Database**: Global (MySQL)

**Connection Pattern**:

```javascript
function getDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "global",
    multipleStatements: true,
  });
}

function getQualityDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}
```

#### Endpoints

##### **POST /acert/process**

**Purpose**: Query processing operations for a workorder by operation codes.

**Request Body**:

```json
{
  "baseWorkorder": "122353",
  "operationCodes": ["6061"]
}
```

**Query Logic**:

```sql
SELECT DISTINCT
    rl.ROUTER,
    jo.JOB,
    jo.SUFFIX,
    jd.REFERENCE,
    jo.DATE_COMPLETED,
    rl.OPERATION,
    jo.DESCRIPTION
FROM ITEM_HISTORY ih
JOIN ROUTER_LINE rl ON rl.ROUTER = ih.PART
JOIN JOB_OPERATIONS jo ON CAST(jo.ROUTER_SEQ AS UNSIGNED)
                           BETWEEN CAST(rl.LINE_ROUTER AS UNSIGNED)
                               AND CAST(rl.LINE_ROUTER AS UNSIGNED) + 99
JOIN JOB_DETAIL jd ON jd.JOB = jo.JOB
                  AND jd.SUFFIX = jo.SUFFIX
                  AND jd.SEQ = jo.SEQ
WHERE ih.JOB = [baseWorkorder]
  AND ih.SERIAL_NUMBER LIKE '______-___'
  AND jo.JOB = CAST(SUBSTRING(ih.SERIAL_NUMBER, 1, 6) AS UNSIGNED)
  AND jo.SUFFIX = CAST(SUBSTRING(ih.SERIAL_NUMBER, 8, 3) AS UNSIGNED)
  AND rl.OPERATION IN ([operationCodes])
  AND jd.REFERENCE IS NOT NULL
```

**Key Filters**:

- Restricts to valid serial number format: `XXXXXX-XXX` (6-3 digits)
- Extracts job and suffix from serial number
- Requires non-null reference for traceability
- Joins router line and job operation data

**Response**:

```json
[
  {
    "ROUTER": "PART_ID",
    "JOB": 122353,
    "SUFFIX": 1,
    "REFERENCE": "REF_001",
    "DATE_COMPLETED": "2026-05-14T00:00:00.000Z",
    "OPERATION": "6061",
    "DESCRIPTION": "Heat treatment operation"
  },
  ...
]
```

**Error Handling**:

- 400: Missing or invalid `baseWorkorder` or `operationCodes`
- 500: MySQL query error

---

##### **GET /acert/lineage/:job**

**Purpose**: Retrieve all distinct serial numbers in the lineage for a given job (excluding HW products).

**Parameters**:

- `:job` - Base job number (6 digits)

**Query Logic**:
Uses recursive CTE to trace item lineage:

1. Base query: Find all items for the given job (excluding PRODUCT_LINE = 'HW')
2. Recursive union: Follow parent-child relationships via SERIAL_NUMBER matches
3. Final filter: Return only items matching format `XXXXXX-XXX`

**Response**:

```json
[
  { "SERIAL_NUMBER": "122353-001" },
  { "SERIAL_NUMBER": "122353-002" },
  ...
]
```

---

##### **GET /acert/temp-data/:iid**

**Purpose**: Retrieve temperature data (percent and Fahrenheit values) for a specific input ID.

**Database**: Quality (uses separate quality database connection)

**Parameters**:

- `:iid` - Input ID for the temperature record

**Query Logic**:

```sql
SELECT UNIT, VALUE FROM EIGHTYFIVETWELVE WHERE INPUT_ID = '[iid]'
```

**Response Transform**:

```json
{
  "percent": 75.5,
  "fahrenheit": 350.0
}
```

**Response Mapping**:

- **Percent**: Values where UNIT = "Percent"
- **Fahrenheit**: Values where UNIT = "Fahrenheit" or "F"

**Error Handling**:

- 500: Database connection or query error

---

## Database Tables Used

### Global Database

| Table            | Purpose                      | Key Fields                                                      |
| ---------------- | ---------------------------- | --------------------------------------------------------------- |
| `ITEM_HISTORY`   | Tracks item history for jobs | JOB, SERIAL_NUMBER, PART                                        |
| `ROUTER_LINE`    | Router operation mappings    | ROUTER, OPERATION, LINE_ROUTER, PART                            |
| `JOB_OPERATIONS` | Job operation records        | JOB, SUFFIX, ROUTER_SEQ, OPERATION, DATE_COMPLETED, DESCRIPTION |
| `JOB_DETAIL`     | Job detail with references   | JOB, SUFFIX, SEQ, REFERENCE                                     |
| `INVENTORY_MSTR` | Inventory master             | PART, PRODUCT_LINE                                              |

### Quality Database

| Table              | Purpose          | Key Fields            |
| ------------------ | ---------------- | --------------------- |
| `EIGHTYFIVETWELVE` | Temperature data | INPUT_ID, UNIT, VALUE |

---

## Usage Flow

### 1. User Interaction

```
User enters workorder: 122353
      ↓
Click "Query" button
      ↓
Form validation (6 digits)
      ↓
Show loading spinner
```

### 2. API Queries

```
For each process (HEAT, SWLD, FWLD, PASS, CHEM, PAINT):
  POST /acert/process with operation codes
  ↓
  Receives operation records
  ↓
  Render table if data exists
```

### 3. Results Display

```
Heat Treatment (if exists)
  | # | Router | Operation | Description | Traceability |
  | 1 | R-001  | 6061      | Heat Op     | 260514 (122353-001) |

Spot Weld (if exists)
  | # | Router | Operation | Description | Traceability |
  | 1 | R-002  | D172      | Spot Op     | 260514 (122353-001) |

[etc for other processes]
```

---

## Configuration & Customization

### Process Operation Codes

Operation codes are defined in `public/js/acert.mjs` and can be edited:

```javascript
const processes = [
  {
    name: "HEAT",
    label: "Heat Treatment",
    operationCodes: ["6061"], // ← EDIT HERE
  },
  // ... other processes
];
```

**To Add a New Process**:

1. Add entry to `processes` array
2. Define `name`, `label`, and `operationCodes`
3. Table will automatically render if data exists

### Date Format

Traceability dates use **YYMMDD** format (e.g., `260514` for May 14, 2026). To change:

Edit in `public/js/acert.mjs`:

```javascript
const yy = String(d.getFullYear()).slice(-2); // YY
const mm = String(d.getMonth() + 1).padStart(2, "0"); // MM
const dd = String(d.getDate()).padStart(2, "0"); // DD
trace = `${yy}${mm}${dd}`; // ← Adjust format here
```

---

## Styling

**CSS File**: `public/css/styles.css` (shared across all pages)

**Key Classes/Styles Used**:

- `.loading-spinner` - Loading indicator container
- `.spinner` - Animated spinner animation
- Table styling - Standard HTML table with 900px width
- Header styling - Company branding section with logo and contact info

---

## Performance Considerations

### Query Optimization

- **Indexes**: Relies on indexes on `ITEM_HISTORY.JOB`, `ROUTER_LINE.OPERATION`, `JOB_OPERATIONS.JOB`, `JOB_DETAIL.JOB`
- **Serial Number Filter**: Client-side filtering with LIKE pattern reduces result set
- **Distinct**: Uses DISTINCT to eliminate duplicates

### Frontend

- Sequential process queries (not parallel) - maintains order for presentation
- Client-side error handling suppresses non-critical errors
- Loading spinner disappears after 1.5 seconds (regardless of async completion)

### Typical Query Time

- 6 processes × ~200-400ms per query = **1.2-2.4 seconds total**

---

## Common Issues & Troubleshooting

### No Results Displayed

**Cause**: Workorder not in ITEM_HISTORY or no matching operations
**Solution**: Verify workorder exists in Global database

### Query Timeout

**Cause**: Database connection issue or large result set
**Solution**: Check database connectivity; verify indexes exist on ITEM_HISTORY.JOB

### Temperature Data Not Found

**Cause**: INPUT_ID doesn't exist in EIGHTYFIVETWELVE table
**Solution**: Verify quality database has temperature records for the item

---

## Related Pages

- [GLOBAL_DATABASE_PAGES.md](GLOBAL_DATABASE_PAGES.md) - General database connection patterns
- [Cert.html](../public/cert.html) - Certificate management (related module)
- [ACert.html](../public/acert.html) - Main page

---

## Development Notes

- **Comment in code**: Header marked as "routes/xcert.js" but actually routes/acert.js — update file header if modified
- **Quality DB fallback**: Temperature endpoint has separate quality database connection
- **Error suppression**: Process query errors are silently caught (commented out error display in code)

---

## Future Enhancements

- Add export functionality (CSV/PDF)
- Add filters by date range
- Add multiple workorder batch queries
- Add temperature data display inline
- Add lineage visualization
