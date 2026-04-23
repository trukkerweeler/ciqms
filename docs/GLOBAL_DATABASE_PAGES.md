# Global Database Integration Pattern

## Pages Connecting to Live Database via 32-bit VBScript

This document describes the architecture and pattern for creating pages that connect to the Global (live) database through 32-bit ODBC connections using VBScript.

### Architecture Overview

```
User Browser (Frontend)
     ↓
HTML Page (.html)
     ↓
ES6 Module (.mjs) — fetches data
     ↓
Express API Route (.js) — spawns VBScript
     ↓
32-bit VBScript (.vbs) — connects to Global DB
     ↓
Global Database (ODBC DSN)
```

---

## Component Structure

### 1. Frontend Page (HTML)

**Location**: `public/[name].html`

**Purpose**: Display UI container and load the ES6 module.

**Key Requirements**:

- Include separate stylesheet: `<link rel="stylesheet" href="/css/[name].css" />`
- Create container div: `<div id="[containerName]"></div>`
- Load module: `<script type="module" src="/js/[name].mjs"></script>`
- Use semantic class names for layout (e.g., `recordsaddrecordheading`, `table-container`)

**Example Structure**:

```html
<body>
  <header id="header"></header>
  <main id="main">
    <div class="recordsaddrecordheading">
      <h1>[Page Title]</h1>
    </div>
    <div id="[containerName]"></div>
  </main>
  <footer id="footer"></footer>
  <script type="module" src="/js/[name].mjs"></script>
</body>
```

---

### 2. Frontend Module (ES6 .mjs)

**Location**: `public/js/[name].mjs`

**Purpose**: Fetch data from API endpoint and render the page.

**Key Functions**:

- Import utilities: `loadHeaderFooter`, `getApiUrl`
- Call `loadHeaderFooter()` immediately
- Fetch from API: `${apiUrl}/[endpoint]`
- Handle errors gracefully
- Render data using DOM manipulation or templating

**Responsibilities**:

- Make API calls
- Process response data
- Render UI components
- Show user-friendly error messages
- Handle no-data scenarios

**Pattern**:

```javascript
import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

const apiUrl = await getApiUrl();
const url = `${apiUrl}/[endpoint]`;

async function fetchData() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();
    if (data.error) {
      showError(data.error);
      return;
    }

    renderTable(data);
  } catch (error) {
    console.error("Error:", error);
    showError("Failed to load data");
  }
}

function renderTable(data) {
  // Create and populate table/elements
}

// Load on page load
window.addEventListener("DOMContentLoaded", fetchData);
```

---

### 3. Express Route Handler (Node.js)

**Location**: `routes/[name].js`

**Purpose**: Bridge between frontend and VBScript; spawn and manage VBScript execution.

**Key Responsibilities**:

1. Define API endpoint: `router.get("/")`
2. Specify VBScript path
3. Use 32-bit cscript.exe from `SysWOW64` (important for ODBC!)
4. Spawn VBScript as child process
5. Collect stdout/stderr
6. Sanitize output (remove control characters)
7. Parse and return JSON

**Critical Details**:

- **32-bit cscript**: Required for 32-bit ODBC drivers
  ```javascript
  const cscriptPath = path.join(
    process.env.SYSTEMROOT,
    "SysWOW64",
    "cscript.exe",
  );
  ```
- **Spawn flags**: `//Nologo` suppresses script header
- **Output sanitization**: Remove control characters before JSON parsing
  ```javascript
  const sanitized = output.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  ```
- **Error handling**: Check exit code and stderr

**Pattern**:

```javascript
const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => {
  const vbsFilePath = path.join(__dirname, "[name].vbs");
  const cscriptPath = path.join(
    process.env.SYSTEMROOT,
    "SysWOW64",
    "cscript.exe",
  );

  const child = spawn(cscriptPath, ["//Nologo", vbsFilePath]);

  let output = "";
  let errorOutput = "";

  child.stdout.on("data", (data) => {
    output += data.toString();
  });

  child.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  child.on("close", (code) => {
    if (code !== 0 || errorOutput) {
      console.error(`VBScript failed (code=${code}): ${errorOutput}`);
      return res.status(500).json({ error: "Error retrieving data" });
    }

    try {
      const sanitized = output.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      const data = JSON.parse(sanitized);
      res.json(data);
    } catch (err) {
      console.error("JSON parse error:", err);
      res.status(500).json({ error: "Invalid response format" });
    }
  });
});

module.exports = router;
```

