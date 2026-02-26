const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

const file = "./queue.json";

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

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});