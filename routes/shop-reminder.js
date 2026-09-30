const express = require("express");
const mysql = require("mysql2");
const mysqlPromise = require("mysql2/promise");

const router = express.Router();

function getGlobalConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "global",
  });
}

function getQualityConnection() {
  return mysqlPromise.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

function getCurrentUser(req) {
  return (
    req.session?.user?.username ||
    req.session?.user_id ||
    req.body?.createdBy ||
    "SYSTEM"
  );
}

function normalizeOperationCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function validateReminderInput(body) {
  const operationCode = normalizeOperationCode(body?.operationCode);
  const reminderText = String(body?.reminderText ?? "").trim();

  if (!operationCode || operationCode.length > 50) {
    return { error: "A valid operation code is required." };
  }
  if (!reminderText) {
    return { error: "Reminder text is required." };
  }
  return { operationCode, reminderText };
}

router.post("/operations", (req, res) => {
  const job = String(req.body?.job ?? "").trim();
  const suffix = String(req.body?.suffix ?? "").trim();

  if (!/^\d+$/.test(job) || !/^\d+$/.test(suffix)) {
    return res.status(400).json({
      error: "JOB and SUFFIX must contain numbers only.",
    });
  }

  const connection = getGlobalConnection();
  const query = `
    SELECT
      jo.JOB,
      jo.SUFFIX,
      jo.SEQ AS OPERATION_NUMBER,
      TRIM(jo.OPERATION) AS OPERATION_CODE,
      jo.DESCRIPTION
    FROM JOB_OPERATIONS jo
    WHERE jo.JOB = ?
      AND jo.SUFFIX = ?
      AND jo.OPERATION IS NOT NULL
      AND TRIM(jo.OPERATION) <> ''
    ORDER BY jo.SEQ;
  `;

  connection.query(query, [job, suffix], (error, rows) => {
    connection.end();

    if (error) {
      console.error("MySQL error in /shop-reminder/operations", error);
      return res
        .status(500)
        .json({ error: "Unable to retrieve traveler operations." });
    }

    res.json({ job, suffix, operations: rows });
  });
});

router.get("/reminders", async (req, res) => {
  const operationCodes = String(req.query.operationCodes ?? "")
    .split(",")
    .map(normalizeOperationCode)
    .filter(Boolean);

  if (operationCodes.length === 0) {
    return res.json([]);
  }

  let connection;
  try {
    connection = await getQualityConnection();
    const placeholders = operationCodes.map(() => "?").join(",");
    const [rows] = await connection.execute(
      `
        SELECT r.JOBBER_ID, r.REVISION, r.OPERATION_CODE, r.REMINDER_TEXT,
               r.ACTIVE, r.CREATE_BY, r.CREATE_DATE, r.MODIFIED_BY, r.MODIFIED_DATE
        FROM JOBBER_REMINDER r
        INNER JOIN (
          SELECT JOBBER_ID, MAX(REVISION) AS REVISION
          FROM JOBBER_REMINDER
          GROUP BY JOBBER_ID
        ) latest ON latest.JOBBER_ID = r.JOBBER_ID
                AND latest.REVISION = r.REVISION
        WHERE r.ACTIVE = 1
          AND r.OPERATION_CODE IN (${placeholders})
        ORDER BY r.OPERATION_CODE, r.JOBBER_ID
      `,
      operationCodes,
    );
    res.json(rows);
  } catch (error) {
    console.error("MySQL error in /shop-reminder/reminders", error);
    res.status(500).json({ error: "Unable to retrieve operation reminders." });
  } finally {
    if (connection) await connection.end();
  }
});

router.get("/reminders/admin", async (req, res) => {
  const operationCode = normalizeOperationCode(req.query.operationCode);
  let connection;
  try {
    connection = await getQualityConnection();
    const filter = operationCode ? `%${operationCode}%` : "%";
    const [rows] = await connection.execute(
      `
        SELECT r.JOBBER_ID, r.REVISION, r.OPERATION_CODE, r.REMINDER_TEXT,
               r.ACTIVE, r.CREATE_BY, r.CREATE_DATE, r.MODIFIED_BY, r.MODIFIED_DATE
        FROM JOBBER_REMINDER r
        INNER JOIN (
          SELECT JOBBER_ID, MAX(REVISION) AS REVISION
          FROM JOBBER_REMINDER
          GROUP BY JOBBER_ID
        ) latest ON latest.JOBBER_ID = r.JOBBER_ID
                AND latest.REVISION = r.REVISION
        WHERE r.OPERATION_CODE LIKE ?
        ORDER BY r.OPERATION_CODE, r.JOBBER_ID
      `,
      [filter],
    );
    res.json(rows);
  } catch (error) {
    console.error("MySQL error in /shop-reminder/reminders/admin", error);
    res.status(500).json({ error: "Unable to retrieve reminder records." });
  } finally {
    if (connection) await connection.end();
  }
});

router.post("/reminders", async (req, res) => {
  const reminder = validateReminderInput(req.body);
  if (reminder.error) return res.status(400).json(reminder);

  let connection;
  try {
    connection = await getQualityConnection();
    await connection.beginTransaction();

    const [idRows] = await connection.execute(
      "SELECT CURRENT_ID FROM SYSTEM_IDS WHERE TABLE_NAME = ? FOR UPDATE",
      ["JOBBER_REMINDER"],
    );
    if (idRows.length === 0) {
      throw new Error(
        "JOBBER_REMINDER is missing from SYSTEM_IDS. Run sql/shop-reminder.sql.",
      );
    }

    const nextId = (parseInt(idRows[0].CURRENT_ID, 10) + 1)
      .toString()
      .padStart(7, "0");
    await connection.execute(
      "UPDATE SYSTEM_IDS SET CURRENT_ID = ? WHERE TABLE_NAME = ?",
      [nextId, "JOBBER_REMINDER"],
    );
    await connection.execute(
      `INSERT INTO JOBBER_REMINDER
        (JOBBER_ID, REVISION, OPERATION_CODE, REMINDER_TEXT, ACTIVE, CREATE_BY, MODIFIED_BY)
       VALUES (?, 1, ?, ?, 1, ?, ?)`,
      [
        nextId,
        reminder.operationCode,
        reminder.reminderText,
        getCurrentUser(req),
        getCurrentUser(req),
      ],
    );

    await connection.commit();
    res.status(201).json({
      JOBBER_ID: nextId,
      REVISION: 1,
      OPERATION_CODE: reminder.operationCode,
      REMINDER_TEXT: reminder.reminderText,
      ACTIVE: 1,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("MySQL error creating /shop-reminder/reminders", error);
    res
      .status(500)
      .json({ error: error.message || "Unable to create reminder." });
  } finally {
    if (connection) await connection.end();
  }
});

router.put("/reminders/:jobberId", async (req, res) => {
  const jobberId = String(req.params.jobberId ?? "").trim();
  const reminder = validateReminderInput(req.body);
  if (!/^\d{1,7}$/.test(jobberId)) {
    return res.status(400).json({ error: "Invalid JOBBER_ID." });
  }
  if (reminder.error) return res.status(400).json(reminder);

  let connection;
  try {
    connection = await getQualityConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      "SELECT REVISION FROM JOBBER_REMINDER WHERE JOBBER_ID = ? ORDER BY REVISION DESC LIMIT 1 FOR UPDATE",
      [jobberId.padStart(7, "0")],
    );
    if (!rows[0]?.REVISION) {
      await connection.rollback();
      return res.status(404).json({ error: "Reminder not found." });
    }

    const revision = Number(rows[0].REVISION) + 1;
    const user = getCurrentUser(req);
    await connection.execute(
      `INSERT INTO JOBBER_REMINDER
        (JOBBER_ID, REVISION, OPERATION_CODE, REMINDER_TEXT, ACTIVE, CREATE_BY, MODIFIED_BY)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        jobberId.padStart(7, "0"),
        revision,
        reminder.operationCode,
        reminder.reminderText,
        req.body.active === false ? 0 : 1,
        user,
        user,
      ],
    );
    await connection.commit();
    res.json({
      JOBBER_ID: jobberId.padStart(7, "0"),
      REVISION: revision,
      ...reminder,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("MySQL error revising /shop-reminder/reminders", error);
    res.status(500).json({ error: "Unable to save reminder revision." });
  } finally {
    if (connection) await connection.end();
  }
});

router.delete("/reminders/:jobberId", async (req, res) => {
  const jobberId = String(req.params.jobberId ?? "").trim();
  if (!/^\d{1,7}$/.test(jobberId)) {
    return res.status(400).json({ error: "Invalid JOBBER_ID." });
  }

  let connection;
  try {
    connection = await getQualityConnection();
    await connection.beginTransaction();
    const paddedId = jobberId.padStart(7, "0");
    const [rows] = await connection.execute(
      `SELECT JOBBER_ID, REVISION, OPERATION_CODE, REMINDER_TEXT
       FROM JOBBER_REMINDER
       WHERE JOBBER_ID = ?
       ORDER BY REVISION DESC
       LIMIT 1
       FOR UPDATE`,
      [paddedId],
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Reminder not found." });
    }

    const latest = rows[0];
    const revision = Number(latest.REVISION) + 1;
    const user = getCurrentUser(req);
    await connection.execute(
      `INSERT INTO JOBBER_REMINDER
        (JOBBER_ID, REVISION, OPERATION_CODE, REMINDER_TEXT, ACTIVE, CREATE_BY, MODIFIED_BY)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [
        paddedId,
        revision,
        latest.OPERATION_CODE,
        latest.REMINDER_TEXT,
        user,
        user,
      ],
    );
    await connection.commit();
    res.json({ JOBBER_ID: paddedId, REVISION: revision, ACTIVE: 0 });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("MySQL error deleting /shop-reminder/reminders", error);
    res.status(500).json({ error: "Unable to delete reminder." });
  } finally {
    if (connection) await connection.end();
  }
});

module.exports = router;
