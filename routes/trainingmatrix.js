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

// SKILL_ID format: "CAT-SUB-CourseCode" — extract the course code (3rd segment)
function extractCourseCode(skillId) {
  if (!skillId) return skillId;
  const parts = skillId.split("-");
  return parts.length > 2 ? parts[2] : skillId;
}

// GET /trainingmatrix/people — all active people
router.get("/people", (req, res) => {
  const connection = getConnection();
  connection.connect((err) => {
    if (err) {
      console.error("[trainingmatrix.js] DB connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }
    const query = `
      SELECT PEOPLE_ID, FIRST_NAME, LAST_NAME
      FROM PEOPLE
      WHERE STATUS != 'I' OR STATUS IS NULL
      ORDER BY PEOPLE_ID
    `;
    connection.query(query, (error, results) => {
      connection.end();
      if (error) {
        console.error("[trainingmatrix.js] People query error:", error);
        return res.status(500).json({ error: "Failed to fetch people" });
      }
      res.json(results || []);
    });
  });
});

// GET /trainingmatrix/person/:personId — full skill matrix for one employee
router.get("/person/:personId", (req, res) => {
  const connection = getConnection();
  const { personId } = req.params;

  connection.connect((err) => {
    if (err) {
      console.error("[trainingmatrix.js] DB connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT
        ps.PEOPLE_ID,
        ps.JOB_TITLE,
        ps.COMPETENCY    AS RECORDED_COMPETENCY,
        ps.CERT_DATE,
        ps.CERT_BY,
        js.SKILL_ID,
        js.REQUIRED_LEVEL,
        s.NAME           AS SKILL_NAME,
        s.CATEGORY
      FROM PERSON_SKILLS ps
      JOIN  JOB_SKILLS js ON ps.JOB_TITLE = js.JOB_TITLE
      LEFT JOIN SKILLS s ON js.SKILL_ID = s.SKILL_ID
      WHERE ps.PEOPLE_ID = ?
        AND (s.STATUS IS NULL OR s.STATUS != 'I')
      ORDER BY ps.JOB_TITLE, s.NAME
    `;

    connection.query(query, [personId], (error, rows) => {
      if (error) {
        connection.end();
        console.error("[trainingmatrix.js] Matrix query error:", error);
        return res.status(500).json({ error: "Failed to fetch matrix" });
      }

      if (!rows || rows.length === 0) {
        connection.end();
        return res.json([]);
      }

      const courseCodeMap = {};
      rows.forEach((r) => {
        courseCodeMap[r.SKILL_ID] = extractCourseCode(r.SKILL_ID);
      });
      const uniqueCodes = [...new Set(Object.values(courseCodeMap))];

      if (uniqueCodes.length === 0) {
        connection.end();
        return res.json(
          rows.map((r) => ({
            ...r,
            COURSE_CODE: null,
            LAST_TRAINING_DATE: null,
            LAST_INSTRUCTOR: null,
            TRAINING_MINUTES: null,
          })),
        );
      }

      const placeholders = uniqueCodes.map(() => "?").join(",");
      const attendQuery = `
        SELECT COURSE_ID, DATE_TIME, INSTRUCTOR, MINUTES
        FROM CTA_ATTENDANCE
        WHERE PEOPLE_ID = ? AND COURSE_ID IN (${placeholders})
        ORDER BY DATE_TIME DESC
      `;

      connection.query(
        attendQuery,
        [personId, ...uniqueCodes],
        (error2, attendRows) => {
          connection.end();
          if (error2) {
            console.error(
              "[trainingmatrix.js] Attendance query error:",
              error2,
            );
            return res
              .status(500)
              .json({ error: "Failed to fetch attendance" });
          }

          // Build map: courseCode → most-recent attendance (rows already DESC)
          const latest = {};
          (attendRows || []).forEach((ar) => {
            if (!latest[ar.COURSE_ID]) latest[ar.COURSE_ID] = ar;
          });

          const result = rows.map((r) => {
            const code = courseCodeMap[r.SKILL_ID];
            const att = latest[code] || null;
            return {
              ...r,
              COURSE_CODE: code,
              LAST_TRAINING_DATE: att ? att.DATE_TIME : null,
              LAST_INSTRUCTOR: att ? att.INSTRUCTOR : null,
              TRAINING_MINUTES: att ? att.MINUTES : null,
            };
          });

          console.log(
            "[trainingmatrix.js] Matrix for",
            personId,
            "—",
            result.length,
            "skills",
          );
          res.json(result);
        },
      );
    });
  });
});

// GET /trainingmatrix/all — summary row per (person, job_title)
router.get("/all", (req, res) => {
  const connection = getConnection();
  connection.connect((err) => {
    if (err) {
      console.error("[trainingmatrix.js] DB connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT
        ps.PEOPLE_ID,
        p.FIRST_NAME,
        p.LAST_NAME,
        ps.JOB_TITLE,
        ps.COMPETENCY          AS RECORDED_COMPETENCY,
        COUNT(s_outer.SKILL_ID)     AS REQUIRED_SKILLS,
        trained.TRAINED_SKILLS
      FROM PERSON_SKILLS ps
      LEFT JOIN PEOPLE p ON ps.PEOPLE_ID = p.PEOPLE_ID
      LEFT JOIN JOB_SKILLS js ON ps.JOB_TITLE = js.JOB_TITLE
      LEFT JOIN SKILLS s_outer ON js.SKILL_ID = s_outer.SKILL_ID AND (s_outer.STATUS IS NULL OR s_outer.STATUS != 'I')
      LEFT JOIN (
        SELECT
          ps2.PEOPLE_ID,
          ps2.JOB_TITLE,
          COUNT(DISTINCT ca.COURSE_ID) AS TRAINED_SKILLS
        FROM PERSON_SKILLS ps2
        JOIN  JOB_SKILLS js2 ON ps2.JOB_TITLE = js2.JOB_TITLE
        JOIN  SKILLS s2 ON js2.SKILL_ID = s2.SKILL_ID AND (s2.STATUS IS NULL OR s2.STATUS != 'I')
        JOIN  CTA_ATTENDANCE ca
          ON  ca.PEOPLE_ID = ps2.PEOPLE_ID
          AND ca.COURSE_ID = IF(
                (LENGTH(js2.SKILL_ID) - LENGTH(REPLACE(js2.SKILL_ID, '-', ''))) >= 2,
                SUBSTRING_INDEX(SUBSTRING_INDEX(js2.SKILL_ID, '-', 3), '-', -1),
                js2.SKILL_ID
              )
        GROUP BY ps2.PEOPLE_ID, ps2.JOB_TITLE
      ) trained ON trained.PEOPLE_ID = ps.PEOPLE_ID AND trained.JOB_TITLE = ps.JOB_TITLE
      GROUP BY
        ps.PEOPLE_ID, p.FIRST_NAME, p.LAST_NAME,
        ps.JOB_TITLE, ps.COMPETENCY, trained.TRAINED_SKILLS
      ORDER BY ps.PEOPLE_ID, ps.JOB_TITLE
    `;

    connection.query(query, (error, results) => {
      connection.end();
      if (error) {
        console.error("[trainingmatrix.js] All-employees query error:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch employee matrix" });
      }
      console.log(
        "[trainingmatrix.js] All-employee summary:",
        (results || []).length,
        "rows",
      );
      res.json(results || []);
    });
  });
});

module.exports = router;
