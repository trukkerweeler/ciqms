# Corrective Email System

This document tracks Corrective module email behavior and follow-up work.

New corrective assignment emails resolve the assignee's address from `PEOPLE.WORK_EMAIL_ADDRESS`.
SMTP uses implicit TLS only on port 465; port 587 uses STARTTLS.

## TODO

- [ ] Add a retry failed queue for Corrective email sends.
  - Scope: queue records where `EMAIL_STATUS = FAILED`.
  - Behavior: background/manual retry using last known payload.
  - Tracking: update `EMAIL_HISTORY` with retry attempt count, retry timestamp, and final status.
