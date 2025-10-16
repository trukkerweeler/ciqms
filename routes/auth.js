const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

const mysql = require("mysql2");

// Database connection helper
const createConnection = () => {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
};

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  try {
    const connection = createConnection();

    connection.connect(async (err) => {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return res.status(500).json({ message: "Database connection error" });
      }

      // Check if user already exists
      const checkQuery = `SELECT * FROM USERS WHERE USER_ID = ?`;

      connection.query(checkQuery, [username], async (err, rows) => {
        if (err) {
          console.error("Database query error:", err);
          connection.end();
          return res.status(500).json({ message: "Database error" });
        }

        if (rows.length > 0) {
          connection.end();
          return res.status(400).json({ message: "User already exists" });
        }

        try {
          const hashedPassword = await bcrypt.hash(password, 10);

          const insertQuery = `INSERT INTO USERS (USER_ID, USER_PWD) VALUES (?, ?)`;
          const values = [username, hashedPassword];

          connection.query(insertQuery, values, (err, result) => {
            connection.end();

            if (err) {
              console.error("Insert error:", err);
              return res.status(500).json({ message: "Failed to create user" });
            }

            res.status(201).json({ message: "User registered successfully" });
          });
        } catch (hashErr) {
          console.error("Password hashing error:", hashErr);
          connection.end();
          res.status(500).json({ message: "Server error" });
        }
      });
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================================================
// POST /auth/login
router.post("/login", async (req, res) => {
  // Check if the request body contains username and password
  if (!req.body || !req.body.username || !req.body.password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  const { username, password } = req.body;

  try {
    const connection = createConnection();

    connection.connect((err) => {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return res.status(500).json({ message: "Database connection error" });
      }

      const query = `SELECT * FROM USERS WHERE USER_ID = ?`;
      const values = [username];

      connection.query(query, async (err, rows) => {
        if (err) {
          console.error("Database query error:", err);
          connection.end();
          return res.status(500).json({ message: "Database error" });
        }

        if (rows.length === 0) {
          connection.end();
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = rows[0];

        try {
          const passwordMatch = await bcrypt.compare(password, user.USER_PWD);

          if (passwordMatch) {
            req.session.user = { username: user.USER_ID };
            connection.end();
            res.json({
              message: "Logged in",
              user: { username: user.USER_ID },
            });
          } else {
            connection.end();
            res.status(401).json({ message: "Invalid credentials" });
          }
        } catch (bcryptErr) {
          console.error("Password comparison error:", bcryptErr);
          connection.end();
          res.status(500).json({ message: "Authentication error" });
        }
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ========================================================
// POST /auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid"); // optional
    res.sendStatus(200);
  });
});

// ========================================================
// Middleware to check if user is logged in
router.get("/status", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
