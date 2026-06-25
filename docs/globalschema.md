# Global Shop Schema (Working Reference)

A practical, minimal, LLM‑friendly schema map for reverse‑engineering the Global Shop database.
This document tracks only the tables we actually use and the relationships we have confirmed.

---

# 1. Date & Time Field Conventions

All date/time fields in Global Shop are stored as **strings**, not real dates.

Common formats:
- `YYYYMMDD`
- `YYMMDD`
- `MMDDYY`
- `00000000`, `000000`, `0`
- Shop‑calendar encodings

These must be interpreted manually.

---

# 2. Core Tables (By Workflow)

Below are the tables we actually use, grouped by real workflows.

---

## A. Inventory Movement Tables

### INVENTORY_HIST
**Purpose:**  
All inventory movements (issues, receipts, adjustments, scrap, cycle counts, transfers).

**Key Fields:**  
- PART  
- LOCATION  
- DATE_HISTORY  
- INV_HIST_TIME  
- CODE_TRANSACTION  
- QUANTITY  
- OLD_ONHAND  
- NEW_ONHAND  
- JOB  
- SUFFIX  
- GL_ACCOUNT  
- USERID  

**Notes:**  
- This is the **only** place inventory is relieved.  
- `DATE_HISTORY + INV_HIST_TIME` = unique transaction.

---

## B. Work Order / Job Transaction Tables

### ITEM_HISTORY
**Purpose:**  
Work order transactions: material issues, labor postings, PO receipts to jobs, completions, scrap.

**Key Fields:**  
- PART  
- JOB  
- SUFFIX  
- SEQUENCE  
- DATE_HISTORY  
- TIME_ITEM_HISTORY  
- CODE_TRANSACTION  
- QUANTITY  
- COST  
- LOT / BIN / HEAT / SERIAL  
- PROGRAM_USED  

**Notes:**  
- `SEQUENCE` links to `JOB_OPERATIONS.SEQ`.

---

### JOB_OPERATIONS
**Purpose:**  
Instantiated routing steps for a job.

**Key Fields:**  
- JOB  
- SUFFIX  
- SEQ  
- OPERATION  
- ROUTER  
- ROUTER_SEQ  
- DATE_START  
- DATE_DUE  
- DATE_COMPLETED  
- UNITS_COMPLETE  
- UNITS_SCRAP  

---

### JOB_HEADER
**Purpose:**  
Job‑level metadata: part, customer, quantities, dates, sales order linkage.

**Key Fields:**  
- JOB  
- SUFFIX  
- PART  
- CUSTOMER  
- CUSTOMER_PO  
- QTY_ORDER  
- QTY_COMPLETED  
- DATE_OPENED  
- DATE_DUE  
- DATE_CLOSED  
- SALES_ORDER  
- SALES_ORDER_LINE  

---

### JOB_DETAIL
**Purpose:**  
Labor and outside processing activity.

**Key Fields:**  
- JOB  
- SUFFIX  
- SEQ  
- EMPLOYEE  
- HOURS_WORKED  
- PIECES_SCRAP  
- PIECES_COMPLTD  
- AMOUNT_LABOR  
- AMT_OVERHEAD  

---

## C. Routing Tables

### ROUTER_HEADER
Routing master header.

### ROUTER_LINE
Routing operation definitions.

---

## D. Order / Shipment / Invoice Tables

### ORDER_HIST_HEAD  
*(This is the table you uploaded.)*

**Purpose:**  
Historical order + invoice header. Contains:

- Invoice number  
- Order number  
- Customer  
- Bill‑to / Ship‑to  
- Shipment date  
- Packlist number  
- Tracking number  
- Job linkage  
- Material/labor/overhead/outside/other costs  
- Currency  
- Terms  
- Flags (credit memo, DD250, tax, lump sum, etc.)

**Key Fields:**  
- INVOICE  
- ORDER_NO  
- ORDER_SUFFIX  
- CUSTOMER  
- CUSTOMER_PO  
- DATE_ORDER  
- DATE_INVOICE  
- DATE_SHIPPED  
- PCK_NO  
- TRACKING_NO  
- JOB  
- SUFFIX  
- COST_MATERIAL  
- COST_LABOR  
- COST_OUTSIDE  
- COST_OVERHEAD  
- COST_OTHER  
- LOCATION_JOB  
- PRODUCT_CODE  

