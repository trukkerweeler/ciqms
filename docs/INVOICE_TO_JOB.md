# Invoice to Job — Table Relationship Chain

Traces the path from an AR invoice down to the manufacturing job that produced the shipped parts.

```
┌──────────────────────────┐
│      AR_OPEN_ITEMS       │   ← Invoice Header
│──────────────────────────│
│ INVOICE                  │
│ CUSTOMER                 │
│ ORDER_NO                 │
│ ORDER_SUFFIX             │
│ PCK_NO   (packlist)      │
└─────────────┬────────────┘
              │ 1-to-many
              │
              ▼
┌──────────────────────────┐
│      ORDER_BOOKING       │   ← Sales Order Lines
│──────────────────────────│
│ ORDER_NO                 │
│ ORDER_LINE               │
│ PART                     │
│ QTY                      │
│ CUSTOMER                 │
└─────────────┬────────────┘
              │ 1-to-many
              │
              ▼
┌──────────────────────────┐
│       ORDER_LINES        │   ← Shipment Detail (REAL)
│──────────────────────────│
│ ORDER_NO                 │
│ INVOICE                  │  (= PCK_NO)
│ PCK_NO                   │
│ DATE_SHIP                │
│ PART                     │
│ QTY_SHIPPED              │
│ JOB                      │
│ SUFFIX                   │
└─────────────┬────────────┘
              │ many-to-one
              │
              ▼
┌──────────────────────────┐
│       JOB_HEADER         │   ← Job Master
│──────────────────────────│
│ JOB                      │
│ SUFFIX                   │
│ PART                     │
│ STATUS                   │
└──────────────────────────┘
```

## Join Path

```sql
AR_OPEN_ITEMS
  JOIN ORDER_LINES  ON ORDER_LINES.ORDER_NO = AR_OPEN_ITEMS.ORDER_NO
                   AND ORDER_LINES.PCK_NO   = AR_OPEN_ITEMS.PCK_NO
  JOIN JOB_HEADER   ON JOB_HEADER.JOB       = ORDER_LINES.JOB
                   AND JOB_HEADER.SUFFIX     = ORDER_LINES.SUFFIX
```

## Notes

- `AR_OPEN_ITEMS.PCK_NO` is the packlist number; it equals `ORDER_LINES.INVOICE` (and `ORDER_LINES.PCK_NO`).
- `ORDER_BOOKING` holds the original sales order quantities; `ORDER_LINES` holds actual shipment records.
- A single invoice (`PCK_NO`) may span multiple `ORDER_LINES` rows (multiple parts/jobs per shipment).
- `JOB_HEADER` is keyed on `JOB` + `SUFFIX` — both columns are required for a unique job lookup.
