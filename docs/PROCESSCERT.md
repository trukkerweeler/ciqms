# PROCESS CERTIFICATE (processcert)

## Authoritative Specification for Haiku

This document defines the complete rules, data requirements, and recursion
model for generating a multi-level Process Certificate (processcert) from
a single JOB input. All steps MUST be followed exactly. No simplification,
collapsing, or reordering is permitted.

The processcert logic mirrors materialcert recursion, but the payload is
process‑centric: operations, router descriptions, outside processing flags,
and PO references.

=====================================================================
GLOBAL RULES
=====================================================================

1. SERIAL_NUMBER must always be trimmed:
   Trim(Replace(SERIAL_NUMBER, Chr(0), ""))

2. A valid job reference MUST match:
   - 6 digits
   - a dash
   - 3 digits
     Example: 122094-001

   Do NOT use strict regex. Instead:
   - Ensure the string contains a dash
   - Ensure the part before the dash is 6 digits
   - Ensure the part after the dash is 3 digits

3. Do NOT recurse into:
   - PO numbers (e.g., "PO: 0041564")
   - Heat lots (e.g., "48X48")
   - Vendor lots (e.g., "41727")
   - Blank or NULL SERIAL_NUMBER
   - Any SERIAL_NUMBER that does not match the job pattern

4. Maintain a visitedJobs list to prevent infinite loops.

5. All recursion MUST be suffix‑specific:
   - Top‑level Step 1 is job‑wide
   - Recursive Step 1 MUST use JOB + SUFFIX only

=====================================================================
STEP 1 — DOWNSTREAM COMPLETIONS (ITEM_HISTORY J52)
=====================================================================

Top‑level Step 1 MUST:

- Query ITEM_HISTORY for all J52 rows for the given JOB.
- NOT filter by suffix.
- Extract:
  DATE_HISTORY
  TIME_ITEM_HISTORY
  QUANTITY
  JOB
  SUFFIX
  PART
  SERIAL_NUMBER (trimmed)

Group rows by:

- DATE_HISTORY
- TIME_ITEM_HISTORY
- SUFFIX

Each group becomes a downstream processing lot and MUST remain separate.

Recursive Step 1 MUST:

- Query ITEM_HISTORY J52 rows where:
  JOB = childJob
  AND SUFFIX = childSuffix
- NEVER load J52 rows for other suffixes of that job.

=====================================================================
STEP 2 — PROCESS TRACE DISCOVERY
=====================================================================

For the given JOB (all suffixes):

- Query JOB_OPERATIONS for all operations with LMO in ('L','O').
- Extract:
  SEQ
  OPERATION
  ROUTER
  ROUTER_SEQ
  DATE_COMPLETED

- Join ROUTER_LINE on ROUTER + ROUTER_SEQ:
  DESC_RT_LINE
  PART_WC_OUTSIDE

- If PART_WC_OUTSIDE = 'Y':
  Query JOB_DETAIL for matching OPERATION
  Extract REFERENCE (PO number)

**Important Query Rules**:

- **TEXT Fields Must Be Quoted**: SUFFIX is a TEXT field in Pervasive SQL. In WHERE clauses, it MUST be quoted:
  - Correct: `WHERE SUFFIX = '001'`
  - Incorrect: `WHERE SUFFIX = 001` (treats as numeric, won't match)

- **Historical Records**: Operations may be archived in JOB_HIST_DTL. Use UNION ALL to combine:
  1. Current: `SELECT * FROM JOB_OPERATIONS WHERE JOB = ? AND SUFFIX = '?'`
  2. Historical: `SELECT * FROM JOB_HIST_DTL WHERE JOB = ? AND SUFFIX = '?'`
     Map `CHARGE_DATE` (history) to `DATE_COMPLETED` (current) for consistent output.
     Map `REFERENCE` (history) to `SERIAL_NUMBER` output field.

- **Operation Sequence Filter**: Query only operations with `SEQ < 990000` to exclude setup/numbering operations:
  `WHERE JOB = ? AND SUFFIX = '?' AND SEQ < 990000`

**Additional Rules**:

- Do NOT filter by suffix.
- Do NOT collapse operations.
- Preserve SEQ order.
- You MUST return all operations for the job.

=====================================================================
STEP 3 — FIRST‑LEVEL CHILD JOB RESOLUTION
=====================================================================

For each selected Step 1 J52 row:

- Identify child job from SERIAL_NUMBER (trimmed)
- Load:
  • Child JOB_HEADER
  • Child J52 row (ITEM_HISTORY)
  • Child process operations (JOB_OPERATIONS + ROUTER_LINE + JOB_DETAIL)
  • Child material pulls (J55/J50/J51)
  • Parent operation (JOB_OPERATIONS) for parent job/suffix
  • Router line (ROUTER_LINE)
  • PO reference if PART_WC_OUTSIDE = 'Y'

Step 3 is NOT recursive.

=====================================================================
STEP 4 — CONTROLLED MULTI‑LEVEL RECURSION
=====================================================================

Recursion MUST ONLY run on Step 3 results for the J52 rows selected in Step 1.

For each material pull (J55/J50/J51):

- Trim SERIAL_NUMBER
- If SERIAL_NUMBER matches a job number (######-###):
  Treat it as a child job

      Run recursive Step 1 (suffix‑specific):
          JOB = childJob
          SUFFIX = childSuffix

      Run Step 3 on that job
      Append nested children
      Continue recursion until no more job references exist

Rules:

- Only recurse on J55/J50/J51 rows
- Only recurse when SERIAL_NUMBER looks like a job number
- Do NOT recurse on PO numbers, heat lots, vendor lots, or blanks
- Prevent infinite loops with visitedJobs
- NEVER use job‑wide Step 1 inside recursion

=====================================================================
STEP 5 — DOWNSTREAM PROCESS GROUPING
=====================================================================

Each downstream completion event becomes a processing group:

- DATE_HISTORY
- TIME_ITEM_HISTORY
- SUFFIX

Groups MUST remain separate.

=====================================================================
STEP 6 — FINAL PROCESSCERT OUTPUT STRUCTURE
=====================================================================

Return JSON:

```json
{
  "job": "<input job>",
  "part": "<part number from ITEM_HISTORY>",
  "downstream_groups": [
    {
      "processing_lot": "<JOB>-<SUFFIX>-<DATE>-<TIME>",
      "date": "<DATE_HISTORY>",
      "time": "<TIME_ITEM_HISTORY>",
      "quantity": "<QUANTITY>",
      "job": "<JOB>",
      "suffix": "<SUFFIX>",

      "process_operations": [
        {
          "seq": "<SEQ>",
          "operation": "<OPERATION>",
          "router_desc": "<DESC_RT_LINE>",
          "outside": "<true/false>",
          "po_number": "<PO or empty>"
        }
      ],

      "upstream_trace_chain": "<full recursive upstream structure>"
    }
  ]
}
```

Rules:

- You MUST populate process_operations for every job.
- You MUST populate upstream_trace_chain if upstream jobs exist.
- You MUST recurse until no valid job references remain.
- You MUST NOT merge downstream groups.
- You MUST NOT duplicate trace.
- You MUST NOT collapse operations.

=====================================================================
IMPLEMENTATION NOTES
=====================================================================

### Backend (processcert-detail.vbs)

**Steps to implement:**

1. **Step 1 (Top-level)**: Query J52 for all suffixes, group by DATE/TIME/SUFFIX
2. **Step 2**: Query JOB_OPERATIONS with UNION ALL to JOB_HIST_DTL (for archived operations)
   - Filter: `SEQ < 990000` to exclude setup operations
   - Quote SUFFIX in WHERE clause: `SUFFIX = '<value>'` (TEXT field requirement)
   - LEFT JOIN ITEM_HISTORY on (JOB, SUFFIX, SEQUENCE=SEQ)
   - Join ROUTER_LINE, optionally JOB_DETAIL
3. **Step 3**: For each selected J52, resolve child job, load child data
4. **Step 4**: Implement recursive function that:
   - Validates SERIAL_NUMBER format (6 digits - 3 digits)
   - Checks visitedJobs to prevent cycles
   - Runs recursive Step 1 for (childJob, childSuffix)
   - Runs Step 3 for child job
   - Collects all nested results
5. **Step 5**: Group results by DATE_HISTORY/TIME_ITEM_HISTORY/SUFFIX
6. **Step 6**: Build final JSON output with proper structure

**SQL Pattern for Step 2**:

Current + Historical operations use UNION ALL:

```sql
SELECT jo.JOB, jo.SUFFIX, jo.SEQ, jo.OPERATION, jo.DESCRIPTION, ih.SERIAL_NUMBER, ...
FROM JOB_OPERATIONS jo
LEFT JOIN ITEM_HISTORY ih ON ih.JOB = jo.JOB AND ih.SUFFIX = jo.SUFFIX AND ih.SEQUENCE = jo.SEQ
WHERE jo.JOB = <job> AND jo.SUFFIX = '<suffix>' AND jo.SEQ < 990000

UNION ALL

SELECT jh.JOB, jh.SUFFIX, jh.SEQ, '', jh.DESCRIPTION, jh.REFERENCE AS SERIAL_NUMBER, jh.CHARGE_DATE AS DATE_COMPLETED, ...
FROM JOB_HIST_DTL jh
WHERE jh.JOB = <job> AND jh.SUFFIX = '<suffix>' AND jh.SEQ < 990000
ORDER BY SEQ
```

Note:

- TEXT fields (SUFFIX) must use single quotes in WHERE clauses
- REFERENCE field from JOB_HIST_DTL maps to SERIAL_NUMBER output column

### Frontend (processcert.mjs & processcert.html)

**Responsibilities:**

1. Display Step 1 J52 transactions in table with checkboxes
2. Collect selected row indices
3. Call endpoint with selected indices
4. Implement recursive `buildNestedTrace()` function
5. Render hierarchical tree display of upstream trace chains
6. Display process operations for each job level

**Styling**:

- Table headers must use `color: #000` for contrast against dark backgrounds
- Ensure all table headings (`<th>`) have explicit black text color in CSS
- Apply print-friendly styles for `@media print` (preserve headers during pagination)

**Field Filtering**:

- If `serialNumber` equals `'LABOR INPUT'`, render as empty string (not displayed)
- If `serialNumber` starts with `'PO: '`, remove the prefix before rendering (e.g., "PO: 0041564" → "0041564")

### Express Router (processcert.js)

**Endpoints:**

- `GET /processcert/processcert-detail?job=<job>&selectedIndices=<indices>`
  - Calls processcert-detail.vbs
  - Returns complete Steps 1-6 output

### Database Tables Required

- ITEM_HISTORY (Step 1: J52 rows)
- JOB_OPERATIONS (Step 2: operations)
- ROUTER_LINE (Step 2: descriptions)
- JOB_DETAIL (Step 2: PO references)
- JOB_HEADER (Step 3: child job details)

=====================================================================
TESTING
=====================================================================

**Test Case**: Job 122094

**Expected**: Multi-level processing groups with recursive traces
showing all upstream jobs, their operations, and external processing details.

**Key Validation Points**:

1. SERIAL_NUMBER correctly trimmed (no null bytes, no extra whitespace)
2. Job references properly validated (6-3 digit pattern)
3. Recursion properly terminated (visitedJobs prevents cycles)
4. Operations never collapsed or reordered
5. Processing groups remain separate by DATE/TIME/SUFFIX
6. All recursive levels included in output
7. Operations filtered to SEQ < 990000
8. Historical operations from JOB_HIST_DTL included
9. SUFFIX field properly quoted in SQL queries
10. REFERENCE from JOB_HIST_DTL correctly mapped to serialNumber output
11. 'LABOR INPUT' serialNumber values rendered as empty
12. 'PO: ' prefix stripped from serialNumber values on display