**Registration in server.js**:

```javascript
const [name]Routes = require("./routes/[name]");
app.use("/[endpoint]", [name]Routes);
```

---

### 4. VBScript (32-bit Database Connector)

**Location**: `routes/[name].vbs`

**Purpose**: Execute database queries directly against Global database via ODBC DSN.

**Key Characteristics**:

- Runs in 32-bit context (spawned by 32-bit cscript.exe)
- Reads credentials from `.env` file
- Connects via ADODB
- Returns JSON output to stdout

**Required Environment Variables** (in `.env`):

```env
GLOBAL_DSN=[DSN_Name]
GLOBAL_UID=[Username]
GLOBAL_PWD=[Password]
```

**VBScript Structure**:

1. Load `.env` file
2. Extract credentials
3. Create ADODB connection
4. Execute SQL query
5. Convert recordset to JSON
6. Write JSON to stdout

**Key Functions**:

- `ReadEnvFile()`: Parse `.env` for credentials
- `ConnectToDatabase()`: Establish ADODB connection
- `RecordsetToJSON()`: Convert ADO recordset to JSON string

**Important Patterns**:

_Error Handling_:

```vbscript
On Error Resume Next
' ... code ...
If Err.Number <> 0 Then
    WScript.StdOut.Write "{""error"":""" & Err.Description & """}"
    Err.Clear
    WScript.Quit
End If
On Error GoTo 0  ' Turn off error suppression
```

_JSON Output_:

```vbscript
Function RecordsetToJSON(rs)
    Dim json
    json = "["
    Do Until rs.EOF
        ' Build record object
        ' ...
        rs.MoveNext
    Loop
    json = json & "]"
    RecordsetToJSON = json
End Function
```

_Stdout Output_:

```vbscript
WScript.StdOut.Write json  ' Must write to stdout, not echo
```

---

### 5. Stylesheet (CSS)

**Location**: `public/css/[name].css`

**Purpose**: Page-specific styling separate from shared styles.

**Typical Classes**:

- `.recordsaddrecordheading` — heading container (from styles.css)
- `.table-container` — wrapper for tables
- `.data-table` — actual table styling

**Pattern**:

```css
/* [Name] Page Specific Styles */

.recordsaddrecordheading h1 {
  grid-column: 1 / -1; /* Span full width in grid */
}

.table-container {
  padding: 1rem;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}
```

---

## Database Connection Flow

### Environment Variables Required

```env
GLOBAL_DSN=GlobalDatabaseDSN    # ODBC Data Source Name
GLOBAL_UID=username              # Database user
GLOBAL_PWD=password              # Database password
```

### ODBC Configuration

- 32-bit DSN (must use 32-bit ODBC Administrator)
- Path: `C:\Windows\SysWOW64\odbcad32.exe`
- Connection string format: `DSN=[name];UID=[user];PWD=[password]`

### SQL Query Considerations

- Global database is typically a different server/schema
- Field naming may differ from quality database
- Consider joining with master tables for denormalized data
- Use `ISNULL()` for optional fields

---

## Pervasive/ODBC Constraints & Lessons Learned

### Pervasive ODBC Constraints (Critical for Haiku)

This project interacts with a legacy Pervasive SQL database through ODBC, which behaves differently from Pervasive Control Center (PCC). The following constraints **MUST** be respected:

**Function Limitations**:

- ODBC does not support many PCC functions, including `DATE()`, `CONVERT()`, and `CAST(... AS SQL_DATE)`.
- Attempting to use unsupported functions will result in "Unsupported SQL element" or similar errors.

**Date Field Issues**:

- Raw date fields in `V_POHIST_LINES` and `V_PO_LINES` are not reliable date types.
- Fields contain mixed formats, invalid values, and trailing spaces.
- Any SQL that compares, casts, or extracts `YEAR`/`MONTH` from raw date fields will fail with "Type mismatch" or "Invalid scalar function" errors.

**Large Query Constraints**:

- Large `UNION` queries through ODBC can cause connection drops due to LNA buffer limits.
- Consider splitting large result sets into smaller queries or implementing pagination.

**PCC vs. ODBC Differences**:

