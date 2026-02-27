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
const appointmentFile = "./appointments.json";

/* ---------------- HELPERS ---------------- */

function read(file, defaultValue) {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return defaultValue;
  }
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
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

/* ---------------- REGISTRATION ---------------- */

app.post("/register", (req, res) => {
  const { username, password, department } = req.body;

  let users = read(usersFile, []);

  if (users.find((u) => u.username === username))
    return res.send("User already exists ❌");

  users.push({
    username,
    password,
    role: "patient",
    department,
    tokens: []
  });

  write(usersFile, users);
  res.redirect("/login.html");
});

/* ---------------- LOGIN ---------------- */

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const users = read(usersFile, []);
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) return res.send("Invalid credentials ❌");

  req.session.user = user;

  if (user.role === "doctor") return res.redirect("/doctor");
  if (user.role === "admin") return res.redirect("/admin");
  return res.redirect("/patient");
});

/* ---------------- LOGOUT ---------------- */

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login.html");
});

/* ---------------- APPOINTMENTS ---------------- */

app.post("/book", requireLogin, requireRole("patient"), (req, res) => {
  const { date, time, reason } = req.body;

  let appointments = read(appointmentFile, []);

  appointments.push({
    id: Date.now(),
    patient: req.session.user.username,
    department: req.session.user.department,
    date,
    time,
    reason,
    status: "Pending"
  });

  write(appointmentFile, appointments);
  res.redirect("/patient");
});

app.get("/myAppointments", requireLogin, requireRole("patient"), (req, res) => {
  const appointments = read(appointmentFile, []);
  res.json(
    appointments.filter(
      (a) => a.patient === req.session.user.username
    )
  );
});

app.get("/appointments", requireLogin, requireRole("doctor"), (req, res) => {
  const appointments = read(appointmentFile, []);
  res.json(
    appointments.filter(
      (a) => a.department === req.session.user.department
    )
  );
});

app.post("/approve/:id", requireLogin, requireRole("doctor"), (req, res) => {
  let appointments = read(appointmentFile, []);
  const id = parseInt(req.params.id);

  appointments = appointments.map(a => {
    if (a.id === id) a.status = "Approved";
    return a;
  });

  write(appointmentFile, appointments);
  res.redirect("/doctor");
});

/* ---------------- ADMIN ---------------- */

app.get("/allUsers", requireLogin, requireRole("admin"), (req, res) => {
  res.json(read(usersFile, []));
});

/* ---------------- PAGES ---------------- */

app.get("/patient", requireLogin, requireRole("patient"), (req, res) =>
  res.sendFile(path.join(__dirname, "public/patient.html"))
);

app.get("/doctor", requireLogin, requireRole("doctor"), (req, res) =>
  res.sendFile(path.join(__dirname, "public/doctor.html"))
);

app.get("/admin", requireLogin, requireRole("admin"), (req, res) =>
  res.sendFile(path.join(__dirname, "public/admin.html"))
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running..."));