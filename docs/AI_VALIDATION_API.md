# AI Validation API Contract

## Scope

This document defines validation and persistence behavior for:

- Corrective Action section scoring
- Nonconformance section scoring

Persistence target table:

- AI_VALIDATION_RESULT

## Corrective Endpoints

### POST /corrective/validate-section

Purpose:

- Validate section text with section-specific AI prompt.

Request body:

- sectionType: NC_TREND | CORRECTION | CAUSE | SYSTEMIC_REMEDY
- text: string

Responses:

- 200 { validation: <object> }
- 200 { validation: null, skipped: true, reason: "empty_text" }
- 400 { error: "Invalid sectionType..." }
- 200 { validation: null, error: "validation_failed" }

### PUT /corrective/:id

Purpose:

- Save corrective business data.
- Persist AI score when AI payload is provided.

AI fields expected in request when scoring is active:

- AI_SECTION_TYPE
- AI_VALIDATION
- AI_PROMPT_VERSION
- AI_MODEL_ID

Persistence mapping:

- MODULE_TYPE: CORRECTIVE
- RECORD_ID: CORRECTIVE_ID
- SECTION_TYPE: AI_SECTION_TYPE

Prompt name mapping:

- NC_TREND -> corrective_nc_trend
- CORRECTION -> corrective_correction
- CAUSE -> corrective_cause
- SYSTEMIC_REMEDY -> corrective_systemic_remedy

## NCM Endpoints

### POST /ncm/validate-section

Purpose:

- Validate NCM section text with section-specific AI prompt.

Request body:

- sectionType: DESCRIPTION | DISPOSITION | VERIFICATION
- text: string

Responses:

- 200 { validation: <object> }
- 200 { validation: null, skipped: true, reason: "empty_text" }
- 400 { error: "Invalid sectionType..." }
- 200 { validation: null, error: "validation_failed" }

### PUT /ncm/:id

Purpose:

- Save NCM text section updates.
- Persist AI score when AI payload is provided.

AI fields expected in request when scoring is active:

- AI_SECTION_TYPE
- AI_VALIDATION
- AI_PROMPT_VERSION
- AI_MODEL_ID

Persistence mapping:

- MODULE_TYPE: NCM
- RECORD_ID: NCM_ID
- SECTION_TYPE: AI_SECTION_TYPE

Prompt name mapping:

- DESCRIPTION -> ncm_description
- DISPOSITION -> ncm_disposition
- VERIFICATION -> ncm_verification

## Persistence Behavior

Storage helper:

- services/aiValidationStore.js persistAiValidationResult()

Upsert key:

- MODULE_TYPE + RECORD_ID + SECTION_TYPE

Stored value group:

- score/is_valid/issues_json/summary/recommended_fix
- prompt_name/prompt_version/model_id
- validated_by/validated_at
- validation_status/error_message

## Operational Notes

- AI validation can be disabled with AI_VALIDATION=off.
- Save flow validates first, then saves business data, then persists AI result.
- AI persistence failures are non-blocking; business save still returns success.
- Current review dialog badges use the fresh validation response, not a DB read.
