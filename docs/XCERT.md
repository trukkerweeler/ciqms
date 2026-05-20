# XCert Workorder Lookup

## Overview

**XCert** (Extended Certificate Workorder Lookup) is a certification system that generates certificates based on **inventory transactions** rather than workorder lookups. It queries the inventory history for a job/suffix, allows users to select transactions, then retrieves manufacturing operations from the base work order and all discovered child work orders.

**Primary Databases**:

- Global (via 32-bit ODBC + VBScript) — for operations queries
- Pervasive (via ODBC) — for inventory history queries

**Connection Method**: VBScript helpers with ODBC DSN

**Current Status**: ✅ Fully functional with inventory-based transaction selection and child WO discovery

---

## Architecture

### Component Stack

```
User Browser (XCert Certificate Generator)
     ↓
HTML Frontend (xcert.html)
     ↓
ES6 Module (xcert.mjs) — 3-step workflow
     ├─ Step 1: Fetch inventory transactions
     ├─ Step 2: Select transactions (with checkboxes)
     └─ Step 3: Generate certificate with operations
     ↓
Express API Routes (routes/xcert.js)
     ├─ GET /xcert/inventory-hist — Spawns xcert-inventory-hist.vbs
     └─ POST /xcert/process — Spawns xcert.vbs
     ↓
VBScript Helpers
     ├─ xcert-inventory-hist.vbs — Queries V_ITEM_HISTORY (Pervasive)
     └─ xcert.vbs — Queries operations from base + children (Global)
     ↓
Databases (ODBC DSN)
     ├─ Pervasive (Inventory History)
     └─ Global (Operations)
```

---

## Workflow

### Step 1: Fetch Inventory Transactions

User enters:

- **Job Number**: 6-digit numeric (e.g., 122473)
- **Suffix**: 3-digit zero-padded (e.g., 000)
- **Transaction Code**: Usually "J52" for in-transactions (optional, defaults to J52)

Frontend calls: **GET /xcert/inventory-hist?job=122473&suffix=000&codeTransaction=J52**

**Response**: List of inventory transactions with date, time, part, quantity

**Display**: Table with checkboxes; if only 1 row, auto-selected

### Step 2: Select Transactions

User can:

- Select individual rows with checkboxes
- Select All / Deselect All buttons
- Click "Generate Certificate"

### Step 3: Generate Certificate

For each selected transaction:

1. Query base work order operations (Job/Suffix from inventory row)
2. Find child work orders in V_ITEM_HISTORY SERIAL_NUMBER field
3. Query operations for each child
4. Display all operations in a single table with SOURCE_WO column

**Output**: Certificate showing:

- Transaction header: Job-Suffix | Date Time | Part | Quantity
- Operations table with columns: #, From Job/Suffix, Operation, Description, Date Completed, Units Complete

---

## Components

### 1. Frontend Page

**File**: [public/xcert.html](../public/xcert.html)

**Purpose**: 3-step inventory-based certificate workflow interface.

**Key Elements**:

**Step 1: Inventory History Query Form**

- Job Number input (required, numeric)
- Suffix input (required, 3 digits, defaults to "000")
- Transaction Code input (optional, defaults to "J52")
- "Fetch Inventory Transactions" button

**Step 2: Transaction Selection**

- Table with checkboxes showing: Date, Time, Part, Quantity, Job, Suffix
- "Select All", "Deselect All", "Generate Certificate" buttons
- Auto-selects single row if only one transaction found

**Step 3: Certificate Results**

- Certificate output container with transaction details and operations table

**Styling**: [public/css/xcert.css](../public/css/xcert.css)

---

### 2. Frontend Module

**File**: [public/js/xcert.mjs](../public/js/xcert.mjs)

**Purpose**: Handle 3-step workflow, API communication, and certificate rendering.

**Key State**:

- `currentInventoryData`: Array of inventory transaction rows
- `selectedWorkorders`: Set of selected row indices (uses array index as ID)

