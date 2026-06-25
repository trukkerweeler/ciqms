# Invoice to Job — Table Relationship Chain

Traces the path from a packing slip number down to the manufacturing jobs that produced the shipped parts.

---

## ✅ Working Implementation (processcert-packing-slip.vbs)

The chain that actually works in production uses `ORDER_HIST_LOT`:

```
ORDER_HIST_LOT
WHERE INVOICE = '046198'   ← packing slip number (6-digit, zero-padded text)
  → SERIAL field = "122480-000"  ← encodes job + suffix
  → parse: JOB = "122480", SUFFIX = "000"
```

### Key Facts

- `ORDER_HIST_LOT.INVOICE` stores the packing slip with **leading zeros** (e.g. `046198`, not `46198`)
- The **SERIAL** field encodes the job as `"NNNNNN-NNN"` (6-digit job, dash, 3-digit suffix)
- `JOB` and `SUFFIX` columns in `ORDER_HIST_LOT` are **blank** for shipped lines — always use SERIAL
- Packing slip numbers should be **padded to 6 digits** before querying: `padStart(6, '0')`

### VBScript Query

```sql
SELECT DISTINCT SERIAL FROM ORDER_HIST_LOT
WHERE RTRIM(LTRIM(INVOICE)) = '046198'
  AND SERIAL LIKE '______-___'
```

---

## ⚠️ Theoretical Chain (Not Used — Documented for Reference)

The schema documentation describes this chain, but it does **not** work reliably for process cert generation:

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
              ▼
┌──────────────────────────┐
│       ORDER_LINES        │   ← Shipment Detail
│──────────────────────────│
│ ORDER_NO                 │
│ INVOICE  (= packing slip)│   ← no PCK_NO column in actual table
│ DATE_SHIP                │
│ PART                     │
│ QTY_SHIPPED              │
│ JOB      ← BLANK for stock/non-job lines
│ SUFFIX   ← BLANK for stock/non-job lines
└─────────────┬────────────┘
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

### Why This Doesn't Work

- `ORDER_LINES` has **no `PCK_NO` column** — the field is `INVOICE`
- `ORDER_LINES.JOB` and `.SUFFIX` are **blank** for items shipped from stock (LINE_TYPE = 'S')
- `AR_OPEN_ITEMS.PCK_NO` stores the packing slip **without** leading zeros (e.g. `46187`), while `ORDER_LINES.INVOICE` stores it **with** leading zeros (`046187`) — the values don't match directly
- `ORDER_LINES.ORDER_NO` format does not match `AR_OPEN_ITEMS.ORDER_NO` in some cases

### Notes

- `ORDER_BOOKING` holds original sales order quantities (not used for cert generation)
- `JOB_HEADER` is keyed on `JOB` + `SUFFIX` — both required for unique lookup
