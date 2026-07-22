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
        system: [{ text: SYSTEM_PROMPT }],
        messages: [
          {
            role: "user",
            content: [
              {
                text: JSON.stringify({ audit_requirement, audit_response }),
              },
            ],
          },
        ],
        inferenceConfig: { maxTokens: 1000 },
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(
      Buffer.from(response.body).toString("utf-8"),
    );
    const text = responseBody.output.message.content[0].text;
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const result = JSON.parse(cleaned);
    circuit.recordSuccess();
    return result;
  } catch (err) {
    circuit.recordFailure();
    throw err;
  }
}

module.exports = { validateObservation };
