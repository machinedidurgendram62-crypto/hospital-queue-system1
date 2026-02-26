const session = require("express-session");
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: "hospital_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// Dummy Users
const users = [
  { username: "doctor", password: "123", role: "doctor" },
  { username: "staff", password: "123", role: "staff" },
];

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

const file = "./queue.json";


// ================= LOGIN ROUTES =================

// Show login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Handle login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    req.session.user = user;
    return res.json({ success: true, role: user.role });
  } else {
    return res.json({ success: false });
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Protect Doctor Page
app.get("/doctor", (req, res) => {
  if (req.session.user && req.session.user.role === "doctor") {
    res.sendFile(path.join(__dirname, "public", "doctor.html"));
  } else {
    res.redirect("/login");
  }
});

// Protect Staff Page
app.get("/staff", (req, res) => {
  if (req.session.user && req.session.user.role === "staff") {
    res.sendFile(path.join(__dirname, "public", "staff.html"));
  } else {
    res.redirect("/login");
  }
});

// Redirect Home to Login
app.get("/", (req, res) => {
  res.redirect("/login");
});


// ================= QUEUE ROUTES =================

// Get queue status
app.get("/status", (req, res) => {
  const data = JSON.parse(fs.readFileSync(file));
  res.json(data);
});

// Take token
app.post("/token", (req, res) => {
  const data = JSON.parse(fs.readFileSync(file));
  data.lastToken += 1;
  fs.writeFileSync(file, JSON.stringify(data));
  res.json({ token: data.lastToken });
});

// Call next patient
app.post("/next", (req, res) => {
  const data = JSON.parse(fs.readFileSync(file));
  if (data.current < data.lastToken) {
    data.current += 1;
    fs.writeFileSync(file, JSON.stringify(data));
  }
  res.json(data);
});


// ================= SERVER =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});