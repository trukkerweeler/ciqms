const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

// Database connection function
function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

// Get all person skills
router.get("/", (req, res) => {
  const connection = getConnection();

  connection.connect((err) => {
    if (err) {
      console.error("[ctapersonskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT 
        PERSON_SKILL_ID,
        PEOPLE_ID,
        JOB_TITLE,
        COMPETENCY,
        CERT_DATE,
        CERT_BY,
        NOTES,
        ASSIGN_DATE,
        REQUESTED_BY
      FROM PERSON_SKILLS
      ORDER BY PEOPLE_ID, JOB_TITLE
    `;

    connection.query(query, (error, results) => {
      connection.end();

      if (error) {
        console.error("[ctapersonskills.js] Query error:", error);
        return res.status(500).json({ error: "Failed to fetch person skills" });
      }

      console.log(
        "[ctapersonskills.js] Retrieved",
        results.length,
        "person skills",
      );
      res.json(results);
    });
  });
});

// Get person skills by person name
router.get("/person/:name", (req, res) => {
  const connection = getConnection();
  const { name } = req.params;

  connection.connect((err) => {
    if (err) {
      console.error("[ctapersonskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT 
        PERSON_SKILL_ID,
        PEOPLE_ID,
        JOB_TITLE,
        COMPETENCY,
        CERT_DATE,
        CERT_BY,
        NOTES,
        ASSIGN_DATE,
        REQUESTED_BY
      FROM PERSON_SKILLS
      WHERE PEOPLE_ID = ?
      ORDER BY JOB_TITLE
    `;

    connection.query(query, [name], (error, results) => {
      connection.end();

      if (error) {
        console.error("[ctapersonskills.js] Query error:", error);
        return res.status(500).json({ error: "Failed to fetch person skills" });
      }

      res.json(results);
    });
  });
});

// Create a new person skill assignment
router.post("/", (req, res) => {
  const connection = getConnection();
  const {
    PEOPLE_ID,
    JOB_TITLE,
    COMPETENCY,
    CERT_DATE,
    CERT_BY,
    NOTES,
    ASSIGN_DATE,
    REQUESTED_BY,
  } = req.body;

  if (!PEOPLE_ID || !JOB_TITLE || !COMPETENCY) {
    return res
      .status(400)
      .json({ error: "PEOPLE_ID, JOB_TITLE, and COMPETENCY are required" });
  }

  connection.connect((err) => {
    if (err) {
      console.error("[ctapersonskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      INSERT INTO PERSON_SKILLS 
      (PEOPLE_ID, JOB_TITLE, COMPETENCY, CERT_DATE, CERT_BY, NOTES, ASSIGN_DATE, REQUESTED_BY)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      PEOPLE_ID,
      JOB_TITLE,
      COMPETENCY,
      CERT_DATE || null,
      CERT_BY || "System",
      NOTES || "",
      ASSIGN_DATE || new Date().toISOString().slice(0, 19).replace("T", " "),
      REQUESTED_BY || "System",
    ];

    connection.query(query, values, (error, results) => {
      connection.end();

      if (error) {
        console.error("[ctapersonskills.js] Insert error:", error);
        return res.status(500).json({ error: "Failed to create person skill" });
      }

      console.log(
        "[ctapersonskills.js] Created person skill with ID:",
        results.insertId,
      );
      res.json({
        PERSON_SKILL_ID: results.insertId,
        PEOPLE_ID,
        JOB_TITLE,
        COMPETENCY,
        CERT_DATE,
        CERT_BY,
        NOTES,
        ASSIGN_DATE,
        REQUESTED_BY,
      });
    });
  });
});

// Update a person skill
router.put("/:id", (req, res) => {
  const connection = getConnection();
  const { id } = req.params;
  const { COMPETENCY, CERT_DATE, CERT_BY, NOTES } = req.body;

  if (!COMPETENCY) {
    return res.status(400).json({ error: "COMPETENCY is required" });
  }

  connection.connect((err) => {
    if (err) {
      console.error("[ctapersonskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      UPDATE PERSON_SKILLS
      SET COMPETENCY = ?, CERT_DATE = ?, CERT_BY = ?, NOTES = ?
      WHERE PERSON_SKILL_ID = ?
    `;

    const values = [
      COMPETENCY,
      CERT_DATE || null,
      CERT_BY || "System",
      NOTES || "",
      id,
    ];

    connection.query(query, values, (error, results) => {
      connection.end();

      if (error) {
        console.error("[ctapersonskills.js] Update error:", error);
        return res.status(500).json({ error: "Failed to update person skill" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Person skill not found" });
      }

      console.log("[ctapersonskills.js] Updated person skill with ID:", id);
      res.json({ message: "Person skill updated successfully" });
    });
  });
});

// Delete a person skill
router.delete("/:id", (req, res) => {
  const connection = getConnection();
  const { id } = req.params;

  connection.connect((err) => {
    if (err) {
      console.error("[ctapersonskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "DELETE FROM PERSON_SKILLS WHERE PERSON_SKILL_ID = ?";

    connection.query(query, [id], (error, results) => {
      connection.end();

      if (error) {
        console.error("[ctapersonskills.js] Delete error:", error);
        return res.status(500).json({ error: "Failed to delete person skill" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Person skill not found" });
      }

      console.log("[ctapersonskills.js] Deleted person skill with ID:", id);
      res.json({ message: "Person skill deleted successfully" });
    });
  });
});

// Get all active people (status != 'I')
router.get("/people/active", (req, res) => {
  const connection = getConnection();

  connection.connect((err) => {
    if (err) {
      console.error("[ctapersonskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT 
        PEOPLE_ID,
        FIRST_NAME,
        LAST_NAME,
        STATUS
      FROM PEOPLE
      WHERE STATUS != 'I' OR STATUS IS NULL
      ORDER BY PEOPLE_ID ASC
    `;

    connection.query(query, (error, results) => {
      connection.end();

      if (error) {
        console.error("[ctapersonskills.js] Query error:", error);
        return res.status(500).json({ error: "Failed to fetch people" });
      }

      console.log(
        "[ctapersonskills.js] Retrieved",
        results.length,
        "active people",
      );
      res.json(results || []);
    });
  });
});

// Get unique job titles from JOB_SKILLS
router.get("/jobs/unique", (req, res) => {
  const connection = getConnection();

  connection.connect((err) => {
    if (err) {
      console.error("[ctapersonskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT DISTINCT JOB_TITLE
      FROM JOB_SKILLS
      ORDER BY JOB_TITLE
    `;

    connection.query(query, (error, results) => {
      connection.end();

      if (error) {
        console.error("[ctapersonskills.js] Query error:", error);
        return res.status(500).json({ error: "Failed to fetch job titles" });
      }

      console.log(
        "[ctapersonskills.js] Retrieved",
        results.length,
        "unique job titles",
      );
      res.json(results.map((row) => row.JOB_TITLE));
    });
  });
});

// Search attendance records using Person + Job Title matrix
// Finds all SKILL_IDs for the job title, then searches attendance for person + those courses
router.get("/search/attendance/:personId/:jobTitle", (req, res) => {
  const connection = getConnection();
  const { personId, jobTitle } = req.params;

  if (!personId || !jobTitle) {
    return res
      .status(400)
      .json({ error: "personId and jobTitle are required" });
  }

  connection.connect((err) => {
    if (err) {
      console.error("[ctapersonskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    // First, get all SKILL_IDs for this JOB_TITLE
    const skillQuery = `
      SELECT DISTINCT SKILL_ID
      FROM JOB_SKILLS
      WHERE JOB_TITLE = ?
    `;

    connection.query(skillQuery, [jobTitle], (error, skills) => {
      if (error) {
        connection.end();
        console.error("[ctapersonskills.js] Query error:", error);
        return res.status(500).json({ error: "Failed to fetch job skills" });
      }

      if (!skills || skills.length === 0) {
        connection.end();
        return res.json([]); // No skills for this job title
      }

      // Extract course codes from SKILL_IDs (third element after splitting on '-')
      const courseCodes = skills.map((s) => {
        const parts = s.SKILL_ID.split("-");
        return parts.length > 2 ? parts[2] : s.SKILL_ID;
      });

      // Now query CTA_ATTENDANCE for this person and any of these course codes
      const placeholders = courseCodes.map(() => "?").join(",");
      const attendanceQuery = `
        SELECT 
          ca.COURSE_ATND_ID,
          ca.COURSE_ID,
          ca.DATE_TIME,
          ca.PEOPLE_ID,
          ca.INSTRUCTOR,
          ca.MINUTES,
          ca.CREATE_BY,
          ca.CREATED_DATE,
          cal.CTA_ATTENDANCE_LINK
        FROM CTA_ATTENDANCE ca
        LEFT JOIN CTA_ATTENDANCE_LINK cal ON ca.COURSE_ATND_ID = cal.COURSE_ATND_ID
        WHERE ca.PEOPLE_ID = ? AND ca.COURSE_ID IN (${placeholders})
        ORDER BY ca.DATE_TIME DESC
      `;

      const params = [personId, ...courseCodes];
      connection.query(attendanceQuery, params, (error, results) => {
        connection.end();

        if (error) {
          console.error("[ctapersonskills.js] Query error:", error);
          return res
            .status(500)
            .json({ error: "Failed to fetch attendance records" });
        }

        console.log(
          "[ctapersonskills.js] Retrieved",
          results.length,
          "attendance records for",
          personId,
          jobTitle,
        );
        res.json(results);
      });
    });
  });
});

module.exports = router;
