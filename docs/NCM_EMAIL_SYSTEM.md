# NCM Email System

This document tracks NCM module email behavior and follow-up work.

## TODO

- [ ] Add a retry failed queue for NCM email sends.
  - Scope: queue records where `EMAIL_STATUS = FAILED`.
  - Behavior: background/manual retry using last known payload.
  - Tracking: update `EMAIL_HISTORY` with retry attempt count, retry timestamp, and final status.
