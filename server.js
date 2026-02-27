const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "hospital_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static(path.join(__dirname, "public")));

const usersFile = "./users.json";
const queueFile = "./queue.json";

/* ---------- Helpers ---------- */

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(usersFile));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function readQueue() {
  try {
    return JSON.parse(fs.readFileSync(queueFile));
  } catch {
    return { current: 0, lastToken: 0 };
  }
}

function saveQueue(data) {
  fs.writeFileSync(queueFile, JSON.stringify(data, null, 2));
}

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login.html");
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role)
      return res.send("Access Denied ❌");
    next();
  };
}

/* ---------- Registration ---------- */

app.post("/register", (req, res) => {
  const { username, password } = req.body;

  let users = readUsers();

  if (users.find((u) => u.username === username)) {
    return res.send("User already exists ❌");
  }

  users.push({
    username,
    password,
    role: "patient",
    tokens: []
  });

  saveUsers(users);

  res.redirect("/login.html");
});

/* ---------- Login ---------- */

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const users = readUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) return res.send("Invalid credentials ❌");

  req.session.user = user;

  if (user.role === "doctor") return res.redirect("/doctor");
  if (user.role === "admin") return res.redirect("/admin");
  return res.redirect("/patient");
});

/* ---------- Logout ---------- */

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login.html");
});

/* ---------- Protected Pages ---------- */

app.get("/patient", requireLogin, requireRole("patient"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "patient.html"));
});

app.get("/doctor", requireLogin, requireRole("doctor"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "doctor.html"));
});

app.get("/admin", requireLogin, requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

/* ---------- Queue ---------- */

app.post("/token", requireLogin, requireRole("patient"), (req, res) => {
  let queue = readQueue();
  queue.lastToken += 1;
  saveQueue(queue);

  let users = readUsers();
  const user = users.find((u) => u.username === req.session.user.username);

  user.tokens.push({
    token: queue.lastToken,
    date: new Date().toLocaleString()
  });

  saveUsers(users);

  res.json({
    tokenNumber: queue.lastToken,
    position: queue.lastToken - queue.current,
    waitingTime: (queue.lastToken - queue.current) * 5
  });
});

app.get("/status", (req, res) => {
  const queue = readQueue();
  res.json(queue);
});

app.post("/next", requireLogin, requireRole("doctor"), (req, res) => {
  let queue = readQueue();
  if (queue.current < queue.lastToken) {
    queue.current += 1;
    saveQueue(queue);
  }
  res.json(queue);
});

/* ---------- Token History ---------- */

app.get("/history", requireLogin, requireRole("patient"), (req, res) => {
  const users = readUsers();
  const user = users.find((u) => u.username === req.session.user.username);
  res.json(user.tokens);
});

/* ---------- Admin Dashboard ---------- */

app.get("/allUsers", requireLogin, requireRole("admin"), (req, res) => {
  const users = readUsers();
  res.json(users);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});