**Notes:**  
- This is **not** inventory.  
- This is **not** shipment detail.  
- This is the **order/invoice header** that ties AR → Order → Shipment.  
- `PCK_NO` is the key link to shipment tables → which link to `INVENTORY_HIST`.

---

# 3. Confirmed Linkage Paths

These are the actual data flows used to trace inventory consumption.

### 1. Invoice → Order
ORDER_HIST_HEAD.ORDER_NO → (SalesOrderHeader).ORDER_NO

Code

### 2. Order → Shipment
ORDER_HIST_HEAD.PCK_NO → (ShipmentHeader).PCK_NO

Code

### 3. Shipment → Inventory Issue
ShipmentDetail.PCK_NO → INVENTORY_HIST.PCK_NO
ShipmentDetail.PART → INVENTORY_HIST.PART

Code

### 4. Job → Inventory Issue
JOB_HEADER.JOB → INVENTORY_HIST.JOB

Code

### 5. Job → Work Order Transactions
JOB_OPERATIONS.SEQ → ITEM_HISTORY.SEQUENCE

Code

---

# 4. Data Flow Diagrams

### Material Flow
ITEM_HISTORY → INVENTORY_HIST

Code

### Order → Shipment → Inventory
ORDER_HIST_HEAD
↓ (ORDER_NO)
Shipment Header
↓ (PCK_NO)
Shipment Detail
↓
INVENTORY_HIST (issue)

Code

### Job Flow
JOB_HEADER
↓
JOB_OPERATIONS
↓
ITEM_HISTORY
↓
INVENTORY_HIST

Code
### ORD_HIST_LOT  
**Purpose:**  
Shipment detail at the *lot/serial/bin* level.  
This table represents the **actual shipped quantities**, broken down by:

- Order line  
- Lot  
- Bin  
- Heat  
- Serial number  
- Shipment sequence  
- Costs per unit (material, labor, overhead, outside, freight, other)

This is effectively the **shipment detail table** for Global Shop.

**Key Fields:**  
- INVOICE  
- ORDER_NO  
- ORDER_SUFFIX  
- ORDER_LINE  
- KEY_SEQ  
- LOT  
- BIN  
- HEAT  
- SERIAL  
- QTY_SHIPPED  
- DATE_SHIPPED  
- COST  
- JOB  
- SUFFIX  
- PART  
- LOCN  
- MATL_COST  
- LABOR_COST  
- OVHD_COST  
- OUTS_COST  
- FRGT_COST  
- OTH_COST  

**Notes:**  
- This table is the **shipment detail** that ties an invoice/order to the actual shipped parts.  
- `QTY_SHIPPED` and `DATE_SHIPPED` are authoritative for customer fulfillment.  
- `PART` + `LOCN` + `QTY_SHIPPED` map directly to inventory consumption.  
- `JOB` links back to job‑level production if the part was job‑built.  
- `KEY_SEQ` is the internal shipment sequence (ties to packlist).  
- This table is the bridge between **ORDER_HIST_HEAD** and **INVENTORY_HIST**.

**Critical Linkage:**  
ORD_HIST_LOT.ORDER_NO → ORDER_HIST_HEAD.ORDER_NO
ORD_HIST_LOT.INVOICE → ORDER_HIST_HEAD.INVOICE
ORD_HIST_LOT.DATE_SHIPPED → INVENTORY_HIST.DATE_HISTORY
ORD_HIST_LOT.PART → INVENTORY_HIST.PART
ORD_HIST_LOT.QTY_SHIPPED → INVENTORY_HIST.QUANTITY (issue)


**Interpretation:**  
ORD_HIST_LOT tells you *exactly what was shipped*, *from where*, *in what lot*, *at what cost*, and *on which invoice*.


---

# 5. Unknown Tables (To Be Filled In)

- Shipment Header table name  
- Shipment Detail table name  
- AR detail table  
- GL posting table  

---