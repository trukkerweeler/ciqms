# Overdue Job Lateness Report

The `/overdue-lateness.html` page reports a current-date snapshot of
manufacturing jobs that still have remaining quantity and compares each job's
due date with the snapshot date.

## Data source

The report uses the Global `JOB_HEADER` table through the standard 32-bit
VBScript bridge:

- `JOB` + `SUFFIX`: job identity
- `PART`, `CUSTOMER`: job context
- `SALES_ORDER`, `SALES_ORDER_LINE`: order linkage when populated
- `QTY_ORDER` and `QTY_COMPLETED`: remaining quantity
- `DATE_OPENED`, `DATE_DUE`, `DATE_CLOSED`: timing and open/closed status

A job is included when it has a usable due date and was not closed on or before
the snapshot date. Jobs closed after that date are included as open for the
report, even if their current remaining quantity is zero. `daysOverdue` is
calculated in Node.js as the positive difference between the snapshot date and
`DATE_DUE`.

Quantities come from the current `JOB_HEADER` snapshot; the report cannot
reconstruct historical quantities for jobs that were later completed.

Global date values are strings. The route currently accepts the formats
documented in `globalschema.md`, including `MMDDYY` and `YYYYMMDD`.

## Deliberate limitation

The report currently uses the manufacturing job due date. It does not yet
join a customer promised date from the sales-order tables. That field can be
added later without changing the report's API or UI shape.
