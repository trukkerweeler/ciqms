# GlobalCert Workorder Lookup

## Overview

**GlobalCert** (Global Certificate Workorder Lookup) is a certification system that generates certificates based on **inventory transactions** rather than workorder lookups. It queries the inventory history for a job/suffix, allows users to select transactions, then retrieves manufacturing operations from the base work order and all discovered child work orders.

**Primary Database**: Pervasive (Global) via 32-bit ODBC + VBScript

**Connection Method**: VBScript helpers with ODBC DSN

**Current Status**: ✅ Fully functional with inventory-based transaction selection and child WO discovery

---

## Architecture

### Component Stack

```
User Browser (GlobalCert Certificate Generator)
     ↓
HTML Frontend (globalcert.html)
     ↓
ES6 Module (globalcert.mjs) — 3-step workflow
     ├─ Step 1: Fetch inventory transactions
     ├─ Step 2: Select transactions (with checkboxes)
     └─ Step 3: Generate certificate with operations
     ↓
Express API Routes (routes/globalcert.js)
     ├─ GET /globalcert/inventory-hist — Spawns globalcert-inventory-hist.vbs
     └─ POST /globalcert/process — Spawns globalcert.vbs
     ↓
VBScript Helpers
     ├─ globalcert-inventory-hist.vbs — Queries V_ITEM_HISTORY
     └─ globalcert.vbs — Queries operations from base + children
     ↓
Database (ODBC DSN)
     └─ Pervasive (Global)
```

## Workflow

### Step 1: Fetch Inventory Transactions

User enters:

- **Job Number**: 6-digit numeric (e.g., 122473)
- **Suffix**: 3-digit zero-padded (e.g., 000)
- **Transaction Code**: Usually "J52" for in-transactions (optional, defaults to J52)

Frontend calls: **GET /globalcert/inventory-hist?job=122473&suffix=000&codeTransaction=J52**

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

**File**: [public/globalcert.html](../public/globalcert.html)

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

**Styling**: [public/css/globalcert.css](../public/css/globalcert.css)

---

### 2. Frontend Module

**File**: [public/js/globalcert.mjs](../public/js/globalcert.mjs)

**Purpose**: Handle 3-step workflow, API communication, and certificate rendering.

**Key State**:

- `currentInventoryData`: Array of inventory transaction rows
- `selectedWorkorders`: Set of selected row indices (uses array index as ID)

**Step 1: Form Submission** → Fetch Inventory

```javascript
inventoryForm.addEventListener("submit", async (e) => { ... })
```

- Validates job (numeric), suffix (3 digits)
- Fetches `/globalcert/inventory-hist` with query parameters
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
- Calls `POST /globalcert/process` with: baseWorkorder (job), suffix, operationCodes (empty array)
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

**File**: [routes/globalcert.js](../routes/globalcert.js)

**Database**: Pervasive (inventory-hist) + Global (operations)

#### Endpoint 1: GET /globalcert/inventory-hist

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

**Spawn**: 32-bit cscript executes `globalcert-inventory-hist.vbs`

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

#### Endpoint 2: POST /globalcert/process

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

**Spawn**: 32-bit cscript executes `globalcert.vbs` with arguments: [baseWorkorder, suffix, operationCodesStr]

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

**File**: [routes/globalcert-inventory-hist.vbs](../routes/globalcert-inventory-hist.vbs)

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

**File**: [routes/globalcert.vbs](../routes/globalcert.vbs)

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

2. **Find Child Work Orders** (Suffix Agnostic)

   ```sql
   SELECT DISTINCT SERIAL_NUMBER FROM V_ITEM_HISTORY
   WHERE JOB = 122473 AND SERIAL_NUMBER <> ''
   AND SERIAL_NUMBER LIKE '%-___'
   AND SERIAL_NUMBER <> '122473-000'
   ```

   - First pass is **suffix agnostic** — searches all ITEM_HISTORY records for the base job number, regardless of suffix
   - Extracts child WO numbers from SERIAL_NUMBER (e.g., "122429-001")
   - Parses into Job and Suffix components

3. **Query Child Operations** (Suffix Specific)
   - For each discovered child WO: Execute operation query **using the specific job AND suffix** from that child (e.g., Job=122429, Suffix=001)
   - Same V_JOB_DETAIL join for PO discovery
   - Add SOURCE_WO field to track origin (e.g., "122429-001")

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

GlobalCert filters operations to only the 6 special manufacturing processes (matching ACERT):

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
const vbsPath = path.join(__dirname, "globalcert.vbs");
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

**GET /globalcert**

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

```