**Step 1: Form Submission** → Fetch Inventory

```javascript
inventoryForm.addEventListener("submit", async (e) => { ... })
```

- Validates job (numeric), suffix (3 digits)
- Fetches `/xcert/inventory-hist` with query parameters
- Builds table with checkboxes
- Auto-selects single row
- Adds Select All / Deselect All / Generate Certificate buttons

**Step 2: Selection Management**

Checkboxes manage `selectedWorkorders` Set:

- Add index on check
- Remove index on uncheck
- Add/Remove row class `selected` for styling

**Step 3: Certificate Generation** → Generate Cert

```javascript
async function handleGenerateCert()
```

- Iterates each selected transaction
- Calls `POST /xcert/process` with: baseWorkorder (job), suffix, operationCodes (empty array)
- Receives operations from base + child WOs
- Groups by SOURCE_WO
- Renders single table with all operations
- Adds "Print Certificate" button for browser print

**Certificate Output Format**:

For each selected transaction, displays:

```
Header: Certificate: Job 122473-000 | Transaction: 260305 14464696 | Part: 521572 A | Qty: 17

Table:
  # | From Job/Suffix | Operation | Router Seq | Description | PO (Reference) | Date Completed | Units Complete
  1 | 122429-001      | BLAN1     | 001150     | PASSIVATE... | 0041965        | 251230         | 0
  2 | 122473-000      | ATTACH    | 0          | ATTACH...   | LABOR INPUT    | 260305         | 17
```

**Row Highlighting**:

- Rows with numeric PO numbers are highlighted (light yellow background) to identify outside operations
- Text-only REFERENCE values (like "LABOR INPUT") are not highlighted
- PO field displayed in bold blue for numeric values

---

### 3. Express Route Handlers

**File**: [routes/xcert.js](../routes/xcert.js)

**Database**: Pervasive (inventory-hist) + Global (operations)

#### Endpoint 1: GET /xcert/inventory-hist

**Query Parameters**:

- `job` - Job number (required, numeric)
- `suffix` - Suffix (required, 3 digits)
- `codeTransaction` - Transaction code (optional, defaults to "J52")

**Request Validation**:

```javascript
if (!job || !suffix) return 400 { error: "Missing job or suffix" }
if (!/^\d+$/.test(job)) return 400 { error: "Invalid job number" }
if (!/^\d{3}$/.test(suffix)) return 400 { error: "Invalid suffix (must be 3 digits)" }
```

**Spawn**: 32-bit cscript executes `xcert-inventory-hist.vbs`

**Response** (200):

```json
{
  "job": "122473",
  "suffix": "000",
  "data": [
    {
      "DATE_HISTORY": "260305",
      "INV_HIST_TIME": "14464696",
      "QUANTITY": "17",
      "JOB": "122473",
      "SUFFIX": "000",
      "PART": "521572           A  "
    }
  ]
}
```

#### Endpoint 2: POST /xcert/process

**Request Body**:

```json
{
  "baseWorkorder": "122473",
  "suffix": "000",
  "operationCodes": []
}
```

**Validation**:

```javascript
if (!baseWorkorder || !suffix || !Array.isArray(operationCodes))
  return 400 { error: "Missing baseWorkorder, suffix, or operationCodes" }
if (!/^\d{6}$/.test(baseWorkorder))
  return 400 { error: "Invalid baseWorkorder" }
if (!/^\d{3}$/.test(suffix))
  return 400 { error: "Invalid suffix (must be 3 digits)" }
```

**Spawn**: 32-bit cscript executes `xcert.vbs` with arguments: [baseWorkorder, suffix, operationCodesStr]

**Response** (200):

