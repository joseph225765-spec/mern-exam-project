const Application = require("./Application");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? "ok" : "disconnected",
  });
});

async function start() {
  app.get("/api/applications", async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.company) {
      const escaped = req.query.company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.company = { $regex: escaped, $options: "i" };
    }

    const applications = await Application.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Applications retrieved",
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not retrieve applications",
      data: null,
    });
  }
});
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}

start();