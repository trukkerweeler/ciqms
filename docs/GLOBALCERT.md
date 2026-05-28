GlobalCert — Minimal Chain‑of‑Custody Engine (Steps 1–3 Only)
This document defines the limited, stable subset of the GlobalCert logic used for:

Fetching inventory transactions

Selecting which transactions to include

Building the first‑level chain‑of‑custody links

Everything else is removed.

Step 1 — Fetch Inventory Transactions
Purpose:  
Identify the downstream completions for a given job.
This step is suffix‑agnostic — all suffixes belonging to the job must be included.

These are the J52 transactions representing parts transferred from WIP into inventory.

Inputs:

JOB (6 digits)

SUFFIX (3 digits)

Required Behavior:

Query ITEM_HISTORY for rows matching:

JOB = <job>

SUFFIX = <suffix>

CODE_TRANSACTION = 'J52'

Sort results by:

DATE_HISTORY

TIME_ITEM_HISTORY

Return the following fields:

DATE_HISTORY

TIME_ITEM_HISTORY

PART

QUANTITY

JOB

SUFFIX

SERIAL_NUMBER (reference to upstream job)

Notes:

These rows represent the processing lots available for certification.

No recursion or upstream logic occurs in Step 1.

Step 2 — Select Transactions
Purpose:  
Allow the user to choose which J52 completions from Step 1 should be included in the certificate.

Required Behavior:

Present the list of J52 transactions from Step 1.

Allow multi‑selection.

Pass the selected rows into Step 3.

Notes:

No chain‑of‑custody logic occurs here.

No recursion.

No certificate formatting.

This step is purely user selection.

Step 3 — Build Initial Chain‑of‑Custody Links
Purpose:  
For each selected J52 transaction, identify the immediate upstream job(s) and their associated material pulls.

This step builds the first level of the chain of custody.

Required Behavior:  
For each selected J52 transaction:

Use SERIAL_NUMBER to identify the child job.

Match the child job’s J52 completion using:

SERIAL_NUMBER

DATE_HISTORY

TIME_ITEM_HISTORY

Load the child job header (JOB_HEADER).

Load the child job’s J52 rows (its own completions).

Load the child job’s material pulls:

J55 (material issue)

J50 (lot issue)

J51 (heat/lot issue)

Stop here.

No recursion beyond one level.

Do not attempt to trace the child job’s children.

Do not generate a full certificate.

Output of Step 3:  
A structured set of relationships:

Parent job → selected J52 transaction

Child job → matching J52 completion

Child job → material pulls (J55/J50/J51)

This is the minimal chain‑of‑custody required for ProcessCert.

Prohibited Behavior
The following MUST NOT be used, referenced, or implemented:

Recursive chain‑of‑custody logic

Multi‑level upstream traversal

Full certificate generation

Formatting, templates, or output rules

JSON schemas

Experimental or draft sections

“Fix later” notes

Any logic beyond the first‑level CoC

Any Step 4+ behavior

These sections are considered deprecated and removed.

Scope of This File
This minimal version defines:

The data extraction

The selection logic

The first‑level CoC linking

It does not define:

Full certificate generation

Multi‑level recursion

Output formatting

Validation rules

UI behavior

Any Step 4+ logic

Those will be defined separately.