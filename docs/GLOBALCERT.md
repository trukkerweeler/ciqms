# GlobalCert — Chain-of-Custody Extraction (Steps 1–3)

This document defines the implementation and architecture of the GlobalCert chain-of-custody system for CIQMS. It covers:

- Steps 1–3 of CoC extraction (complete specification)
- Database schema and table usage (ITEM_HISTORY only)
- VBScript implementation (processcert-coc.vbs)
- Express endpoint (GET /globalcert/processcert-coc)
- Frontend integration (globalcert.mjs)
- JSON output structure

## Critical Decision: ITEM_HISTORY (Not INVENTORY_HIST)

**Table Used**: `ITEM_HISTORY` exclusively

**Reason**: ITEM_HISTORY contains the `SERIAL_NUMBER` field, which is essential for Step 3 child job resolution. INVENTORY_HIST lacks this field and cannot support CoC extraction.

**Consequence**: The system cannot use INVENTORY_HIST under any circumstances. All data extraction must use ITEM_HISTORY.

---

## Architecture Overview

### Backend Components

**VBScript Implementation**: `routes/processcert-coc.vbs`

- Unified implementation of Steps 1–3
- Database access via ADODB with credentials from .env (GLOBAL_DSN, GLOBAL_UID, GLOBAL_PWD)
- Direct JSON string concatenation (no serialization)

**Express Endpoint**: GET `/globalcert/processcert-coc?job=<job>&selectedIndices=<indices>`

- Calls processcert-coc.vbs with arguments
- Parses VBScript JSON output
- Returns complete Step 1–3 data

**Frontend Module**: `public/js/globalcert.mjs`

- Displays Step 1 inventory table with checkboxes
- Collects selected indices (0-based array positions)
- Calls endpoint twice: Step 1 (no indices), Step 3 (with indices)
- Renders CoC table

### Data Flow

```
User enters job → Step 1 fetch (no indices)
    ↓
Display J52 transactions in table
    ↓
User selects rows via checkboxes
    ↓
User clicks "Generate Certificate"
    ↓
Step 3 fetch (with selectedIndices)
    ↓
Display CoC table with parent/operation/child columns
```

---

## Step 1: Fetch Inventory Transactions (J52)

**Purpose**: Identify all downstream completions (J52 transactions) for a given job.

**Inputs**:

- JOB (6-digit work order number, e.g., "122166")

**Query**:

```sql
SELECT DATE_HISTORY, TIME_ITEM_HISTORY, PART, QUANTITY, JOB, SUFFIX, SERIAL_NUMBER
FROM ITEM_HISTORY
WHERE JOB = '<job>'
AND CODE_TRANSACTION = 'J52'
ORDER BY DATE_HISTORY, TIME_ITEM_HISTORY
```

**Behavior**:

- Suffix-agnostic: All J52 rows for any suffix are included
- Results sorted by date and time (chronological order)
- Each row receives an implicit `index` (0, 1, 2, ...)

**Output** (per row, camelCase keys):

- `index`: 0-based array position
- `dateHistory`: String (YYMMDD)
- `timeItemHistory`: String (HHmmsscc)
- `part`: String (right-padded with spaces)
- `quantity`: Numeric
- `job`: String (6-digit zero-padded)
- `suffix`: String (3-digit zero-padded)
- `serialNumber`: String, format "JJJJJJ-SSS..." (reference to child job)

**JSON Array**: All transactions returned as array in `step1_j52_transactions`

---

## Step 2: Select Transactions

**Purpose**: User chooses which J52 completions to include in the certificate.

**Mechanism**:

1. Frontend displays Step 1 table with checkboxes (one per row)
2. User checks boxes to select transactions
3. Selected row indices collected as comma-separated string (e.g., "0,1,3")
4. Indices passed as `selectedIndices` parameter to Step 3

**No Database Work**: Step 2 is purely client-side selection logic.

**Fallback**: If no rows selected, Step 3 returns empty `step3_coc_links` array.

---

## Step 3: Build Chain-of-Custody Links

**Purpose**: For each selected J52 transaction, identify the upstream (child) job and its material pulls.

**For Each Selected Transaction**:

### 3A: Parse Child Job from SERIAL_NUMBER

**Format**: SERIAL_NUMBER is "JJJJJJ-SSS" followed by padding (total ~27 chars)

**Parsing** (positional extraction, not string trimming):

```vbscript
childJob = Mid(serialNumber, 1, 6)     ' Positions 1-6: job number
childSuffix = Mid(serialNumber, 8, 3)  ' Positions 8-10: suffix (skip hyphen at 7)
```

**Rationale**: Pervasive v10 Trim() is unreliable; positional extraction is stable.

### 3B: Match Child Job's J52 Row

**Query**:

