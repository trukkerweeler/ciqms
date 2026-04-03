# INPUT Email System Documentation

## Overview

The INPUT email system handles sending assignment notifications to users when action items are created or reassigned in the Quality Management System. The system integrates Nodemailer for SMTP email delivery and logs all email activity to a centralized `EMAIL_HISTORY` database table.

---

## System Architecture

### Components

1. **Frontend** (`public/js/input.mjs`)
   - Detects when an INPUT is assigned/reassigned
   - Constructs email data from INPUT record
   - Makes two HTTP calls: one to send email, one to log to database

2. **Backend Email Routes** (`routes/input.js`)
   - `/email` - Sends the actual email via Nodemailer
   - `/inputs_notify` - Logs email metadata to EMAIL_HISTORY table

3. **Database** (MySQL)
   - `PEOPLE_INPUT` - Main INPUT records
   - `PPL_INPT_TEXT` - INPUT description text
   - `EMAIL_HISTORY` - Centralized email audit log

---

## Frontend Flow

### Trigger: Assigning an INPUT

When a user edits an INPUT detail and changes the `ASSIGNED_TO` field:

```javascript
// Step 1: Detect assignment change
const currentAssignedTo = extractText(
  document.querySelector("#assignedto").textContent,
  13,
);
const newAssignedTo = data.ASSIGNED_TO;

if (
  currentAssignedTo !== newAssignedTo &&
  newAssignedTo &&
  newAssignedTo.trim()
) {
  // Steps 2-4 follow...
}
```

### Step 2: Fetch Fresh Record Data

```javascript
const recordResponse = await fetch(url);
const records = await recordResponse.json();
const rec = records[0];
```

Gets the complete INPUT record with:

- `INPUT_ID`
- `SUBJECT` (code)
- `DUE_DATE`
- `INPUT_TEXT` (description)

### Step 3: Build Email Data Object

```javascript
const emailData = {
  INPUT_ID: iid,
  SUBJECT: rec.SUBJECT || "",
  DUE_DATE: rec.DUE_DATE ? rec.DUE_DATE.slice(0, 10) : "",
  ASSIGNED_TO: newAssignedTo,
  INPUT_TEXT: rec.INPUT_TEXT || "",
  ASSIGNED_TO_EMAIL: userEmail,
};
```

**Data sources:**

- User email looked up from `users.mjs` mapping
- Fallback to `DEFAULT` email if not found

### Step 4: Send Email via POST /email

