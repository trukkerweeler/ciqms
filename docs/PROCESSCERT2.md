# PROCESS CERTIFICATE (processcert)

## Mental Model (Updated With Key Learnings)

## **Step 1 — Get & Display Parent J52 Transactions**

Query all **J52** transactions for the selected work order from `ITEM_HISTORY`.

These represent **completion events** for the parent job.

## **Step 2 — User Selects Parent Transaction**

When the user picks a specific J52:

Store:

- `parentJob`
- `parentSuffix`
- `parentDate`
- `parentTime`
- `parentDateTime` (combined timestamp)

This timestamp becomes the **cutoff** for all upstream genealogy.

## **Step 3 — Recursively Identify Child Jobs via SERIAL_NUMBER**

For each J55/J26/J52 row whose `SERIAL_NUMBER` references another job:

- Extract `childJob`
- Extract `childSuffix`
- Add to the dependency tree

This builds the **multi‑level job hierarchy**.

## **Step 4 — Get All J52s for Each Child Job, Then Apply Timestamp Cutoff**

For each child job:

1. Retrieve **all** J52 transactions
2. Keep only those where: `childDateTime <= parentDateTime`

This ensures you only include work completed **before** the parent's completion.

## **Step 5 — Select the Correct Child J52**

For each child job, select:

```
MAX(childDateTime) WHERE childDateTime <= parentDateTime
```

This gives you:

- the correct child completion event
- the correct quantity
- the correct timestamp
- the correct cutoff for operations & materials

This is the **canonical child node**.

## **Step 6 — Determine Consumed vs. Remaining Parts**

Compare:

- the child job's **original quantity**
- the quantity on the selected J52

Parts not included in the selected J52 are either:

- consumed earlier (check earlier J52/J55/J10 rows), or
- still in inventory (include in cert with notation)

## **Step 7 — Recurse Deeper**

For each child job that passed the cutoff:

- follow its `SERIAL_NUMBER` references
- find its children
- apply Steps 3–6 recursively

This builds the full **multi‑level genealogy**.

---

# 🔥 **New Critical Learnings Integrated Into the Model**

These are the structural rules your engine must follow.

## **A — JOB_DETAIL and JOB_HIST_DTL are labor tables (ignore for CoC)**

They contain:

- employee
- hours
- scrap reasons
- machine time

They do **not** contain operation definitions.

**Never use these tables for genealogy.**

## **B — JOB_OPERATIONS is the active operations table**

Use this when the job is still active.

Contains:

- `SEQ` (operation sequence)
- `OPERATION`
- `DESCRIPTION`
- `UNITS_COMPLETE`
- `DATE_COMPLETED`

## **C — JOB_HIST_OPS is the archived operations table**

This is the archived equivalent of `JOB_OPERATIONS`.

Use this when the job is closed/archived.

Contains:

- `SEQ`
- `OPERATION`
- `DESCRIPTION`
- `UNITS_COMPLETE`
- `UNITS_SCRAP`
- `DATE_COMPLETED`

## **D — Archived jobs often collapse the final operation into SEQ = 999999**

This is Global Shop's internal convention for:

> **Final WIP transfer / job completion event**

Example:

- `operation_seq = 999999`
- `operation_description = PARTS TRANSFERED FROM WIP`

This is correct and expected.

## **E — Correct Operation Lookup Logic**

For each J52 (parent or child):

### 1. Try active operations

`JOB_OPERATIONS`

### 2. If no rows, try archived operations

`JOB_HIST_OPS`

### 3. If still no rows, fallback to part router

`ROUTER_LINE`

This is the exact logic Global Shop uses internally.

## **F — ITEM_HISTORY is always the source of truth for J52/J55/J10**

Operations and materials attach to the J52 via:

- timestamp
- job/suffix
- fallback logic above

---

# 🔧 **Implementation Notes (processcert.js + VBS)**

## Credential Passing to VBScript

Node.js loads `.env` at startup via `--env-file=.env`. The VBS files **do not re-parse `.env`** — instead, Node passes credentials directly as child process environment variables:

```js
env: {
  ...process.env,
  CIQMS_GLOBAL_DSN: process.env.GLOBAL_DSN,
  CIQMS_GLOBAL_UID: process.env.GLOBAL_UID,
  CIQMS_GLOBAL_PWD: process.env.GLOBAL_PWD,
}
```

VBS reads them with:

```vb
dsn = WshShell.ExpandEnvironmentStrings("%CIQMS_GLOBAL_DSN%")
```