```sql
SELECT DATE_HISTORY, TIME_ITEM_HISTORY, PART, QUANTITY, JOB, SUFFIX, SERIAL_NUMBER
FROM ITEM_HISTORY
WHERE JOB = '<childJob>'
AND SUFFIX = '<childSuffix>'
AND CODE_TRANSACTION = 'J52'
AND DATE_HISTORY = '<parentDateHist>'
AND TIME_ITEM_HISTORY = '<parentTimeHist>'
```

**Logic**: Match using parent's date/time. Typically the same, but constraint ensures uniqueness.

**Fallback**: Return `null` if no match found.

### 3C: Load Child Job Header

**Query**:

```sql
SELECT PART, PART_DESCRIPTION, ROUTER
FROM JOB_HEADER
WHERE JOB = '<childJob>'
AND SUFFIX = '<childSuffix>'
```

**Fallback**: Return `null` if not found.

### 3D: Load Child Job Material Pulls

**Query**:

```sql
SELECT PART, QUANTITY, CODE_TRANSACTION, DATE_HISTORY
FROM ITEM_HISTORY
WHERE JOB = '<childJob>'
AND SUFFIX = '<childSuffix>'
AND CODE_TRANSACTION IN ('J55','J50','J51')
ORDER BY CODE_TRANSACTION, DATE_HISTORY
```

**Codes**:

- J55: Material issue
- J50: Lot issue
- J51: Heat/lot issue

**Fallback**: Empty array if no matches.

### 3E: Match Parent Operation

**Query**:

```sql
SELECT TOP 1 SEQ, OPERATION, ROUTER, ROUTER_SEQ
FROM JOB_OPERATIONS
WHERE JOB = '<parentJob>'
AND SUFFIX = '<parentSuffix>'
AND LMO IN ('L','O')
AND SEQ < '990000'
AND (DATE_COMPLETED IS NULL OR DATE_COMPLETED <= '<parentDateHist>')
ORDER BY DATE_COMPLETED DESC, SEQ DESC
```

**Constraints**:

- `LMO IN ('L','O')`: Labor or outside processing only
- `SEQ < '990000'`: Exclude inspection/scrap/rework sequences
- `DATE_COMPLETED <= parentDateHist OR NULL`: Operation must be completed before/on parent's completion date
- `TOP 1`: Return most recent operation

**Fallback**: Return `null` if no operation found.

### 3F: Join ROUTER_LINE for Description

**Query**:

```sql
SELECT DESC_RT_LINE, PART_WC_OUTSIDE
FROM ROUTER_LINE
WHERE ROUTER = '<router>'
AND LINE_ROUTER = '<routerSeq>'
```

**Output**:

- `DESC_RT_LINE`: Operation description (trimmed in JSON)
- `PART_WC_OUTSIDE`: 'Y' or 'N' indicator

**Fallback**: Empty strings if not found.

### 3G: Join JOB_DETAIL for PO Number

**Query** (only if PART_WC_OUTSIDE = 'Y'):

```sql
SELECT REFERENCE
FROM JOB_DETAIL
WHERE JOB = '<parentJob>'
AND SUFFIX = '<parentSuffix>'
AND OPERATION = '<operation>'
```

**Output**: `REFERENCE` field (PO number, supplier name, etc.)

**Fallback**: Empty string if not found or PART_WC_OUTSIDE != 'Y'.

---

## JSON Output Structure

### Complete Response

```json
{
  "success": true,
  "step1_j52_transactions": [
    {
      "index": 0,
      "dateHistory": "241210",
      "timeItemHistory": "15334732",
      "part": "521572           A  ",
      "quantity": 46,
      "job": "122166",
      "suffix": "000",
      "serialNumber": "122166-000                    "
    }
  ],
  "selectedIndices": [0, 1],
  "step3_coc_links": [
    {
      "parent_j52": {
        "dateHistory": "241210",
        "timeItemHistory": "15334732",
        "part": "521572           A  ",
        "quantity": 46,
        "job": "122166",
        "suffix": "000",
        "serialNumber": "122166-000                    "
      },
      "operation": {
        "seq": "000600",
        "operation": "FINALI",
        "router_desc": "MARK PART                     ",
        "po_number": "",
        "outside": false
      },
      "child_job": {
        "job": "122166",
        "suffix": "000",
        "header": {
          "part": "521572           A  ",
          "description": "BRACKET , ACTUATOR SHROUD     ",
          "router": "521572           A  "
        },
        "child_j52": {
          "dateHistory": "241210",
          "timeItemHistory": "15334732",
          "part": "521572           A  ",
          "quantity": 46,
          "job": "122166",
          "suffix": "000",
          "serialNumber": "122166-000                    "
        },
        "material_pulls": [
          {
            "part": "521572-99        A  ",
            "quantity": -46,
            "codeTransaction": "J55",
            "dateHistory": "241209"
          }
        ]
      }
    }
  ]
}
```