```javascript
const emailResponse = await fetch(`${apiUrls.input}email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(emailData),
});
```

### Step 5: Log to EMAIL_HISTORY via POST /inputs_notify

```javascript
const notifyResponse = await fetch(`${apiUrls.input}inputs_notify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    data: {
      INPUT_ID: iid,
      ASSIGNED_TO: newAssignedTo,
      RECIPIENT_EMAIL: userEmail,
      SUBJECT: emailData.SUBJECT,
      BODY: emailData.INPUT_TEXT,
      ACTION: "A", // A=ASSIGNMENT, C=CLOSEOUT, R=REQUEST
    },
  }),
});
```

---

## Backend Endpoints

### POST /email

**Purpose:** Send the actual email notification

**Request Body:**

```json
{
  "INPUT_ID": "0000001",
  "SUBJECT": "ABC",
  "DUE_DATE": "2026-04-15",
  "ASSIGNED_TO": "JSMITH",
  "INPUT_TEXT": "Description of action item",
  "ASSIGNED_TO_EMAIL": "jsmith@company.com"
}
```

**Email Construction:**

```
Subject: Action Item Notification: 0000001 - ABC

Body:
The following action item has been assigned.
Input Id: 0000001
Due Date: 2026-04-15
Assigned To: JSMITH
Description:
Description of action item

Please log in to the QMS system to view the details and take timely action.

If you have any questions, please contact the quality manager.
```

**SMTP Configuration:**

- Host: `process.env.SMTP_HOST`
- Port: `process.env.SMTP_PORT` (typically 587 or 465)
- Security: TLS with self-signed certificate support
- From: `process.env.SMTP_FROM`
- CC: `process.env.EMAIL_QM` or default `tim.kent@ci-aviation.com`

**Response:**

```json
{
  "success": true,
  "message": "Email sent successfully",
  "info": "SMTP server response"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message",
  "details": "Full error details"
}
```

---

### POST /inputs_notify

**Purpose:** Log email activity to EMAIL_HISTORY table

**Request Body:**

```json
{
  "data": {
    "INPUT_ID": "0000001",
    "ASSIGNED_TO": "JSMITH",
    "RECIPIENT_EMAIL": "jsmith@company.com",
    "SUBJECT": "ABC",
    "BODY": "Description of action item",
    "ACTION": "A" // A, C, R, or other
  }
}
```

**ACTION Mapping:**

- `A` → `ASSIGNMENT`
- `C` → `CLOSEOUT`
- `R` → `REQUEST`
- Other → Passed through as-is

**Database Insert:**

```sql
INSERT INTO EMAIL_HISTORY
  (APP_MODULE, APP_ID, ASSIGNED_TO, RECIPIENT_EMAIL, SENT_DATE, EMAIL_STATUS, EMAIL_TYPE, NOTES)
VALUES
  (?, ?, ?, ?, NOW(), ?, ?, ?)
```

**Stored Values:**
| Column | Value |
|--------|-------|
| `APP_MODULE` | `INPUT` |
| `APP_ID` | `INPUT_ID` from request |
| `ASSIGNED_TO` | Username receiving assignment |
| `RECIPIENT_EMAIL` | Email address that received the email |
| `SENT_DATE` | Current timestamp |
| `EMAIL_STATUS` | `SENT` |
| `EMAIL_TYPE` | Mapped from ACTION (ASSIGNMENT, CLOSEOUT, REQUEST) |
| `NOTES` | Full subject + body if available, else default message |

**Response:** HTTP 200 on success, 500 on error

---

## Database Schema

### EMAIL_HISTORY Table

```sql
CREATE TABLE EMAIL_HISTORY (
  EMAIL_ID INT AUTO_INCREMENT PRIMARY KEY,
  APP_MODULE VARCHAR(255),           -- INPUT, NCM, etc.
  APP_ID VARCHAR(255),               -- e.g., INPUT_ID value
  ASSIGNED_TO VARCHAR(255),          -- Username (e.g., JSMITH)
  RECIPIENT_EMAIL VARCHAR(255),      -- Actual email address
  SENT_DATE TIMESTAMP,               -- When email was sent
  EMAIL_STATUS VARCHAR(50),          -- SENT, FAILED, PENDING
  EMAIL_TYPE VARCHAR(50),            -- ASSIGNMENT, CLOSEOUT, REQUEST
  NOTES LONGTEXT,                    -- Full subject + body content
  CREATED_DATE TIMESTAMP DEFAULT NOW(),
  INDEX idx_app_module (APP_MODULE),
  INDEX idx_app_id (APP_ID),
  INDEX idx_assigned_to (ASSIGNED_TO),
  INDEX idx_sent_date (SENT_DATE)
);
```

---

## User Email Mapping

**Location:** `public/js/users.mjs`

Maps USERNAME to email addresses:

```javascript
const userEmails = {
  TKENT: "tim.kent@ci-aviation.com",
  JSMITH: "john.smith@ci-aviation.com",
  // ... more mappings
  DEFAULT: "default@ci-aviation.com",
};
```

**Lookup Logic:**

```javascript
const userEmail = userEmails[newAssignedTo] ?? userEmails["DEFAULT"];
```

If username not found in mapping, uses DEFAULT email.

---

## Environment Variables

Required in `.env`:

```bash
# SMTP Configuration
SMTP_HOST=mail.company.com
SMTP_PORT=587
SMTP_USER=qms@company.com
SMTP_PASS=password
SMTP_FROM=qms@company.com
EMAIL_QM=tim.kent@ci-aviation.com

# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=password
```

---

## Complete Workflow Sequence

```
1. User edits INPUT detail form
   ↓
2. User changes ASSIGNED_TO field
   ↓
3. User clicks Save button
   ↓
4. PUT /input/detail/:id updates database
   ↓
5. Frontend detects ASSIGNED_TO change
   ↓
6. Fetch fresh INPUT record from API
   ↓
7. Look up user email from users.mjs
   ↓
8. POST /input/email
   ├─ Nodemailer sends SMTP email
   └─ Returns success/error
   ↓
9. POST /input/inputs_notify
   ├─ Insert email metadata to EMAIL_HISTORY
   └─ Log recipient, subject, body
   ↓
10. Success notification to user
```

---

## Error Handling

### Email Send Failures

If `/email` endpoint returns error:

```javascript
if (!emailResponse.ok) {
  console.error("Email send failed with status:", emailResponse.status);
}
```

- Email is not sent
- EMAIL_HISTORY record may not be created
- No user notification (silent failure)

### Database Log Failures

If `/inputs_notify` endpoint returns 500:

```javascript
console.error("Error updating inputs_notify:", err);
```

- Email was already sent successfully
- EMAIL_HISTORY record not created
- Database connection error logged to console

---

## Recent Fixes (April 2, 2026)

### Issue: EMAIL_HISTORY Missing Email Content

**Problem:**

- Email was sent successfully (user received it)
- EMAIL_HISTORY table showed `RECIPIENT_EMAIL = NULL`
- `NOTES` field contained only generic "Input notification" message
- Subject and body were not preserved

**Root Cause:**

- Frontend only passed `INPUT_ID, ASSIGNED_TO, ACTION`
- Backend hardcoded `RECIPIENT_EMAIL` as NULL
- `NOTES` field used only ACTION type

**Solution:**

1. **Frontend** now passes:
   - `RECIPIENT_EMAIL` - The actual email address
   - `SUBJECT` - The INPUT subject code
   - `BODY` - The full INPUT description text

2. **Backend** now:
   - Captures all email fields from request
   - Inserts `RECIPIENT_EMAIL` into database
   - Formats `NOTES` as "Subject: X\n\nBody: Y" for full content preservation

**Result:**

- EMAIL_HISTORY now fully audits what was sent and to whom
- Recipient email address is captured
- Full email body is available for reference/disputes

---

## Testing Checklist

When modifying the email system:

- [ ] Verify SMTP connection with test credentials
- [ ] Test email delivery with real SMTP server
- [ ] Check EMAIL_HISTORY table for complete data
- [ ] Verify user email lookup with missing mappings (fallback to DEFAULT)
- [ ] Test ACTION type mapping (A, C, R)
- [ ] Verify CC to EMAIL_QM is working
- [ ] Check console logs for debug info
- [ ] Test with special characters in SUBJECT or INPUT_TEXT
- [ ] Verify NOTES field formats correctly
- [ ] Check timestamp accuracy in SENT_DATE

---

## Related Files

| File                                   | Purpose                        |
| -------------------------------------- | ------------------------------ |
| `routes/input.js`                      | Backend email endpoints        |
| `public/js/input.mjs`                  | Frontend email trigger logic   |
| `public/js/users.mjs`                  | User email mappings            |
| `.env`                                 | SMTP and database credentials  |
| `sql/migrate_notification_history.sql` | Legacy INPUTS_NOTIFY migration |

---

## Notes

- EMAIL_HISTORY is a centralized table used for all modules (INPUT, NCM, etc.)
- Legacy INPUTS_NOTIFY table has been archived
- System supports both direct payload and nested `data` property for flexibility
- BODY content is truncated if extreme length (LONGTEXT max ~4GB but recommend keeping under 65KB)
- Email delivery is synchronous; if SMTP is slow, user waits for response
