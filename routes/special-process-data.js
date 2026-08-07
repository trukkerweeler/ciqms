const express = require("express");
const mysql = require("mysql2");

const router = express.Router();

function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

function query(connection, sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function parseWorkOrder(raw) {
  const text = String(raw || "").trim();
  if (!text) return { raw: "", job: "", suffix: "000" };
  const dashIdx = text.lastIndexOf("-");
  if (dashIdx > 0) {
    return {
      raw: text,
      job: text.slice(0, dashIdx).trim(),
      suffix: text
        .slice(dashIdx + 1)
        .trim()
        .padStart(3, "0"),
    };
  }
  return { raw: text, job: text, suffix: "000" };
}

function currentUser(req) {
  return req?.session?.user?.username || null;
}

function payloadUser(payload) {
  const raw = payload?.createdBy || payload?.technician || "";
  const normalized = String(raw).trim().toUpperCase();
  return normalized || null;
}

function toLocalMySqlDateTime(date = new Date()) {
  const pad2 = (value) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function normalizeSequenceCode(value) {
  const text = String(value || "").trim();
  return text.replace(/^#+\s*/, "").toUpperCase();
}

async function saveRecord(connection, payload, req) {
  const workOrder = parseWorkOrder(payload.workOrderRaw);
  const actor = currentUser(req) || payloadUser(payload);
  const processType = payload.processType || "chem-film";
  const sequenceCode = normalizeSequenceCode(payload.sequenceCode);
  const localNow = toLocalMySqlDateTime();
  let formInstanceId = String(payload.formInstanceId || "").trim();
  let existing = [];

  if (!formInstanceId) {
    existing = await query(
      connection,
      `SELECT FORM_RECORD_ID, FORM_INSTANCE_ID
       FROM SPECIAL_PROCESS_FORM
       WHERE WORK_ORDER_JOB = ? AND WORK_ORDER_SUFFIX = ? AND PROCESS_TYPE = ?
       ORDER BY UPDATED_AT DESC, FORM_RECORD_ID DESC
       LIMIT 1`,
      [workOrder.job, workOrder.suffix, processType],
    );

    if (existing.length > 0) {
      formInstanceId = existing[0].FORM_INSTANCE_ID;
    } else {
      formInstanceId = `${payload.formDefinitionId}-${Date.now()}`;
    }
  } else {
    existing = await query(
      connection,
      "SELECT FORM_RECORD_ID FROM SPECIAL_PROCESS_FORM WHERE FORM_INSTANCE_ID = ? LIMIT 1",
      [formInstanceId],
    );
  }

  let formRecordId;
  if (existing.length > 0) {
    formRecordId = existing[0].FORM_RECORD_ID;
    await query(
      connection,
      `UPDATE SPECIAL_PROCESS_FORM
       SET FORM_DEFINITION_ID = ?, SERIES = ?, SEQUENCE_CODE = ?, FORM_LABEL = ?,
           WORK_ORDER_RAW = ?, WORK_ORDER_JOB = ?, WORK_ORDER_SUFFIX = ?,
           PART_NUMBER = ?, PART_DESCRIPTION = ?,
           QTY_ACCEPTED = ?, QTY_REJECTED = ?, NOTES = ?, PROCESS_TYPE = ?,
           STATUS = 'SAVED', UPDATED_BY = ?, UPDATED_AT = ?
       WHERE FORM_RECORD_ID = ?`,
      [
        payload.formDefinitionId,
        payload.series,
        sequenceCode,
        payload.formLabel,
        workOrder.raw,
        workOrder.job,
        workOrder.suffix,
        payload.partNumber || null,
        payload.partDescription || null,
        Number(payload.qtyAccepted || 0),
        Number(payload.qtyRejected || 0),
        payload.notes || null,
        processType,
        actor,
        localNow,
        formRecordId,
      ],
    );
  } else {
    const insertResult = await query(
      connection,
      `INSERT INTO SPECIAL_PROCESS_FORM (
         FORM_DEFINITION_ID, FORM_INSTANCE_ID, SERIES, SEQUENCE_CODE, FORM_LABEL,
         WORK_ORDER_RAW, WORK_ORDER_JOB, WORK_ORDER_SUFFIX,
         PART_NUMBER, PART_DESCRIPTION,
         QTY_ACCEPTED, QTY_REJECTED, NOTES, PROCESS_TYPE, STATUS,
         CREATED_BY, CREATED_AT, UPDATED_BY, UPDATED_AT
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SAVED', ?, ?, ?, ?)`,
      [
        payload.formDefinitionId,
        formInstanceId,
        payload.series,
        sequenceCode,
        payload.formLabel,
        workOrder.raw,
        workOrder.job,
        workOrder.suffix,
        payload.partNumber || null,
        payload.partDescription || null,
        Number(payload.qtyAccepted || 0),
        Number(payload.qtyRejected || 0),
        payload.notes || null,
        processType,
        actor,
        localNow,
        actor,
        localNow,
      ],
    );
    formRecordId = insertResult.insertId;
  }

  await query(
    connection,
    "DELETE FROM SPECIAL_PROCESS_STEP_VALUE WHERE FORM_RECORD_ID = ?",
    [formRecordId],
  );

  const stepValues = Array.isArray(payload.stepValues)
    ? payload.stepValues
    : [];
  for (const row of stepValues) {
    await query(
      connection,
      `INSERT INTO SPECIAL_PROCESS_STEP_VALUE (
         FORM_RECORD_ID, STEP_INDEX, STEP_TITLE, IS_OPTIONAL_BLOCK_STEP,
         RANGE_INDEX, RANGE_LABEL, RANGE_UOM, SPEC_MIN, SPEC_MAX,
         INPUT_TYPE, ACTUAL_NUMERIC, ACTUAL_TEXT, PASS_FAIL, REQUIREMENT_TEXT
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        formRecordId,
        Number(row.stepIndex || 0),
        row.stepTitle || "",
        row.isOptional ? 1 : 0,
        Number(row.rangeIndex || 0),
        row.rangeLabel || null,
        row.rangeUom || null,
        row.specMin === "" || row.specMin === undefined ? null : row.specMin,
        row.specMax === "" || row.specMax === undefined ? null : row.specMax,
        row.inputType || "number",
        row.actualNumeric === "" || row.actualNumeric === undefined
          ? null
          : row.actualNumeric,
        row.actualText || null,
        row.passFail || null,
        row.requirementText || null,
      ],
    );
  }

  await query(
    connection,
    `INSERT INTO SPECIAL_PROCESS_FORM_AUDIT
      (FORM_RECORD_ID, ACTION_TYPE, ACTION_BY, ACTION_AT, ACTION_NOTE)
     VALUES (?, ?, ?, ?, ?)`,
    [
      formRecordId,
      existing.length > 0 ? "UPDATE_SAVE" : "CREATE_SAVE",
      actor,
      localNow,
      "Form saved from special-process form",
    ],
  );

  return { formRecordId, formInstanceId, status: "SAVED" };
}

async function handleSave(req, res) {
  const payload = req.body || {};
  if (!payload.formDefinitionId || !payload.workOrderRaw) {
    return res
      .status(400)
      .json({ error: "formDefinitionId and workOrderRaw are required" });
  }

  const connection = createConnection();
  connection.connect(async (err) => {
    if (err) {
      console.error("special-process-data connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    try {
      const saved = await saveRecord(connection, payload, req);
      connection.end();
      res.json(saved);
    } catch (saveErr) {
      connection.end();
      console.error("special-process-data save failed:", saveErr);
      res.status(500).json({ error: "Failed to save form" });
    }
  });
}

router.post("/save", handleSave);

router.get("/", async (req, res) => {
  const rawLimit = Number.parseInt(String(req.query.limit || "100"), 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(rawLimit, 500))
    : 100;

  const connection = createConnection();
  connection.connect(async (err) => {
    if (err) {
      console.error("special-process-data connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    try {
      const rows = await query(
        connection,
        `SELECT
           FORM_RECORD_ID,
           FORM_INSTANCE_ID,
           FORM_DEFINITION_ID,
           FORM_LABEL,
           PROCESS_TYPE,
           WORK_ORDER_RAW,
           WORK_ORDER_JOB,
           WORK_ORDER_SUFFIX,
           PART_NUMBER,
           PART_DESCRIPTION,
           QTY_ACCEPTED,
           QTY_REJECTED,
           STATUS,
           CREATED_BY,
           CREATED_AT,
           UPDATED_BY,
           UPDATED_AT
         FROM SPECIAL_PROCESS_FORM
         ORDER BY UPDATED_AT DESC, FORM_RECORD_ID DESC
         LIMIT ?`,
        [limit],
      );

      connection.end();
      res.json({ records: rows, limit });
    } catch (readErr) {
      connection.end();
      console.error("special-process-data list failed:", readErr);
      res.status(500).json({ error: "Failed to list records" });
    }
  });
});

router.get("/:formInstanceId", async (req, res) => {
  const formInstanceId = String(req.params.formInstanceId || "").trim();
  if (!formInstanceId) {
    return res.status(400).json({ error: "formInstanceId is required" });
  }

  const connection = createConnection();
  connection.connect(async (err) => {
    if (err) {
      console.error("special-process-data connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    try {
      const forms = await query(
        connection,
        `SELECT *
         FROM SPECIAL_PROCESS_FORM
         WHERE FORM_INSTANCE_ID = ?
         LIMIT 1`,
        [formInstanceId],
      );

      if (forms.length === 0) {
        connection.end();
        return res.status(404).json({ error: "Record not found" });
      }

      const formRow = forms[0];
      const steps = await query(
        connection,
        `SELECT *
         FROM SPECIAL_PROCESS_STEP_VALUE
         WHERE FORM_RECORD_ID = ?
         ORDER BY STEP_INDEX, RANGE_INDEX`,
        [formRow.FORM_RECORD_ID],
      );

      connection.end();
      res.json({
        header: formRow,
        stepValues: steps,
      });
    } catch (readErr) {
      connection.end();
      console.error("special-process-data load failed:", readErr);
      res.status(500).json({ error: "Failed to load form" });
    }
  });
});

module.exports = router;