- PCC queries that work perfectly may still fail under ODBC because PCC uses a different execution path.
- Always test queries through the ODBC layer, not just in PCC.

### Critical Lesson: Application-Layer Processing Required

**Do NOT attempt to compute supplier performance metrics inside SQL.** This includes:

- Quarter grouping
- On-time percentage calculations
- Date comparisons and YEAR/MONTH extractions
- PO-level collapsing or aggregations

**Instead**:

1. Fetch raw data from the database with minimal SQL filtering
2. Perform all date transformations, grouping, and calculations in the application layer (Node.js/VBScript)
3. Build aggregations programmatically
4. Return final computed results to the frontend

This approach avoids ODBC function limitations, handles malformed data gracefully, and prevents connection timeouts from complex SQL.

---

## Complete File Checklist

For a new page called `[pagename]`:

- [ ] `public/[pagename].html` — UI container
- [ ] `public/js/[pagename].mjs` — Fetch and render logic
- [ ] `public/css/[pagename].css` — Page styling
- [ ] `routes/[pagename].js` — Express route handler
- [ ] `routes/[pagename].vbs` — VBScript database connector
- [ ] Register route in `server.js`
- [ ] Update `.env` with Global database credentials if needed
- [ ] Add entry to `public/json/reports.json` if it's a report

---

## Common Issues & Troubleshooting

### Issue: VBScript Returns Empty Output

**Cause**: Script crashed or ODBC connection failed
**Solution**:

- Check `.env` file permissions and paths
- Verify DSN exists in 32-bit ODBC Administrator
- Test credentials manually in ODBC DSN setup

### Issue: JSON Parse Error in Express Route

**Cause**: VBScript output contains non-JSON characters
**Solution**:

- Use output sanitization: `.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")`
- Add debug logging to see raw output
- Ensure VBScript uses `WScript.StdOut.Write` (not echo/print)

### Issue: 32-bit ODBC Not Working

**Cause**: Using 64-bit cscript.exe instead of 32-bit
**Solution**:

- Always use `SysWOW64\cscript.exe`, not `System32\cscript.exe`
- System32 is 64-bit on 64-bit Windows
- SysWOW64 is 32-bit compatibility layer

### Issue: Data Truncation or Missing Records

**Cause**: Buffer size limits or query timeout
**Solution**:

- Use `spawn()` instead of `exec()` for large data
- Add query timeouts in VBScript
- Consider pagination if data set is large

---

## Example Implementation Reference

Real working example:

- **Frontend**: `public/topfive.html`
- **Module**: `public/js/topfive.mjs`
- **Styles**: `public/css/topfive.css`
- **Express Route**: `routes/topfive.js`
- **VBScript**: `routes/topfive.vbs`
- **API Endpoint**: `GET /topfive`

Query pattern in topfive.vbs:

```sql
SELECT TOP 5
    CUSTOMER + ' - ' + ISNULL(CUSTOMER_NAME, 'Unknown') AS CUSTOMER,
    ADDRESS1, CITY, STATE, TELEPHONE,
    COUNT(*) AS INVOICE_COUNT,
    SUM(AMOUNT) AS TOTAL_AMOUNT
FROM AR_OPEN_ITEMS
LEFT JOIN V_CUSTOMER_MASTER ON AR_OPEN_ITEMS.CUSTOMER = V_CUSTOMER_MASTER.CUSTOMER
GROUP BY CUSTOMER, CUSTOMER_NAME, ADDRESS1, CITY, STATE, TELEPHONE
ORDER BY INVOICE_COUNT DESC
```

---

## Performance Tips

1. **Limit Result Sets**: Use `TOP N` in SQL or implement pagination
2. **Index Queries**: Ensure database has indexes on commonly filtered fields
3. **Cache When Possible**: Consider caching JSON responses if data doesn't change frequently
4. **Async Module Loading**: Ensure MJS is loaded as module, not blocking
5. **Timeout Management**: Set reasonable timeouts in VBScript queries

---

## Security Considerations

1. **Credentials in `.env`**: Never commit `.env` to version control
2. **SQL Injection**: Use parameterized queries if VBScript accepts input
3. **ODBC Permissions**: Ensure DSN runs with minimal required permissions
4. **Output Sanitization**: Always sanitize VBScript output before parsing

---