### Top-Level Fields

- **success** (boolean): Always `true` if request succeeds
- **step1_j52_transactions** (array): All J52 transactions for the job
- **selectedIndices** (array): Indices of selected transactions (empty if no parameter passed)
- **step3_coc_links** (array): CoC link objects (one per selected transaction)

### step1_j52_transactions Item

- **index** (number): 0-based position in transactions array
- **dateHistory** (string): YYMMDD format
- **timeItemHistory** (string): HHmmsscc format
- **part** (string): Part number (right-padded with spaces)
- **quantity** (number): Completion quantity
- **job** (string): 6-digit job number
- **suffix** (string): 3-digit suffix
- **serialNumber** (string): Child job reference ("JJJJJJ-SSS..." format)

### step3_coc_links Item

- **parent_j52** (object): The selected J52 transaction (copy from step1)
- **operation** (object): Parent operation from JOB_OPERATIONS
  - **seq** (string): Operation sequence number
  - **operation** (string): Operation code
  - **router_desc** (string): Operation description (trimmed)
  - **po_number** (string): PO number (empty if no outside processing)
  - **outside** (boolean): True if PART_WC_OUTSIDE = 'Y'
- **child_job** (object): Identified child job details
  - **job** (string): Child job number
  - **suffix** (string): Child suffix
  - **header** (object): Child job header
    - **part** (string): Part number
    - **description** (string): Part description
    - **router** (string): Router used
  - **child_j52** (object): Child job's J52 completion (null if not found)
  - **material_pulls** (array): J55/J50/J51 transactions for child job

---

## Implementation Files

### processcert-coc.vbs

**Location**: `routes/processcert-coc.vbs`

**Entry Point**:

- Reads .env for GLOBAL_DSN, GLOBAL_UID, GLOBAL_PWD
- Parses command-line arguments: JOB, [selectedTransactionIndices]
- Executes Step 1–3 logic
- Outputs JSON via WScript.Echo

**Helper Functions**:

- `QuoteJSON(val)`: Escapes and quotes JSON strings
- `EscapeJSON(str)`: Handles backslash, quote, CR, LF, tab escaping
- `GetChildJ52JSON()`: Executes 3B query
- `GetChildHeaderJSON()`: Executes 3C query
- `GetMaterialPullsJSON()`: Executes 3D query
- `GetParentOperationJSON()`: Executes 3E–3G queries

### globalcert.js (Express Route)

**Location**: `routes/globalcert.js`

**Endpoint**: `GET /globalcert/processcert-coc?job=<job>&selectedIndices=<indices>`

**Implementation**:

```javascript
execFile(cscript32, args, { windowsHide: true }, (err, stdout, stderr) => {
  // Parse stdout as JSON and return to frontend
});
```

### globalcert.mjs (Frontend)

**Location**: `public/js/globalcert.mjs`

**Functions**:

1. `handleInventorySubmit()`: Step 1 fetch and display
2. `handleGenerateCert()`: Step 3 fetch and CoC table display

**Field Names** (camelCase):

- `dateHistory` (not DATE_HISTORY)
- `timeItemHistory` (not INV_HIST_TIME)
- `part`, `quantity`, `job`, `suffix` (lowercase)

---

## Prohibited Behavior

The following MUST NOT be implemented:

- Recursive chain-of-custody logic
- Multi-level upstream traversal
- Full certificate generation or formatting
- Use of INVENTORY_HIST table
- Step 4 or higher logic
- Complex JSON schemas or templates

---

## Testing

**Test Case**: Job 122166

**Step 1 Result**: 3 J52 transactions found

```
Index 0: 241210 | 15334732 | 521572... | qty 46 | 122166-000
Index 1: 250512 | 16072637 | 521572... | qty 64 | 122166-001
Index 2: 250513 | 15524733 | 521572... | qty 4  | 122166-000
```

**Step 3 Result** (indices 0,1,2 selected): 3 CoC entries

- Entry 0: Parent 122166-000 → Child 122166-000 (FINALI operation)
- Entry 1: Parent 122166-001 → Child 122166-001 (FINALI operation)
- Entry 2: Parent 122166-000 → Child 122166-000 (WIPMRK operation)

---

## Summary

This document specifies:

- **What**: Steps 1–3 of CoC extraction using ITEM_HISTORY
- **Why**: ITEM_HISTORY has SERIAL_NUMBER for child job resolution
- **How**: processcert-coc.vbs (VBScript) + /processcert-coc endpoint + globalcert.mjs (frontend)
- **Output**: Structured JSON with parent/child/material relationships

It does not define: Multi-level recursion, full certificates, or advanced formatting.
