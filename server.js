const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Important for Render
app.set("trust proxy", 1);

app.use(
  session({
    secret: "hospital_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
    },
  })
);

// ================= USERS =================
const users = [
  { username: "doctor", password: "123", role: "doctor" },
  { username: "staff", password: "123", role: "staff" },
];

// ================= ROLE MIDDLEWARE =================
function requireRole(role) {
  return (req, res, next) => {
    if (req.session.user && req.session.user.role === role) {
      next();
    } else {
      res.redirect("/login");
    }
  };
}

// ================= STATIC FILES =================
app.use(express.static(path.join(__dirname, "public")));

const file = "./queue.json";

// ================= LOGIN ROUTES =================
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

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

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.get("/me", (req, res) => {
  res.json(req.session.user || null);
});

// ================= PROTECTED ROUTES =================
app.get("/doctor", requireRole("doctor"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "doctor.html"));
});

app.get("/staff", requireRole("staff"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "staff.html"));
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

// ================= QUEUE LOGIC =================

// Get Queue Status
app.get("/status", (req, res) => {
  const data = JSON.parse(fs.readFileSync(file));

  const waitingPatients = data.lastToken - data.current;

  res.json({
    currentToken: data.current,
    lastToken: data.lastToken,
    waitingPatients: waitingPatients,
  });
});

// Take Token (Patient)
app.post("/token", (req, res) => {
  const data = JSON.parse(fs.readFileSync(file));

  data.lastToken += 1;

  fs.writeFileSync(file, JSON.stringify(data));

  const queuePosition = data.lastToken - data.current;
  const estimatedWaitingTime = queuePosition * 5; // 5 minutes per patient

  res.json({
    tokenNumber: data.lastToken,
    queuePosition: queuePosition,
    estimatedWaitingTime: estimatedWaitingTime,
  });
});

// Doctor Calls Next
app.post("/next", requireRole("doctor"), (req, res) => {
  const data = JSON.parse(fs.readFileSync(file));

  if (data.current < data.lastToken) {
    data.current += 1;
    fs.writeFileSync(file, JSON.stringify(data));
  }

  res.json({
    currentToken: data.current,
  });
});

// Staff Reset Queue
app.post("/reset", requireRole("staff"), (req, res) => {
  const newData = { current: 0, lastToken: 0 };
  fs.writeFileSync(file, JSON.stringify(newData));

  res.json({ success: true });
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});