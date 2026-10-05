# Overdue Job Lateness Report

The `/overdue-lateness.html` page reports open manufacturing jobs that still
have remaining quantity and compares each job's due date with a selectable
as-of date.

## Data source

The report uses the Global `JOB_HEADER` table through the standard 32-bit
VBScript bridge:

- `JOB` + `SUFFIX`: job identity
- `PART`, `CUSTOMER`: job context
- `SALES_ORDER`, `SALES_ORDER_LINE`: order linkage when populated
- `QTY_ORDER` and `QTY_COMPLETED`: remaining quantity
- `DATE_OPENED`, `DATE_DUE`, `DATE_CLOSED`: timing and open/closed status

A job is included when it has a usable due date, is not closed, and
`QTY_ORDER - QTY_COMPLETED` is greater than zero. `daysOverdue` is calculated
in Node.js as the positive difference between the as-of date and `DATE_DUE`.

Global date values are strings. The route currently accepts the formats
documented in `globalschema.md`, including `MMDDYY` and `YYYYMMDD`.

## Deliberate limitation

The report currently uses the manufacturing job due date. It does not yet
join a customer promised date from the sales-order tables. That field can be
added later without changing the report's API or UI shape.
