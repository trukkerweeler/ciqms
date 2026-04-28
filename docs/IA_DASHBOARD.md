# IA Dashboard – Minimal Page Spec

## Purpose
Provide a lightweight Internal Audit (IA) summary based solely on the normalized audit findings returned by `V_AUDIT_FINDINGS`. This page supports Management Review by showing finding counts, clause distribution, and repeat findings.

## Data Source
- `V_AUDIT_FINDINGS`

## Required Fields
- `SCHEDULED_DATE`
- `SUBJECT`
- `REFERENCE`
- `QUESTION`
- `OBSERVATION`
- `finding_type`
- `finding_code`

---

## Section 1 — Finding Counts
### Behavior
- Display total number of findings.
- Display counts by finding type:
  - CAR
  - OFI
  - DCR

### Data Rules
- Count distinct `finding_code` grouped by `finding_type`.

---

## Section 2 — Findings by Clause
### Behavior
- Display a table summarizing findings grouped by `REFERENCE`.
- Show:
  - Clause
  - Total findings
  - CAR count
  - OFI count
  - DCR count

### Data Rules
- Group by `REFERENCE`.
- Count findings by `finding_type`.

---

## Section 3 — Repeat Findings
### Behavior
- Identify clauses appearing in more than one audit.
- Display:
  - Clause
  - Number of occurrences
  - Number of distinct audit dates

### Data Rules
- A repeat finding is any `REFERENCE` appearing with more than one distinct `SCHEDULED_DATE`.

---

## Section 4 — Raw Findings Table
### Behavior
- Display a simple table of all findings returned by the view.
- Columns:
  - Scheduled Date
  - Subject
  - Reference
  - Finding Type
  - Finding Code
  - Observation (truncated if needed)

### Data Rules
- Sorted by `SCHEDULED_DATE` descending.

---

## Filters
- Year selector (default = current year)
- Subject filter (optional)
- Clause filter (optional)

---

## Page Behavior
- Read‑only.
- No create/edit/delete actions.
- All data loads server‑side.
- If no findings exist for the selected year, display:
  - “No IA findings available for the selected period.”
