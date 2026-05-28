# Global Shop Database Schema

## 1. Overview

This document describes the generic data architecture for the manufacturing and inventory system.
It includes:

- Table purposes
- Key fields
- Relationships
- Data flows
- Routing flows
- Job flows
- Material flows
- Labor flows
- Notes on date/time fields (all stored as strings)
- A complete ERD diagram

This document is not tied to any specific business process (e.g., CoC).
It is a system‑level reference for developers, analysts, and integrators.

## 2. Date & Time Field Conventions (Critical)

Across all tables in this system:

- All date and time fields are stored as strings.
- Formats may include:
  - YYMMDD
  - YYYYMMDD
  - MMDDYY
  - 0, 000000, 00000000
  - Shop‑calendar encodings

These fields are NOT true dates.
They must be interpreted by the application.

This applies to:

- DATE_HISTORY, INV_HIST_TIME
- TIME_ITEM_HISTORY
- DATE_START, DATE_DUE, DATE_COMPLETED
- DATE_OPENED, DATE_CLOSED
- DATE_SEQUENCE, DATE_LAST_CHG
- All router dates
- All job dates

## 3. Table Reference (By Functional Area)

### 3.1 INVENTORY_HIST

**Purpose**

Records all inventory movements, including:

- Receipts (P10, P11)
- Issues (J55, J52)
- Adjustments (A10, A50)
- Expirations
- Cycle counts
- Bin transfers

**Key Fields**

- PART
- LOCATION
- DATE_HISTORY (string)
- INV_HIST_TIME (string)
- CODE_TRANSACTION
- QUANTITY
- OLD_ONHAND, NEW_ONHAND
- VENDOR_NO
- GL_ACCOUNT
- JOB, SUFFIX
- PROGRAM_A
- USERID

**Notes**

- DATE_HISTORY + INV_HIST_TIME is the unique transaction identifier.
- No operation sequence is stored here.

### 3.2 ITEM_HISTORY

**Purpose**

Records work order transactions, including:

- Material issues
- Labor postings
- PO receipts to jobs
- Adjustments
- Scrap
- Completions
- Lot/heat/serial tracking

**Key Fields**

- PART
- LOCATION
- DATE_HISTORY (string)
- TIME_ITEM_HISTORY (string)
- JOB, SUFFIX
- SEQUENCE (operation sequence)
- LOT, BIN, HEAT, SERIAL_NUMBER
- CODE_TRANSACTION
- REFERENCE
- QUANTITY
- COST
- PROGRAM_USED
- USERID

**Notes**

- Timestamps do not align with INVENTORY_HIST.
- SEQUENCE links to JOB_OPERATIONS.

### 3.3 JOB_OPERATIONS

**Purpose**

Defines the instantiated routing steps for a job.

**Key Fields**

- JOB, SUFFIX
- SEQ (operation sequence)
- OPERATION
- LMO
- DESCRIPTION
- ROUTER, ROUTER_SEQ
- DATE_START, DATE_DUE, DATE_COMPLETED (strings)
- UNITS_COMPLETE, UNITS_SCRAP
- HOURS_ESTIMATED, HOURS_ACTUAL

**Notes**

- SEQ links to ITEM_HISTORY.SEQUENCE.
- ROUTER + ROUTER_SEQ links to ROUTER_LINE.

### 3.4 ROUTER_LINE

**Purpose**

Defines the routing master for each router.

**Key Fields**

- ROUTER
- ROUTER_SUFFIX
- ROUTER_TYPE
- LINE_ROUTER
- LMO
- OPERATION
- DESC_RT_LINE
- RUN_TIME, SET_UP
- RATE
- PART_WC_OUTSIDE

**Notes**

- Static routing definition.
- Does not contain transactional data.

### 3.5 ROUTER_HEADER

**Purpose**

Defines the header information for a router.

**Key Fields**

- ROUTER
- ROUTER_SUFFIX
- ROUTER_TYPE
- DESCRIPTION_ROUTER
- SIMILAR
- PROD_LINE
- SCRAP
- CUSTOMER
- PART_CUSTOMER
- DRAWING_CUSTOMER
- DATE_CURRENT, DATE_PRIOR, DATE_ORIGINAL (strings)

**Notes**

- Provides router‑level metadata.
- Does not contain operation sequences.

### 3.6 JOB_HEADER

**Purpose**

Defines job‑level information, including:

- Part
- Customer
- Quantities
- Dates
- Pricing
- Comments
- Sales order linkage

**Key Fields**

- JOB, SUFFIX
- PART
- DESCRIPTION
- CUSTOMER
- CUSTOMER_PO
- QTY_ORDER, QTY_COMPLETED
- DATE_OPENED, DATE_DUE, DATE_CLOSED (strings)
- COMMENTS_1, COMMENTS_2
- DRAWING_CUSTOMER
- SALES_ORDER, SALES_ORDER_LINE

**Notes**

- Job‑level context only.
- No operation or transaction detail.

### 3.7 JOB_DETAIL

**Purpose**

Records labor and outside processing activity, including:

- Labor input
- Outside processing
- Scrap
- Completed pieces
- Employee
- Workcenter
- Hours
- Costs

**Key Fields**

- JOB, SUFFIX
- SEQ
- EMPLOYEE
- DESCRIPTION
- DEPT_WORKCENTER
- HOURS_WORKED
- PIECES_SCRAP, PIECES_COMPLTD
- AMOUNT_LABOR, AMT_OVERHEAD
- START_TIME, END_TIME, DATE_OUT (strings)

**Notes**

- Labor‑focused.
- Not used for material movement.

## 4. Data Flow Overview

This section describes how data moves through the system.

### 4.1 Material Flow

```
ROUTER_HEADER
      ↓
ROUTER_LINE
      ↓
JOB_OPERATIONS
      ↓
ITEM_HISTORY (material issues/receipts)
      ↓
INVENTORY_HIST (inventory movement)
```

### 4.2 Routing Flow

```
ROUTER_HEADER
      ↓
ROUTER_LINE
      ↓
JOB_OPERATIONS
```

### 4.3 Job Flow

```
JOB_HEADER
      ↓
JOB_OPERATIONS
      ↓
ITEM_HISTORY
      ↓
INVENTORY_HIST
```

### 4.4 Labor Flow

```
JOB_HEADER
      ↓
JOB_OPERATIONS
      ↓
JOB_DETAIL (labor/outsourcing)
```

## 5. ERD Diagram (ASCII)

```
                 +---------------------+
                 |    ROUTER_HEADER    |
                 +----------+----------+
                            |
                            |
                 +----------v----------+
                 |     ROUTER_LINE     |
                 +----------+----------+
                            |
                            |
                 +----------v----------+
                 |   JOB_OPERATIONS    |
                 +----------+----------+
                            |
            +---------------+----------------+
            |                                |
+-----------v-----------+         +-----------v-----------+
|     ITEM_HISTORY      |         |      JOB_DETAIL       |
+-----------+-----------+         +------------------------+
            |
            |
+-----------v-----------+
|    INVENTORY_HIST     |
+------------------------+

+------------------------+
|      JOB_HEADER        |
+------------------------+
```

## 6. Summary

This document provides a generic, system‑wide architecture reference for:

- Inventory movement
- Work order transactions
- Routing
- Job structure
- Labor activity

It includes:

- Table purposes
- Key fields
- Relationships
- Data flows
- Routing flows
- Job flows