```json
{
  "baseWorkorder": "122473",
  "data": [
    {
      "SEQ": "000100",
      "OPERATION": "KITTG",
      "DESC_RT_LINE": "Kit Tubing",
      "DATE_COMPLETED": "2026-03-05",
      "UNITS_COMPLETE": "17",
      "SOURCE_WO": "122473-000"
    },
    {
      "SEQ": "000400",
      "OPERATION": "ATTACH",
      "DESC_RT_LINE": "Attach Solenoid",
      "DATE_COMPLETED": "2026-03-05",
      "UNITS_COMPLETE": "17",
      "SOURCE_WO": "122473-000"
    },
    {
      "SEQ": "000500",
      "OPERATION": "FINALI",
      "DESC_RT_LINE": "Final Assembly",
      "DATE_COMPLETED": "2026-03-05",
      "UNITS_COMPLETE": "17",
      "SOURCE_WO": "122473-000"
    },
    {
      "SEQ": "000600",
      "OPERATION": "MARKPT",
      "DESC_RT_LINE": "Mark Part",
      "DATE_COMPLETED": "2026-03-05",
      "UNITS_COMPLETE": "17",
      "SOURCE_WO": "122473-000"
    },
    {
      "SEQ": "000200",
      "OPERATION": "PASS",
      "DESC_RT_LINE": "Passivation",
      "DATE_COMPLETED": "2026-03-05",
      "UNITS_COMPLETE": "17",
      "SOURCE_WO": "122429-001"
    }
  ]
}
```

---

## VBScript Helpers

### 1. Inventory History Query

**File**: [routes/xcert-inventory-hist.vbs](../routes/xcert-inventory-hist.vbs)

**Purpose**: Query V_ITEM_HISTORY for inventory transactions

**Arguments**: `<job> <suffix> <codeTransaction>`

**Database Query**:

```sql
SELECT DATE_HISTORY, INV_HIST_TIME, QUANTITY, JOB, SUFFIX, PART
FROM INVENTORY_HIST
WHERE JOB = 122473 AND SUFFIX = '000' AND CODE_TRANSACTION = 'J52'
ORDER BY DATE_HISTORY
```

**Environment Variables** (from .env):

- `GLOBAL_DSN` - ODBC DSN for Pervasive database
- `GLOBAL_UID` - Database user
- `GLOBAL_PWD` - Database password

---

### 2. Process Operations Query

**File**: [routes/xcert.vbs](../routes/xcert.vbs)

**Purpose**: Query manufacturing operations from base + child work orders with PO discovery

**Arguments**: `<baseWorkorder> <suffix> <operationCodes>`

**Workflow**:

1. **Query Base Operations with PO Discovery**

   ```sql
   SELECT DISTINCT
     jo.SEQ, jo.OPERATION, CAST(jo.ROUTER_SEQ AS VARCHAR) AS ROUTER_SEQ,
     rl.DESC_RT_LINE, jo.DATE_COMPLETED, jo.UNITS_COMPLETE,
     jh.PART, jh.PART_DESCRIPTION,
     COALESCE(vjd.REFERENCE, '') AS REFERENCE,
     'baseWorkorder-baseSuffix' AS SOURCE_WO
   FROM JOB_HEADER jh
   LEFT JOIN JOB_OPERATIONS jo ON jh.JOB = jo.JOB AND jh.SUFFIX = jo.SUFFIX
   LEFT JOIN ROUTER_LINE rl ON jo.ROUTER = rl.ROUTER AND jo.ROUTER_SEQ = rl.LINE_ROUTER
   LEFT JOIN V_JOB_DETAIL vjd ON vjd.JOB = jo.JOB AND vjd.SUFFIX = jo.SUFFIX AND vjd.SEQ = jo.SEQ
   WHERE jh.JOB = 122473 AND jh.SUFFIX = '000'
   AND jo.LMO IN ('L','O') AND jo.SEQ < '990000' AND jo.OPERATION <> ''
   ```

   **Key Additions**:
   - `SELECT DISTINCT` - Removes duplicate rows (V_JOB_DETAIL may have multiple rows per operation)
   - `V_JOB_DETAIL` join - Retrieves `REFERENCE` field (contains PO numbers or text labels like "LABOR INPUT")
   - `ROUTER_SEQ` - Included for outside operation identification

