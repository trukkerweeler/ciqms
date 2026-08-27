const mysql = require("mysql2/promise");

function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

async function listBySubject(subjectId) {
  const connection = await createConnection();
  try {
    const [rows] = await connection.query(
      `SELECT
        r.ID,
        r.NAME,
        r.TYPE,
        r.NOTES,
        srr.SUBJECT_ID,
        srr.REQUIRED_QUANTITY
       FROM SUBJECT_RESOURCE_REQUIREMENT srr
       INNER JOIN RESOURCE r ON r.ID = srr.RESOURCE_ID
       WHERE srr.SUBJECT_ID = ?
       ORDER BY r.TYPE, r.NAME`,
      [subjectId],
    );
    return rows;
  } finally {
    await connection.end();
  }
}

async function createResource(data) {
  const connection = await createConnection();
  try {
    const [result] = await connection.query(
      "INSERT INTO RESOURCE (NAME, TYPE, NOTES) VALUES (?, ?, ?)",
      [data.NAME, data.TYPE, data.NOTES || null],
    );
    return { ID: result.insertId, ...data };
  } finally {
    await connection.end();
  }
}

async function updateResource(id, data) {
  const connection = await createConnection();
  try {
    const [result] = await connection.query(
      "UPDATE RESOURCE SET NAME = ?, TYPE = ?, NOTES = ? WHERE ID = ?",
      [data.NAME, data.TYPE, data.NOTES || null, id],
    );
    return result.affectedRows > 0;
  } finally {
    await connection.end();
  }
}

async function assignRequirement(data) {
  const connection = await createConnection();
  try {
    await connection.query(
      `INSERT INTO SUBJECT_RESOURCE_REQUIREMENT
        (SUBJECT_ID, RESOURCE_ID, REQUIRED_QUANTITY)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE REQUIRED_QUANTITY = VALUES(REQUIRED_QUANTITY)`,
      [data.SUBJECT_ID, data.RESOURCE_ID, data.REQUIRED_QUANTITY || null],
    );
  } finally {
    await connection.end();
  }
}

async function removeRequirement(subjectId, resourceId) {
  const connection = await createConnection();
  try {
    const [result] = await connection.query(
      "DELETE FROM SUBJECT_RESOURCE_REQUIREMENT WHERE SUBJECT_ID = ? AND RESOURCE_ID = ?",
      [subjectId, resourceId],
    );
    return result.affectedRows > 0;
  } finally {
    await connection.end();
  }
}

module.exports = {
  listBySubject,
  createResource,
  updateResource,
  assignRequirement,
  removeRequirement,
};
