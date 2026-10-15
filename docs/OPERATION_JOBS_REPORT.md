# Monthly Special Process Operations Report

The report page provides monthly completed-operation detail for Weld,
Passivation, and Chem Film / Alodine families.

## API

`GET /operation-jobs/operations-report?family=weld|passivation|chem-film&month=YYYY-MM&sort=asc|desc`

Examples:

- `/operation-jobs/operations-report?family=weld&month=2026-07`
- `/operation-jobs/operations-report?family=passivation&month=2026-07&sort=desc`
- `/operation-jobs/operations-report?family=chem-film&month=2026-07`

If `month` is omitted, the endpoint defaults to the previous calendar month.
If `family` is omitted, it defaults to Weld. The former
`/weld-operations-report` endpoint remains an alias.

## Operation Families

- Weld: `SPOTW`, `FUSION`
- Passivation: `PASST2`, `PASST6`, `PASSM2`, `PA16`, `PA11`, `PA12`, `PA17`,
  `PA18`, `PM26`
- Chem Film / Alodine: `DPSCC`, `DPSMC`, `FT1C1A`, `FT1C3`, `FT1C3A`, `FT2C1A`,
  `FT2C3`

## Report Behavior

- Reads active operations from `JOB_OPERATIONS` and archived operations from
  `JOB_HIST_OPS`.
- Filters by the selected family's operation codes and the requested calendar
  month using `[month start, next month start)`.
- Excludes internal transfer rows with `SEQ >= 990000`.
- Converts compact `DATE_COMPLETED` values to ISO dates in the API response.
- Sorts by completed date, then job, suffix, and sequence.
- Returns the included operation codes and summaries by day, operation, part,
  job-suffix, and customer.

Detailed rows include source table, job, suffix, sequence, operation,
description, completed date, part, customer, router, LMO, units complete, and
units scrap.

The VBScript data query is implemented in
[`../routes/operation-jobs-report.vbs`](../routes/operation-jobs-report.vbs).