2. **Find Child Work Orders**

   ```sql
   SELECT DISTINCT SERIAL_NUMBER FROM V_ITEM_HISTORY
   WHERE JOB = 122473 AND SERIAL_NUMBER <> ''
   AND SERIAL_NUMBER LIKE '%-___'
   AND SERIAL_NUMBER <> '122473-000'
   ```

   - Extracts child WO numbers from SERIAL_NUMBER (e.g., "122429-001")
   - Parses into Job and Suffix

3. **Query Child Operations**
   - For each child: Repeat operation query with child job/suffix
   - Same V_JOB_DETAIL join for PO discovery
   - Add SOURCE_WO field to track origin

4. **Combine Results**
   - Merge base + child operations into single array
   - Include REFERENCE (PO) and SOURCE_WO for each row
   - Return as JSON

**Sample Response**:

```json
{
  "baseWorkorder": "122473",
  "data": [
    {
      "SEQ": "000100",
      "OPERATION": "BLAN1",
      "ROUTER_SEQ": "001150",
      "DESC_RT_LINE": "PASSIVATE PER SAE-AMS-2700",
      "DATE_COMPLETED": "251230",
      "UNITS_COMPLETE": "0",
      "REFERENCE": "0041965",
      "SOURCE_WO": "122429-001"
    },
    {
      "SEQ": "000050",
      "OPERATION": "ATTACH",
      "ROUTER_SEQ": "0",
      "DESC_RT_LINE": "Attach Solenoid",
      "DATE_COMPLETED": "260305",
      "UNITS_COMPLETE": "17",
      "REFERENCE": "LABOR INPUT",
      "SOURCE_WO": "122473-000"
    }
  ]
}
```

**Environment Variables** (from .env):

- `GLOBAL_DSN` - ODBC DSN for Global database
- `GLOBAL_UID` - Database user
- `GLOBAL_PWD` - Database password

---

## Key Design Decisions

### Why Inventory-Based?

- Allows users to select specific transactions instead of entire work orders
- Supports date/time discrimination for multiple transactions on same WO
- Links to physical inventory movements via INVENTORY_HIST table

### Why Child Work Order Discovery?

- Manufacturing processes can span multiple work orders
- Child WOs are identified in V_ITEM_HISTORY SERIAL_NUMBER field
- Ensures complete operation chain is captured on certificate

### Why Single Certificate Table?

- All operations (base + children) grouped in one table
- SOURCE_WO column clearly shows which WO each operation belongs to
- Matches manufacturing reality: sequential operations across related WOs

### Suffix as String Format

- Database stores suffix as 3-digit zero-padded: "000", "001", not 0, 1
- Maintains consistency across all queries and displays
- Prevents type mismatch errors in Pervasive ODBC comparisons

---

## Special Manufacturing Processes

XCert filters operations to only the 6 special manufacturing processes (matching ACERT):

| Process | Label          | Operation Codes    |
| ------- | -------------- | ------------------ |
| HEAT    | Heat Treatment | `6061`             |
| SWLD    | Spot Weld      | `D172`             |
| FWLD    | Fusion Weld    | `FUSION`, `D171`   |
| PASS    | Passivation    | `PASSM2`, `PASST6` |
| CHEM    | Chemical       | `FT1C1A`           |
| PAINT   | Paint          | `23377A`, `PAINT2` |

All other operations are filtered out, ensuring the certificate only shows the relevant special processes. This filtering is applied to both base and child work order operations.

**Spawn Configuration**:

```javascript
const vbsPath = path.join(__dirname, "xcert.vbs");
const cscript32 = path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe");

execFile(cscript32, ["//Nologo", vbsPath, baseWorkorder], { windowsHide: true }, ...)
```

**Critical Details**:

