const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

// fetch users from a database or in-memory store
let userUrl = `http://localhost:${process.env.APP_PORT}/user`;
let users = [];
(async () => {
  users = await fetch(userUrl).then((res) => res.json());
})();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const existingUser = users.find((user) => user.USER_ID === username);

  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  res.status(201).json({ message: "User registered" });
});

// =======================================================
// POST /auth/login
router.post("/login", async (req, res) => {
  // Check if the request body contains username and password
  if (!req.body || !req.body.username || !req.body.password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  // Destructure username and password from the request body
  const { username, password } = req.body;

  // Find the user in the users array
  const user = users.find((u) => u.USER_ID === username);


  // Check if user exists and if the password matches
  if (!user) {
    console.log("User not found");
  } else {
    const passwordMatch = await bcrypt.compare(password, user.PASSWORD);
    // console.log("Password Match:", passwordMatch);
  }

  if (!user || !(await bcrypt.compare(password, user.PASSWORD))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  req.session.user = { username };
  res.json({ message: "Logged in" });
});


// ========================================================
// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid'); // optional
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
