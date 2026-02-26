const session = require("express-session");
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: "hospital_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// Hardcoded users
const users = [
  { username: "doctor", password: "123", role: "doctor" },
  { username: "staff", password: "123", role: "staff" },
];

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

const file = "./queue.json";

// Helper function
function getData() {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return { current: 0, lastToken: 0 };
  }
}

function saveData(data) {
  fs.writeFileSync(file, JSON.stringify(data));
}

/* ---------------- LOGIN ---------------- */

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    req.session.user = user;
    res.json({ success: true, role: user.role });
  } else {
    res.json({ success: false });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login.html");
});

/* ---------------- QUEUE ---------------- */

// Get queue status
app.get("/status", (req, res) => {
  const data = getData();

  res.json({
    currentToken: data.current,
    lastToken: data.lastToken,
    waitingPatients: data.lastToken - data.current,
  });
});

// Take token
app.post("/token", (req, res) => {
  const data = getData();

  data.lastToken += 1;
  saveData(data);

  const queuePosition = data.lastToken - data.current;
  const estimatedWaitingTime = queuePosition * 5;

  res.json({
    tokenNumber: data.lastToken,
    queuePosition: queuePosition,
    estimatedWaitingTime: estimatedWaitingTime,
  });
});

// Call next patient (Doctor/Staff)
app.post("/next", (req, res) => {
  const data = getData();

  if (data.current < data.lastToken) {
    data.current += 1;
    saveData(data);
  }

  res.json({
    currentToken: data.current,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});