- **32-bit cscript**: Uses `SysWOW64/cscript.exe` for 32-bit ODBC driver compatibility
- **Process Hiding**: `windowsHide: true` prevents console window from appearing
- **Spawn Flags**: `//Nologo` suppresses VBScript execution header
- **Arguments**: Base workorder passed as command-line argument
- **Output**: Expects JSON string from stdout

#### Endpoint

**GET /xcert**

**Query Parameters**:

- `baseWorkorder` - 6-digit workorder number (required)

**Request Validation**:

```javascript
if (!/^\d{6}$/.test(baseWorkorder)) {
  return res.status(400).json({ error: "Invalid baseWorkorder" });
}
```

**Response Success** (200):

```json
{
  "baseWorkorder": "122419",
  "data": [
    {
      "ROUTER": "PART_ID ABC",
      "JOB": 122419,
      "SUFFIX": 1,
      "REFERENCE": "REF_001",
      "DATE_COMPLETED": "2026-05-14"
    },
    {
      "ROUTER": "PART_ID ABC",
      "JOB": 122419,
      "SUFFIX": 2,
      "REFERENCE": "REF_002",
      "DATE_COMPLETED": "2026-05-15"
    }
  ]
}
```

**Response Fields**:

- `baseWorkorder` - The workorder queried (for logging/verification)
- `data` - Array of result records

**Error Responses**:

- 400: Invalid workorder format
- 500: VBScript execution error or JSON parsing failure

**Error Details** (500):

```json
{
  "error": "VBS execution failed | Failed to parse VBS output",
  "details": "[stderr output]",
  "raw": "[stdout output]",
  "stderr": "[stderr output]"
}
```

---

## VBScript Helper

**File**: [routes/xcert.vbs](../routes/xcert.vbs)

### Implementation Overview

The VBScript helper handles:

1. **Environment Configuration** - Reads `.env` file for ODBC DSN, UID, PWD
2. **Computer Detection** - Special path handling for `QUALITY-MGR` machine
3. **ADODB Connection** - Connects via ODBC DSN with credentials
4. **SQL Query Execution** - Queries Global database views
5. **JSON Formatting** - Converts recordset to JSON output
6. **Error Handling** - Logs errors to stderr, returns empty array on failure

### Environment Variables

XCert reads from `.env` file:

```
GLOBAL_DSN=<odbc_dsn_name>
GLOBAL_UID=<database_user>
GLOBAL_PWD=<database_password>
```

**File Lookup Logic**:

1. If machine name = `QUALITY-MGR`: Look in `Documents\CIQMS1\env`
2. Otherwise: Look in `Documents\CIQMS\env`
3. Fallback: Look for `.env` in parent directory

### SQL Query

The VBScript queries Global database using views with optional operation filtering:

```sql
SELECT DISTINCT
  vrl.ROUTER, vjo.JOB, vjo.SUFFIX, vjd.REFERENCE,
  vjo.DATE_COMPLETED, vrl.OPERATION, vjo.DESCRIPTION
FROM V_ITEM_HISTORY vih
JOIN V_ROUTER_LINE vrl ON vrl.ROUTER = vih.PART
JOIN V_JOB_OPERATIONS vjo ON CAST(vjo.ROUTER_SEQ AS INTEGER)
  BETWEEN CAST(vrl.LINE_ROUTER AS INTEGER)
  AND CAST(vrl.LINE_ROUTER AS INTEGER) + 99
JOIN V_JOB_DETAIL vjd ON vjd.JOB = vjo.JOB
  AND vjd.SUFFIX = vjo.SUFFIX AND vjd.SEQ = vjo.SEQ
WHERE vih.JOB = [baseWorkorder]
  AND vih.SERIAL_NUMBER LIKE '______-___'
  AND vjo.JOB = CAST(SUBSTRING(vih.SERIAL_NUMBER, 1, 6) AS INTEGER)
  AND vjo.SUFFIX = CAST(SUBSTRING(vih.SERIAL_NUMBER, 8, 3) AS INTEGER)
  AND vjd.REFERENCE IS NOT NULL
  AND vrl.OPERATION IN ([operationCodes])  -- Added when filtering
```

