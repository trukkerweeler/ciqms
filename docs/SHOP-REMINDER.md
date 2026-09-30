# Job Operation Reminders

## Current Entry Point

The traveler lookup page is:

- Page: `/shop-reminder.html`
- API lookup: `POST /shop-reminder/operations`
- Backend: `routes/shop-reminder.js`

Enter a `JOB` and `SUFFIX`. The page returns the traveler operation number (`SEQ`) and operation code (`OPERATION`). Rows without an operation code are excluded.

## Traveler Reminder Display

`/shop-reminder.html` is read-only. Enter a `JOB` and `SUFFIX` to see traveler operations and their active reminders.

Reminder administration is handled on `/shop-reminders-op.html`.

## Planned Reminder Fields

At minimum, the reminder record should support:

- `JOBBER_ID` - unique reminder identifier
- `OPERATION_CODE` - the Global operation code
- `REMINDER_TEXT` - instruction shown to QA/Inspection users
- `REVISION` - reminder revision number
- `ACTIVE` - whether the reminder is currently shown
- `CREATE_BY`, `CREATE_DATE`
- `MODIFIED_BY`, `MODIFIED_DATE`

The page returns the latest active revision for each reminder. Multiple reminders can be attached to the same operation code.

## Shop Reminder Administration

The separate administration page is `/shop-reminders-op.html`. It supports:

- Filtering the latest reminder records by operation code
- Creating reminders
- Inline editing, which saves a new revision
- Soft deleting reminders by saving an inactive revision

The admin API is exposed through `routes/shop-reminder.js` under `/shop-reminder/reminders/admin` and `/shop-reminder/reminders/:jobberId`.

## Suggested Future Files

Implemented files and endpoints:

- `public/shop-reminder.html` - read-only traveler lookup and reminder display
- `public/js/shop-reminder.mjs` - traveler lookup and reminder display logic
- `public/css/shop-reminder.css` - traveler page styling
- `public/shop-reminders-op.html` - reminder administration page
- `public/js/shop-reminders-op.mjs` - filtered CRUD interface with inline editing
- `public/css/shop-reminders-op.css` - administration page styling
- `routes/shop-reminder.js` - reminder create, update, and lookup endpoints
- `sql/shop-reminder.sql` - quality database table and `SYSTEM_IDS` setup

Run `sql/shop-reminder.sql` against the `quality` database before saving the first reminder.
