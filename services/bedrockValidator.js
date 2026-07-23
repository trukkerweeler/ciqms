const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");

// ---------------------------------------------------------------------------
// Kill switch: set AI_VALIDATION=off in .env to disable without code changes.
// Circuit breaker: after FAILURE_THRESHOLD consecutive failures, stop trying
// for COOLDOWN_MS then automatically retry.
// ---------------------------------------------------------------------------
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

const circuit = {
  failures: 0,
  openedAt: null,
  get isOpen() {
    if (this.openedAt === null) return false;
    if (Date.now() - this.openedAt >= COOLDOWN_MS) {
      // Cooldown elapsed — reset and allow one probe
      console.log("[bedrock] Circuit breaker cooldown elapsed, resetting.");
      this.failures = 0;
      this.openedAt = null;
      return false;
    }
    return true;
  },
  recordSuccess() {
    this.failures = 0;
    this.openedAt = null;
  },
  recordFailure() {
    this.failures += 1;
    if (this.failures >= FAILURE_THRESHOLD && this.openedAt === null) {
      this.openedAt = Date.now();
      console.warn(
        `[bedrock] Circuit breaker OPEN after ${this.failures} consecutive failures. ` +
          `Will retry after ${COOLDOWN_MS / 60000} min.`,
      );
    }
  },
};

const SYSTEM_PROMPT = `You are an AS9100/ISO 9001 internal audit response validator. 
Your job is to evaluate whether an internal audit response contains 
complete, objective, verifiable evidence that satisfies the requirement.

You must return ONLY valid JSON in the exact schema below.

---

### VALIDATION RULES

Evaluate the audit response using these rules:

1. Objective Evidence
   - Evidence must be factual, observable, and verifiable.
   - No opinions, intentions, future actions, or vague statements.
   - Must reference actual records, data, documents, logs, or artifacts.

2. Requirement Alignment
   - Evidence must clearly address the specific audit requirement.

3. Completeness
   - Evidence must include WHAT was checked, WHERE, WHEN, and the RESULT.

4. Traceability
   - Evidence must reference real artifacts (record numbers, dates, IDs).

5. No Future Tense
   - "Will", "plan to", "intend to", "scheduled", "working on" 
     are NOT acceptable as objective evidence.
   - A date is only "future" if it is strictly after TODAY'S DATE which will be 
     provided to you. Do not flag past or present dates as future.

---

### SCORING RUBRIC (0-100)

Score the response using this simple scale:

- 0-20: No objective evidence
- 21-50: Partial evidence, vague or missing traceability
- 51-80: Mostly complete, minor gaps
- 81-100: Fully complete, objective, traceable, aligned

---

### JSON OUTPUT SCHEMA

{
  "is_valid": boolean,
  "score": number,          
  "issues": [
    {
      "type": "missing_evidence" | "not_objective" | "not_traceable" | "not_aligned" | "future_tense" | "vague",
      "detail": string
    }
  ],
  "summary": string,
  "recommended_fix": string
}

---

### INPUT FORMAT

You will receive:
- audit_requirement
- audit_response

Evaluate the response strictly against the requirement.

Always return JSON. Never return text outside the JSON.`;