**Query Behavior**: Filters by operation codes when provided via POST request. Returns matching operations and their references.

**Views Used** (not raw tables):

- `V_ITEM_HISTORY` - Item history view
- `V_ROUTER_LINE` - Router line view
- `V_JOB_OPERATIONS` - Job operations view
- `V_JOB_DETAIL` - Job detail view

### Key Functions

#### RecordsetToJSON(rs)

Converts ADODB Recordset to JSON array:

```json
[
  {"ROUTER": "...", "JOB": 122419, ...},
  {"ROUTER": "...", "JOB": 122419, ...}
]
```

#### ToJSONValue(val)

Formats individual field values:

- NULL → `null`
- Other → `"escaped_string"`

#### EscapeJSON(str)

Escapes special characters for JSON:

- `\` → `\\`
- `"` → `""`
- `/` → `\/`
- Newlines, tabs, control characters escaped

### Error Handling

| Error                         | Behavior                     |
| ----------------------------- | ---------------------------- |
| `.env` file not found         | Shows MsgBox, exits          |
| DSN/UID/PWD missing in `.env` | Shows MsgBox, exits          |
| ODBC connection fails         | Shows MsgBox, exits          |
| SQL query fails               | Logs to stderr, outputs `[]` |
| No records found              | Outputs `[]`                 |

### Debugging

SQL query logged to stderr for troubleshooting:

```
DEBUG SQL: SELECT DISTINCT ... WHERE vih.JOB = 122419 ...
```

**To debug manually**:

```powershell
C:\Windows\SysWOW64\cscript.exe xcert.vbs 122419 2>&1
```

---

## Database Tables Used

### Global Database (via ODBC)

| Table            | Purpose                   | Key Fields                             |
| ---------------- | ------------------------- | -------------------------------------- |
| `ITEM_HISTORY`   | Item history records      | JOB, SERIAL_NUMBER, PART               |
| `ROUTER_LINE`    | Router operation mappings | ROUTER, OPERATION, LINE_ROUTER         |
| `JOB_OPERATIONS` | Job operation details     | JOB, SUFFIX, OPERATION, DATE_COMPLETED |
| `JOB_DETAIL`     | Job detail records        | JOB, SUFFIX, REFERENCE                 |

_(Actual tables depend on VBScript query implementation)_

---

## Configuration

### ODBC DSN Setup

XCert requires a 32-bit ODBC DSN for the Global database.

**Steps** (Windows):

1. Open **ODBC Data Source Administrator** (32-bit version):
   - Run: `C:\Windows\SysWOW64\odbcad32.exe`
2. Go to **System DSN** tab
3. Click **Add**
4. Select appropriate driver (e.g., MySQL ODBC 8.0 Driver)
5. Configure connection:
   - **Data Source Name**: `GlobalDatabase` (or name used in xcert.vbs)
   - **Server**: Database host
   - **Database**: `global`
   - **Port**: 3306
   - Test connection before saving

### VBScript Path

Currently expects: `routes/xcert.vbs`

If file location changes, update in `routes/xcert.js`:

```javascript
const vbsPath = path.join(__dirname, "xcert.vbs"); // ← Change path here
```

---

## Usage Flow

### 1. User Interaction

```
User enters workorder: 122419
      ↓
Click "Query" button
      ↓
Form validation (6 digits)
      ↓
Show "Working..." indicator
```

### 2. Backend Process

```
Express receives: GET /xcert?baseWorkorder=122419
      ↓
Spawns 32-bit cscript.exe with xcert.vbs
      ↓
VBScript executes:
  - Connect to Global via ODBC
  - Query for JOB = 122419
  - Output JSON array
      ↓
Express captures stdout
      ↓
Parse JSON and return to frontend
```

### 3. Results Display

```
Table with columns: Part | JOB | SUFFIX | REFERENCE | DATE_COMPLETED
Row 1: PART_123 | 122419 | 001 | REF_001 | 2026-05-14
Row 2: PART_124 | 122419 | 002 | REF_002 | 2026-05-15
```

