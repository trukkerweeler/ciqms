const mysql = require("mysql2/promise");
const { getAiValidationModelId } = require("./bedrockValidator");

function mapValidationToColumns(validation) {
  const score = validation?.score ?? null;
  const isValid =
    typeof validation?.is_valid === "boolean"
      ? validation.is_valid
        ? 1
        : 0
      : null;
  const issuesJson = validation?.issues
    ? JSON.stringify(validation.issues)
    : null;
  const summary = validation?.summary ?? null;
  const recommendedFix = validation?.recommended_fix ?? null;

  return {
    score,
    isValid,
    issuesJson,
    summary,
    recommendedFix,
  };
}

async function persistAiValidationResult({
  moduleType,
  recordId,
  sectionType,
  validation,
  promptName,
  promptVersion = "v1",
  modelId = getAiValidationModelId(),
  validatedBy = "SYSTEM",
  validationStatus = "SUCCESS",
  errorMessage = null,
}) {
  if (!moduleType || !recordId || !sectionType) {
    throw new Error("moduleType, recordId, and sectionType are required");
  }

  const { score, isValid, issuesJson, summary, recommendedFix } =
    mapValidationToColumns(validation);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  try {
    const query = `INSERT INTO AI_VALIDATION_RESULT (
      MODULE_TYPE,
      RECORD_ID,
      SECTION_TYPE,
      SCORE,
      IS_VALID,
      ISSUES_JSON,
      SUMMARY,
      RECOMMENDED_FIX,
      PROMPT_NAME,
      PROMPT_VERSION,
      MODEL_ID,
      VALIDATION_STATUS,
      ERROR_MESSAGE,
      VALIDATED_BY,
      VALIDATED_AT
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      SCORE = VALUES(SCORE),
      IS_VALID = VALUES(IS_VALID),
      ISSUES_JSON = VALUES(ISSUES_JSON),
      SUMMARY = VALUES(SUMMARY),
      RECOMMENDED_FIX = VALUES(RECOMMENDED_FIX),
      PROMPT_NAME = VALUES(PROMPT_NAME),
      PROMPT_VERSION = VALUES(PROMPT_VERSION),
      MODEL_ID = VALUES(MODEL_ID),
      VALIDATION_STATUS = VALUES(VALIDATION_STATUS),
      ERROR_MESSAGE = VALUES(ERROR_MESSAGE),
      VALIDATED_BY = VALUES(VALIDATED_BY),
      VALIDATED_AT = NOW()`;

    await connection.query(query, [
      moduleType,
      recordId,
      sectionType,
      score,
      isValid,
      issuesJson,
      summary,
      recommendedFix,
      promptName,
      promptVersion,
      modelId,
      validationStatus,
      errorMessage,
      validatedBy,
    ]);
  } finally {
    await connection.end();
  }
}

async function persistAiValidationHistory({
  moduleType,
  recordId,
  sectionType,
  validation,
  promptName,
  promptVersion = "v1",
  modelId = getAiValidationModelId(),
  validatedBy = "SYSTEM",
  validationStatus = "SUCCESS",
  errorMessage = null,
}) {
  if (!moduleType || !recordId || !sectionType) {
    throw new Error("moduleType, recordId, and sectionType are required");
  }

  const { score, isValid, issuesJson, summary, recommendedFix } =
    mapValidationToColumns(validation);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  try {
    const query = `INSERT INTO AI_VALIDATION_RESULT_HISTORY (
      MODULE_TYPE,
      RECORD_ID,
      SECTION_TYPE,
      SCORE,
      IS_VALID,
      ISSUES_JSON,
      SUMMARY,
      RECOMMENDED_FIX,
      PROMPT_NAME,
      PROMPT_VERSION,
      MODEL_ID,
      VALIDATION_STATUS,
      ERROR_MESSAGE,
      VALIDATED_BY,
      VALIDATED_AT
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

    await connection.query(query, [
      moduleType,
      recordId,
      sectionType,
      score,
      isValid,
      issuesJson,
      summary,
      recommendedFix,
      promptName,
      promptVersion,
      modelId,
      validationStatus,
      errorMessage,
      validatedBy,
    ]);
  } finally {
    await connection.end();
  }
}

module.exports = { persistAiValidationResult, persistAiValidationHistory };