const CORRECTIVE_PROMPTS = {
  NC_TREND: `You are an AS9100/ISO 9001 Corrective Action Trend Validator.
Your job is to evaluate whether the NC_TREND text correctly identifies
the pattern, frequency, recurrence, or systemic nature of the nonconformance.

Return ONLY valid JSON in the schema below.

---

### VALIDATION RULES

1. Trend Identification
   - Must describe a pattern, frequency, or repeated occurrence.
   - Must reference data, logs, records, or historical events.

2. Evidence-Based
   - Trend must be supported by objective evidence.
   - No assumptions, opinions, or vague statements.

3. Specificity
   - Must include WHEN the trend occurred, HOW OFTEN, and WHERE.

4. Alignment
   - Trend must relate directly to the nonconformance being addressed.

---

### JSON OUTPUT

{
  "is_valid": boolean,
  "score": number,
  "issues": [
    {
      "type": "missing_evidence" | "vague" | "not_traceable" | "not_a_trend",
      "detail": string
    }
  ],
  "summary": string,
  "recommended_fix": string
}

---

### INPUT FORMAT
You will receive:
- nc_trend: the user's trend description

Evaluate strictly against the rules above.
Always return JSON.`,

  CORRECTION: `You are an AS9100/ISO 9001 Corrective Action Correction Validator.
Your job is to evaluate whether the CORRECTION text describes a complete,
objective, and verifiable immediate fix applied to the nonconformance.

Return ONLY valid JSON in the schema below.

---

### VALIDATION RULES

1. Immediate Action
   - Correction must describe what was done immediately to fix the issue.
   - Must NOT describe future actions or long-term remedies.

2. Objective Evidence
   - Must reference actual actions taken, records updated, parts reworked,
     product quarantined, or documentation corrected.

3. Completeness
   - Must include WHAT was corrected, WHO corrected it, WHEN, and HOW.

4. Traceability
   - Must reference work orders, NCR numbers, part numbers, dates, etc.

---

### JSON OUTPUT

{
  "is_valid": boolean,
  "score": number,
  "issues": [
    {
      "type": "missing_evidence" | "future_tense" | "vague" | "not_traceable",
      "detail": string
    }
  ],
  "summary": string,
  "recommended_fix": string
}

---

### INPUT FORMAT
You will receive:
- correction: the user's correction description

Evaluate strictly against the rules above.
Always return JSON.`,

  CAUSE: `You are an AS9100/ISO 9001 Root Cause Validator.
Your job is to evaluate whether the CAUSE text provides a complete,
specific, and evidence-based root cause for the nonconformance.

Return ONLY valid JSON in the schema below.

---

### VALIDATION RULES

1. True Root Cause
   - Must identify the underlying reason the issue occurred.
   - Must NOT describe symptoms, restate the problem, or blame operators.

2. Evidence-Based
   - Root cause must be supported by objective evidence or investigation results.

3. Specificity
   - Must include WHAT failed, WHY it failed, and HOW the failure occurred.

4. No Generic Causes
   - “Human error”, “lack of training”, “oversight”, “forgot” are not valid
     unless supported by detailed evidence.

---

### JSON OUTPUT

{
  "is_valid": boolean,
  "score": number,
  "issues": [
    {
      "type": "not_root_cause" | "vague" | "missing_evidence" | "symptom_not_cause",
      "detail": string
    }
  ],
  "summary": string,
  "recommended_fix": string
}

---

### INPUT FORMAT
You will receive:
- cause: the user's root cause description

Evaluate strictly against the rules above.
Always return JSON.`,

  SYSTEMIC_REMEDY: `You are an AS9100/ISO 9001 Systemic Remedy Validator.
Your job is to evaluate whether the SYSTEMIC_REMEDY text describes a complete,
effective, and verifiable long-term corrective action that prevents recurrence.

Return ONLY valid JSON in the schema below.

---

### VALIDATION RULES

1. Long-Term Action
   - Remedy must prevent recurrence, not just fix the immediate issue.

2. Specificity
   - Must describe WHAT will change, WHO is responsible, WHEN it will be completed,
     and HOW effectiveness will be verified.

3. Objective Evidence
   - Must reference planned or completed actions such as training updates,
     process changes, documentation revisions, tooling changes, or inspections.

4. No Vague Promises
   - “We will improve”, “We will monitor”, “We will retrain” are not valid
     without specific details and verification steps.

5. Effectiveness Verification
   - Must include how the organization will confirm the remedy works.

---

### JSON OUTPUT

{
  "is_valid": boolean,
  "score": number,
  "issues": [
    {
      "type": "missing_evidence" | "vague" | "future_tense" | "not_systemic",
      "detail": string
    }
  ],
  "summary": string,
  "recommended_fix": string
}

---

### INPUT FORMAT
You will receive:
- systemic_remedy: the user's long-term corrective action

Evaluate strictly against the rules above.
Always return JSON.`,
};

async function invokeBedrockValidation(systemPrompt, payload) {
  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const command = new InvokeModelCommand({
    modelId: "amazon.nova-pro-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      system: [{ text: systemPrompt }],
      messages: [
        {
          role: "user",
          content: [
            {
              text: JSON.stringify(payload),
            },
          ],
        },
      ],
      inferenceConfig: { maxTokens: 1000 },
    }),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(Buffer.from(response.body).toString("utf-8"));
  const text = responseBody.output.message.content[0].text;
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

async function validateObservation(audit_requirement, audit_response) {
  // --- Manual kill switch ---
  if (process.env.AI_VALIDATION === "off") {
    console.log("[bedrock] Validation disabled via AI_VALIDATION=off.");
    return null;
  }

  // --- Circuit breaker ---
  if (circuit.isOpen) {
    console.warn("[bedrock] Circuit breaker is open — skipping validation.");
    return null;
  }

  try {
    const result = await invokeBedrockValidation(SYSTEM_PROMPT, {
      today: new Date().toISOString().slice(0, 10),
      audit_requirement,
      audit_response,
    });
    circuit.recordSuccess();
    return result;
  } catch (err) {
    circuit.recordFailure();
    throw err;
  }
}

async function validateCorrectiveSection(sectionType, sectionText) {
  if (process.env.AI_VALIDATION === "off") {
    console.log("[bedrock] Validation disabled via AI_VALIDATION=off.");
    return null;
  }

  if (circuit.isOpen) {
    console.warn("[bedrock] Circuit breaker is open — skipping validation.");
    return null;
  }

  const prompt = CORRECTIVE_PROMPTS[sectionType];
  if (!prompt) {
    throw new Error(`Unsupported corrective section type: ${sectionType}`);
  }

  const payloadByType = {
    NC_TREND: {
      today: new Date().toISOString().slice(0, 10),
      nc_trend: sectionText,
    },
    CORRECTION: {
      today: new Date().toISOString().slice(0, 10),
      correction: sectionText,
    },
    CAUSE: {
      today: new Date().toISOString().slice(0, 10),
      cause: sectionText,
    },
    SYSTEMIC_REMEDY: {
      today: new Date().toISOString().slice(0, 10),
      systemic_remedy: sectionText,
    },
  };

  try {
    const result = await invokeBedrockValidation(
      prompt,
      payloadByType[sectionType],
    );
    circuit.recordSuccess();
    return result;
  } catch (err) {
    circuit.recordFailure();
    throw err;
  }
}

module.exports = { validateObservation, validateCorrectiveSection };
