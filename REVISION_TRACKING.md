# Certificate Revision Tracking Implementation

## Overview

Added edit and delete functionality to certificate sections with mandatory notes explaining changes. All revisions are tracked in the quality database.

## Database Changes

### New Table: CERT_REVISION

```sql
CREATE TABLE CERT_REVISION (
    WOREV_ID INT AUTO_INCREMENT PRIMARY KEY,
    WO_NO VARCHAR(50) NOT NULL,
    SECTION VARCHAR(50) NOT NULL,
    SERIAL_NUMBER VARCHAR(50),
    REVISION_TYPE ENUM('EDIT', 'DELETE') NOT NULL,
    ORIGINAL_DATA JSON,
    NOTES TEXT NOT NULL,
    CREATE_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CREATE_BY VARCHAR(100),
    INDEX idx_wo_no (WO_NO),
    INDEX idx_section (SECTION),
    INDEX idx_create_date (CREATE_DATE)
);
```

**Fields:**

- `WOREV_ID`: Unique incrementing identifier
- `WO_NO`: Work Order Number
- `SECTION`: Section name (RM, CHEM, SPOT, FUSION, HEAT, PAINT)
- `SERIAL_NUMBER`: Item serial number (optional)
- `REVISION_TYPE`: Either 'EDIT' or 'DELETE'
- `ORIGINAL_DATA`: JSON backup of the original row data
- `NOTES`: User-provided explanation for the change (mandatory)
- `CREATE_DATE`: Timestamp of the change
- `CREATE_BY`: Username of who made the change

## Frontend Changes

### cert.html

- Added two modal dialogs:
  - **Edit Dialog**: For editing certificate rows
  - **Delete Dialog**: For deleting certificate rows
- Both dialogs display:
  - Read-only section name and row data
  - **Mandatory textarea** for explaining the change/deletion

### cert.mjs

Added helper functions and event listeners:

1. **`openEditDialog(section, serialNumber, rowData)`**

   - Opens the edit dialog with current row data
   - User must enter a reason for the change

2. **`openDeleteDialog(section, serialNumber, rowData)`**

   - Opens the delete dialog with current row data
   - User must enter a reason for the deletion

3. **`saveRevision(type, notes)`**

   - POSTs to backend API with revision details
   - Includes user's mandatory notes
   - Displays revision ID upon success

4. **`createActionCell(section, serialNumber, rowData)`**

   - Creates a table cell with Edit and Delete buttons
   - Buttons trigger appropriate dialogs

5. **Table Updates**
   - Added "Actions" column header to all certificate tables
   - Added action buttons to all rows in:
     - RAW MATERIALS
     - CHEMICAL TREATMENT
     - FUSION WELDING
     - SPOT WELDING
     - HEAT TREATING

### Dialog Event Listeners

- Form submission validation (mandatory notes)
- Close button handlers
- Cancel button handlers
- JSON export of row data for backup

### styles.css

Added comprehensive CSS for dialogs:

- `.revision-dialog`: Modal dialog styling
- `.dialog-header`: Title bar with close button
- `.form-group`: Form field styling
- `.btn-primary`, `.btn-secondary`, `.btn-danger`: Button styling
- `.revision-actions`: Action cell layout
- `.btn-edit`, `.btn-delete`: Action button styling

## Backend Changes

### cert.js

Added two new API routes:

#### POST `/cert/revision/edit`

Saves edit revision to database

```javascript
{
  woNo: string,
  section: string,
  serialNumber: string,
  originalData: object,
  notes: string (mandatory)
}
```

Response: `{ success: true, revisionId: number }`

#### POST `/cert/revision/delete`

Saves delete revision to database

```javascript
{
  woNo: string,
  section: string,
  serialNumber: string,
  originalData: object,
  notes: string (mandatory)
}
```

Response: `{ success: true, revisionId: number }`

Both routes:

- Connect to quality database
- Accept username from `X-User` header
- Store complete row data as JSON backup
- Store user-provided notes
- Return revision ID on success

## User Workflow

1. User searches for a work order
2. Certificate sections display with "Actions" column
3. User clicks **Edit** button:
   - Edit dialog opens
   - Row data displayed (read-only)
   - User enters mandatory reason
   - Clicks "Save Changes"
   - Revision saved with ID displayed
4. User clicks **Delete** button:
   - Delete dialog opens
   - Row data displayed (read-only)
   - User enters mandatory reason
   - Clicks "Delete Row"
   - Revision saved with ID displayed

## Audit Trail

Every change is fully tracked:

- Which work order
- Which section (RM, CHEM, etc.)
- What was changed (original data preserved as JSON)
- Why it was changed (user-provided notes)
- When it was changed (timestamp)
- Who changed it (username)

## Future Enhancements

- Add revision history view/report
- Add ability to revert revisions
- Add approval workflow for significant changes
- Add impact analysis (e.g., which certificates were affected)
