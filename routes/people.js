const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

function normalizeValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function normalizeDate(value) {
  const normalized = normalizeValue(value);
  if (normalized === null) return null;

  const dateString = String(normalized).trim();
  if (!dateString) return null;

  const isoDate = new Date(dateString);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate.toISOString().slice(0, 19).replace("T", " ");
  }

  return dateString;
}

function getUserName(req) {
  return req.user || req.session?.user?.username || "System";
}

router.get("/active", (req, res) => {
  const connection = getConnection();

  connection.connect((err) => {
    if (err) {
      console.error("[people.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT PEOPLE_ID, FIRST_NAME, LAST_NAME, WORK_EMAIL_ADDRESS, STATUS
      FROM PEOPLE
      WHERE STATUS != 'I' OR STATUS IS NULL
      ORDER BY LAST_NAME, FIRST_NAME, PEOPLE_ID
    `;

    connection.query(query, (error, results) => {
      connection.end();

      if (error) {
        console.error("[people.js] Active people query error:", error);
        return res.status(500).json({ error: "Failed to fetch active people" });
      }

      res.json(results || []);
    });
  });
});

router.get("/", (req, res) => {
  const connection = getConnection();

  connection.connect((err) => {
    if (err) {
      console.error("[people.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT
        PEOPLE_ID,
        LAST_NAME,
        FIRST_NAME,
        MIDDLE_INITIAL,
        FUNCTION_CODE,
        JOB_CODE,
        START_DATE,
        END_DATE,
        PAY_TYPE,
        STATUS,
        SALARY,
        HOURLY_COST,
        SHIFT,
        DEPARTMENT,
        SUPERVISOR_ID,
        LOCATION,
        EMP_LEVEL,
        WORK_PHONE,
        OTHER_NUMBER,
        ADDRESS_LINE_1,
        WORK_EMAIL_ADDRESS,
        ADDRESS_LINE_2,
        CITY,
        ZIP,
        STATE,
        HOME_PHONE,
        SOCIAL_SECURITY,
        BIRTH_DATE,
        HOME_EMAIL_ADDRESS,
        SENORITY_DATE,
        SPECIAL_DATE,
        CREATE_BY,
        CREATE_DATE,
        MODIFIED_BY,
        MODIFIED_DATE,
        ENTITY_ID
      FROM PEOPLE
      ORDER BY LAST_NAME, FIRST_NAME, PEOPLE_ID
    `;

    connection.query(query, (error, results) => {
      connection.end();

      if (error) {
        console.error("[people.js] Query error:", error);
        return res.status(500).json({ error: "Failed to fetch people" });
      }

      res.json(results || []);
    });
  });
});

router.get("/:id", (req, res) => {
  const connection = getConnection();
  const { id } = req.params;

  connection.connect((err) => {
    if (err) {
      console.error("[people.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT *
      FROM PEOPLE
      WHERE PEOPLE_ID = ?
    `;

    connection.query(query, [id], (error, results) => {
      connection.end();

      if (error) {
        console.error("[people.js] Fetch one error:", error);
        return res.status(500).json({ error: "Failed to fetch person" });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({ error: "Person not found" });
      }

      res.json(results[0]);
    });
  });
});

router.post("/", (req, res) => {
  const connection = getConnection();
  const userName = getUserName(req);
  const person = req.body || {};
  const peopleId = normalizeValue(person.PEOPLE_ID);
  const lastName = normalizeValue(person.LAST_NAME);
  const firstName = normalizeValue(person.FIRST_NAME);

  if (!peopleId || !lastName || !firstName) {
    return res.status(400).json({
      error: "PEOPLE_ID, LAST_NAME, and FIRST_NAME are required",
    });
  }

  const values = [
    peopleId,
    lastName,
    firstName,
    normalizeValue(person.MIDDLE_INITIAL),
    normalizeValue(person.FUNCTION_CODE),
    normalizeValue(person.JOB_CODE),
    normalizeDate(person.START_DATE),
    normalizeDate(person.END_DATE),
    normalizeValue(person.PAY_TYPE),
    normalizeValue(person.STATUS) || "A",
    normalizeValue(person.SALARY),
    normalizeValue(person.HOURLY_COST),
    normalizeValue(person.SHIFT),
    normalizeValue(person.DEPARTMENT),
    normalizeValue(person.SUPERVISOR_ID),
    normalizeValue(person.LOCATION),
    normalizeValue(person.EMP_LEVEL),
    normalizeValue(person.WORK_PHONE),
    normalizeValue(person.OTHER_NUMBER),
    normalizeValue(person.ADDRESS_LINE_1),
    normalizeValue(person.WORK_EMAIL_ADDRESS),
    normalizeValue(person.ADDRESS_LINE_2),
    normalizeValue(person.CITY),
    normalizeValue(person.ZIP),
    normalizeValue(person.STATE),
    normalizeValue(person.HOME_PHONE),
    normalizeValue(person.SOCIAL_SECURITY),
    normalizeDate(person.BIRTH_DATE),
    normalizeValue(person.HOME_EMAIL_ADDRESS),
    normalizeDate(person.SENORITY_DATE),
    normalizeDate(person.SPECIAL_DATE),
    userName,
    new Date().toISOString().slice(0, 19).replace("T", " "),
    null,
    null,
    normalizeValue(person.ENTITY_ID),
  ];

  connection.connect((err) => {
    if (err) {
      console.error("[people.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      INSERT INTO PEOPLE (
        PEOPLE_ID,
        LAST_NAME,
        FIRST_NAME,
        MIDDLE_INITIAL,
        FUNCTION_CODE,
        JOB_CODE,
        START_DATE,
        END_DATE,
        PAY_TYPE,
        STATUS,
        SALARY,
        HOURLY_COST,
        SHIFT,
        DEPARTMENT,
        SUPERVISOR_ID,
        LOCATION,
        EMP_LEVEL,
        WORK_PHONE,
        OTHER_NUMBER,
        ADDRESS_LINE_1,
        WORK_EMAIL_ADDRESS,
        ADDRESS_LINE_2,
        CITY,
        ZIP,
        STATE,
        HOME_PHONE,
        SOCIAL_SECURITY,
        BIRTH_DATE,
        HOME_EMAIL_ADDRESS,
        SENORITY_DATE,
        SPECIAL_DATE,
        CREATE_BY,
        CREATE_DATE,
        MODIFIED_BY,
        MODIFIED_DATE,
        ENTITY_ID
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(query, values, (error, results) => {
      connection.end();

      if (error) {
        console.error("[people.js] Insert error:", error);
        return res
          .status(500)
          .json({ error: "Failed to create person", details: error.message });
      }

      res.json({
        PEOPLE_ID: peopleId,
        ...person,
        STATUS: normalizeValue(person.STATUS) || "A",
      });
    });
  });
});

router.put("/:id", (req, res) => {
  const connection = getConnection();
  const userName = getUserName(req);
  const { id } = req.params;
  const person = req.body || {};

  if (!person.LAST_NAME || !person.FIRST_NAME) {
    return res.status(400).json({
      error: "LAST_NAME and FIRST_NAME are required",
    });
  }

  const query = `
    UPDATE PEOPLE
    SET
      LAST_NAME = ?,
      FIRST_NAME = ?,
      MIDDLE_INITIAL = ?,
      FUNCTION_CODE = ?,
      JOB_CODE = ?,
      START_DATE = ?,
      END_DATE = ?,
      PAY_TYPE = ?,
      STATUS = ?,
      SALARY = ?,
      HOURLY_COST = ?,
      SHIFT = ?,
      DEPARTMENT = ?,
      SUPERVISOR_ID = ?,
      LOCATION = ?,
      EMP_LEVEL = ?,
      WORK_PHONE = ?,
      OTHER_NUMBER = ?,
      ADDRESS_LINE_1 = ?,
      WORK_EMAIL_ADDRESS = ?,
      ADDRESS_LINE_2 = ?,
      CITY = ?,
      ZIP = ?,
      STATE = ?,
      HOME_PHONE = ?,
      SOCIAL_SECURITY = ?,
      BIRTH_DATE = ?,
      HOME_EMAIL_ADDRESS = ?,
      SENORITY_DATE = ?,
      SPECIAL_DATE = ?,
      MODIFIED_BY = ?,
      MODIFIED_DATE = ?,
      ENTITY_ID = ?
    WHERE PEOPLE_ID = ?
  `;

  const values = [
    normalizeValue(person.LAST_NAME),
    normalizeValue(person.FIRST_NAME),
    normalizeValue(person.MIDDLE_INITIAL),
    normalizeValue(person.FUNCTION_CODE),
    normalizeValue(person.JOB_CODE),
    normalizeDate(person.START_DATE),
    normalizeDate(person.END_DATE),
    normalizeValue(person.PAY_TYPE),
    normalizeValue(person.STATUS) || "A",
    normalizeValue(person.SALARY),
    normalizeValue(person.HOURLY_COST),
    normalizeValue(person.SHIFT),
    normalizeValue(person.DEPARTMENT),
    normalizeValue(person.SUPERVISOR_ID),
    normalizeValue(person.LOCATION),
    normalizeValue(person.EMP_LEVEL),
    normalizeValue(person.WORK_PHONE),
    normalizeValue(person.OTHER_NUMBER),
    normalizeValue(person.ADDRESS_LINE_1),
    normalizeValue(person.WORK_EMAIL_ADDRESS),
    normalizeValue(person.ADDRESS_LINE_2),
    normalizeValue(person.CITY),
    normalizeValue(person.ZIP),
    normalizeValue(person.STATE),
    normalizeValue(person.HOME_PHONE),
    normalizeValue(person.SOCIAL_SECURITY),
    normalizeDate(person.BIRTH_DATE),
    normalizeValue(person.HOME_EMAIL_ADDRESS),
    normalizeDate(person.SENORITY_DATE),
    normalizeDate(person.SPECIAL_DATE),
    userName,
    new Date().toISOString().slice(0, 19).replace("T", " "),
    normalizeValue(person.ENTITY_ID),
    id,
  ];

  connection.connect((err) => {
    if (err) {
      console.error("[people.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    connection.query(query, values, (error, results) => {
      connection.end();

      if (error) {
        console.error("[people.js] Update error:", error);
        return res.status(500).json({ error: "Failed to update person" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Person not found" });
      }

      res.json({ message: "Person updated successfully" });
    });
  });
});

router.delete("/:id", (req, res) => {
  const connection = getConnection();
  const { id } = req.params;
  const userName = getUserName(req);

  connection.connect((err) => {
    if (err) {
      console.error("[people.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      UPDATE PEOPLE
      SET STATUS = 'I', MODIFIED_BY = ?, MODIFIED_DATE = ?
      WHERE PEOPLE_ID = ?
    `;

    connection.query(
      query,
      [userName, new Date().toISOString().slice(0, 19).replace("T", " "), id],
      (error, results) => {
        connection.end();

        if (error) {
          console.error("[people.js] Delete error:", error);
          return res.status(500).json({ error: "Failed to delete person" });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ error: "Person not found" });
        }

        res.json({ message: "Person deleted successfully" });
      },
    );
  });
});

module.exports = router;
