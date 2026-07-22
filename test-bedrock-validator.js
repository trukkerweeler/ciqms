// Quick test: fetch question 1 from audit 0000207 and validate its observation
require("dotenv").config({ path: ".env" });
const mysql = require("mysql2");
const { validateObservation } = require("./services/bedrockValidator");

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: 3306,
  database: "quality",
});

connection.connect((err) => {
  if (err) {
    console.error("DB connect error:", err);
    process.exit(1);
  }

  const query = `
    SELECT acq.QUESTION, aco.OBSERVATION
    FROM AUDT_CHKL_QUST acq
    LEFT JOIN AUDT_CHKL_OBSN aco
      ON acq.AUDIT_MANAGER_ID = aco.AUDIT_MANAGER_ID
      AND acq.CHECKLIST_ID = aco.CHECKLIST_ID
    WHERE acq.AUDIT_MANAGER_ID = '0000207'
    ORDER BY acq.CHECKLIST_ID
    LIMIT 1
  `;

  connection.query(query, async (err, rows) => {
    connection.end();
    if (err) {
      console.error("Query error:", err);
      process.exit(1);
    }
    if (!rows.length) {
      console.error("No rows found");
      process.exit(1);
    }

    const { QUESTION, OBSERVATION } = rows[0];
    console.log("--- QUESTION ---");
    console.log(QUESTION);
    console.log("\n--- OBSERVATION ---");
    console.log(OBSERVATION);
    console.log("\nSending to Bedrock...\n");

    try {
      const result = await validateObservation(QUESTION, OBSERVATION);
      console.log("--- VALIDATION RESULT ---");
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error("Bedrock error:", e.message);
    }
  });
});