---

## Performance & Deployment

### Process Overhead

- **Cold Start**: ~500-800ms (VBScript initialization + ODBC connection)
- **Subsequent**: ~200-400ms (same overhead per request)
- **Bottleneck**: ODBC connection and network latency to Global

### 32-bit ODBC Requirement

⚠️ **Critical**: Must use 32-bit cscript.exe (`SysWOW64\cscript.exe`)

**Why**:

- ODBC drivers often available only in 32-bit versions
- 64-bit Node.js cannot spawn 64-bit ODBC connections reliably
- 32-bit cscript bypasses this limitation

**Verification**:

```powershell
# Check 32-bit ODBC driver installed
Get-Item "C:\Windows\SysWOW64\odbcad32.exe"
```

### Windows Deployment

XCert is **Windows-only** due to VBScript + ODBC dependency.

For cross-platform support, consider:

1. Rewriting VBScript in Node.js using mysql2 (like ACert)
2. Using Linux ODBC drivers (limited support)
3. Keeping as Windows-specific tool

---

## Troubleshooting

### "VBS execution failed" Error

**Cause**: VBScript crashed or couldn't connect to database

**Debug**:

1. Test VBScript manually:
   ```powershell
   C:\Windows\SysWOW64\cscript.exe routes\xcert.vbs 122419
   ```
2. Check stderr output in Express logs
3. Verify ODBC DSN exists:
   ```powershell
   C:\Windows\SysWOW64\odbcad32.exe  # Check System DSN list
   ```

### "Failed to parse VBS output" Error

**Cause**: VBScript output is not valid JSON

**Solutions**:

1. Ensure VBScript outputs only JSON to stdout
2. No console.log or other text before JSON
3. Check for special characters requiring escaping

### "Invalid baseWorkorder" Error

**Cause**: Input validation failed

**Solution**: Enter exactly 6 digits

### "No results found"

**Cause**: Workorder doesn't exist in Global database

**Debug**:

1. Verify workorder in Global using direct query
2. Check JOB table directly for workorder number
3. Verify VBScript query logic

---

## Comparison: ACert vs XCert

| Aspect          | ACert              | XCert                      |
| --------------- | ------------------ | -------------------------- |
| **Connection**  | Direct MySQL       | VBScript + ODBC            |
| **Database**    | Global (MySQL)     | Global (ODBC)              |
| **Platform**    | Cross-platform     | Windows-only               |
| **Setup**       | `.env` credentials | ODBC DSN + VBScript        |
| **Speed**       | Fast (~200-400ms)  | Moderate (~500-800ms)      |
| **Reliability** | High (native)      | Medium (VBScript overhead) |
| **Use Case**    | Primary lookup     | Legacy/specialty queries   |

---

## Development Notes

- **Process-Based Filtering**: Now uses same 6 process types as ACert (HEAT, SWLD, FWLD, PASS, CHEM, PAINT)
- **Operation Codes**: Configurable in xcert.mjs - edit `processes` array to change operations per process
- **Multiple Queries**: Frontend makes separate POST request for each process type
- **DSN Configuration**: Ensure ODBC DSN matches `GLOBAL_DSN` value in `.env`
- **Computer-Specific Paths**: Script detects `QUALITY-MGR` machine and uses `CIQMS1` folder instead of `CIQMS`
- **Debug Mode**: Set `test = True` in VBScript for offline testing with example workorder
- **Stderr Logging**: SQL query logged to stderr—check Express console output for debugging

---

## Related Documentation

- [GLOBAL_DATABASE_PAGES.md](GLOBAL_DATABASE_PAGES.md) — General global database patterns
- [ACERT.md](ACERT.md) — ACert (direct MySQL alternative)
- [xcert.html](../public/xcert.html) — Main page
- [xcert.mjs](../public/js/xcert.mjs) — Frontend logic
