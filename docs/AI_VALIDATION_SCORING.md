# AI Validation Scoring - Shared Data Model

## Purpose

This document defines a shared storage model for AI scoring results across modules.

Primary targets:

- CORRECTIVE section scoring
- NCM (nonconformance) section scoring
- AUDIT MANAGER observation scoring

## Why a Shared Table

A single shared table avoids repeating AI columns across many business tables.

Benefits:

- Same shape for scoring data in all modules
- Easier reporting and dashboards
- Supports prompt/model version tracking
- Keeps module tables focused on business fields

## History Table

Table name: AI_VALIDATION_RESULT_HISTORY

One row = one scoring attempt/submission (append-only).

Use cases:

- Track revision evolution over time
- Measure score lift after AI feedback
- Compare prompt/model versions by outcome

## Proposed Table

Table name: AI_VALIDATION_RESULT

One row = latest score for one section on one record in one module.

Natural key:

- MODULE_TYPE
- RECORD_ID
- SECTION_TYPE

## Column Definitions

- VALIDATION_ID: surrogate primary key
- MODULE_TYPE: CORRECTIVE, NCM, MANAGER_OBS, etc.
- RECORD_ID: owning record identifier (string for flexibility)
- SECTION_TYPE: NC_TREND, CORRECTION, CAUSE, SYSTEMIC_REMEDY, RESPONSE, etc.
- SCORE: 0-100
- IS_VALID: 1 or 0
- ISSUES_JSON: JSON text array from model output
- SUMMARY: short scoring summary
- RECOMMENDED_FIX: suggested revision text
- PROMPT_NAME: logical prompt key (example: corrective_systemic_remedy)
- PROMPT_VERSION: prompt revision tag (example: v1)
- MODEL_ID: model used (example: amazon.nova-pro-v1:0)
- INPUT_HASH: optional SHA-256 hash of normalized input text
- RAW_RESPONSE_JSON: optional raw model response payload
- VALIDATION_STATUS: SUCCESS, SKIPPED, FAILED
- ERROR_MESSAGE: optional error text for failed attempts
- VALIDATED_BY: username/system id that triggered validation
- VALIDATED_AT: scoring timestamp
- CREATED_AT: row create timestamp
- UPDATED_AT: row update timestamp

## Current Module Mapping

CORRECTIVE:

- MODULE_TYPE: CORRECTIVE
- RECORD_ID: CORRECTIVE_ID
- SECTION_TYPE values:
  - NC_TREND
  - CORRECTION
  - CAUSE
  - SYSTEMIC_REMEDY

- Prompt names:
  - corrective_nc_trend
  - corrective_correction
  - corrective_cause
  - corrective_systemic_remedy

NCM:

- MODULE_TYPE: NCM
- RECORD_ID: NCM_ID
- SECTION_TYPE values:
  - DESCRIPTION
  - DISPOSITION
  - VERIFICATION

- Prompt names:
  - ncm_description
  - ncm_disposition
  - ncm_verification

MANAGER observation:

- MODULE_TYPE: MANAGER_OBS
- RECORD_ID: AUDIT_MANAGER_ID + ':' + CHECKLIST_ID
- SECTION_TYPE: OBSERVATION

## Write Pattern

Use upsert on unique key (MODULE_TYPE, RECORD_ID, SECTION_TYPE).

- Save latest scoring result in place
- Keep prompt metadata and timestamps updated

Runtime behavior:

- UI save flow calls validation endpoint first (AI run happens here)
- Save payload then includes AI_SECTION_TYPE and AI_VALIDATION
- Business data save and AI persistence are decoupled
- If AI persistence fails, business save still succeeds (non-blocking)

Current behavior:

- AI_VALIDATION_RESULT stores latest score by section (upsert)
- AI_VALIDATION_RESULT_HISTORY stores every scoring event (insert-only)

## Read Pattern

- Section detail page: read one row by MODULE_TYPE, RECORD_ID, SECTION_TYPE
- Record summary page: list rows by MODULE_TYPE + RECORD_ID
- Analytics: aggregate by MODULE_TYPE, SECTION_TYPE, prompt version, date range

## Rollout Plan

1. Create AI_VALIDATION_RESULT table and indexes. Completed.
2. Enable writes for CORRECTIVE. Completed.
3. Enable writes for NCM. Completed.
4. Migrate MANAGER observation scoring to shared table. Completed.
5. Add AI_VALIDATION_RESULT_HISTORY and write-on-each-submission. Completed.
6. Add optional read-only badges from DB on page load (no AI call on view). Pending.