Fallback to `.env` file parsing only triggers if the env var expands back to the literal `%CIQMS_GLOBAL_DSN%` (i.e., not set).

## NON_CERT_OPS Filter

Operations matching these descriptions are excluded from cert output (checked against both the base op and any sub-operation description):

```
MISCELLANEOUS OUTSIDE
MISC OUTSIDE
MISCELLANEOUS
PASSIVATE TO PRINT
PARTS TRANSFERRED FROM WIP
PARTS TRANSFERED FROM WIP   ← intentional misspelling (Global Shop data)
```

Operations with no usable process name AND no key are also skipped silently.

## PO Reference Lookup (`poBySeq`)

`JOB_DETAIL` / `JOB_HIST_DTL` are queried for rows with `LMO='O'` to extract PO numbers (`REFERENCE` column).

The lookup map `poBySeq` is keyed by **both** the exact SEQ **and** the base-hundred SEQ (e.g., SEQ 1250 → also stored under key 1200). This handles cases where Global Shop stores the PO against a sub-operation sequence that doesn't match the base operation sequence in `JOB_HIST_OPS`.

## Orphan Sub-Operation Handling

If a sub-operation row (e.g., SEQ 1250) has no corresponding base operation in `JOB_HIST_OPS`, it is promoted as an outside processing entry directly, with its PO reference, rather than being dropped.

## Child Job Second-Pass Logic

`extractChildJobsFromItemHistory` uses a two-pass approach:

1. **First pass**: collects children whose J55 timestamp falls in the `(prevTs, parentTs]` window
2. **Second pass**: adds children found only before `prevTs` that weren't picked up in the first pass (handles older-but-unique child jobs)

## Part Description

`JOB_HEADER` is queried for `PART` and `PART_DESCRIPTION` for each job/suffix. These are forwarded through the API response and displayed in:

- Each cert table row (smaller subtext below the part number)
- The cert info table header area (`PART — DESCRIPTION` format)

## Deployment Notes

- App runs as NSSM service on `FS1.CI.local`, port 3004
- Logs: `C:\NodeApps\ciqms\logs\stdout.log` / `stderr.log`
- The `.env` file lives at `C:\NodeApps\ciqms\.env` — not in a user Documents folder
- `deploy.ps1` does NOT copy `.env` (intentional — credentials stay on server)

---

# 📋 **SQL Rules & Query Patterns**

## SUFFIX Must Be Quoted

SUFFIX is a TEXT field in Pervasive SQL — it MUST be single-quoted in WHERE clauses:

- ✅ `WHERE SUFFIX = '001'`
- ❌ `WHERE SUFFIX = 001` (treats as numeric, won't match)

## SEQ Filter

Exclude Global Shop internal sequence numbers:

```sql
AND SEQ < 990000
```

SEQ 999999 = "PARTS TRANSFERED FROM WIP" (job completion marker) — always excluded by this filter.

## SERIAL_NUMBER Validation Pattern

A valid child job reference must be exactly: 6 digits + dash + 3 digits.

```
122094-001  ✅
PO: 0041564  ❌
48X48        ❌
```

Always `Trim(Replace(SERIAL_NUMBER, Chr(0), ""))` before checking.

## Database Tables Used

| Table | Purpose |
|-------|---------|
| `ITEM_HISTORY` | J52 completion events, J55 material pulls |
| `JOB_OPERATIONS` | Active job operations |
| `JOB_HIST_OPS` | Archived job operations (closed jobs) |
| `JOB_DETAIL` | Outside processing PO references (active) |
| `JOB_HIST_DTL` | Outside processing PO references (archived) |
| `ROUTER_LINE` | Router descriptions, `PART_WC_OUTSIDE` flag |
| `JOB_HEADER` | Part number and part description |

---

# ✅ **Test Validation Checklist**

- SERIAL_NUMBER correctly trimmed (no null bytes, no extra whitespace)
- Job references properly validated (6-3 digit pattern)
- Recursion properly terminated (visitedJobs prevents cycles)
- Operations never collapsed or reordered
- Processing groups remain separate by DATE/TIME/SUFFIX
- All recursive levels included in output
- Operations filtered to SEQ < 990000
- Historical operations from JOB_HIST_OPS included
- SUFFIX field properly quoted in SQL queries
- PO numbers from JOB_DETAIL/JOB_HIST_DTL (LMO='O') correctly mapped
- NON_CERT_OPS filtered from output
- `LABOR INPUT` serialNumber values rendered as empty
- `PO: ` prefix stripped from serialNumber values on display
