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
