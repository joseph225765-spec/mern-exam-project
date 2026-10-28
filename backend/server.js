require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Application = require("./Application");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const Counter = mongoose.model(
  "Counter",
  new mongoose.Schema({
    _id: String,
    sequence: { type: Number, default: 0 },
  })
);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? "ok" : "disconnected",
  });
});

app.get("/api/applications", async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.company) {
      filter.company = {
        $regex: escapeRegex(req.query.company),
        $options: "i",
      };
    }

    const applications = await Application.find(filter).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      message: "Applications retrieved",
     data: applications.map((application) => ({
  ...application.toObject(),
  isOverdue:
    application.status === "Applied" &&
    new Date(application.followUpDate) < new Date(),
})),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not retrieve applications",
      data: null,
    });
  }
});

app.post("/api/applications", async (req, res) => {
  try {
    const { company, role, jobType, appliedDate, salary, notes } = req.body;

    if (
      typeof company !== "string" ||
      !company.trim() ||
      typeof role !== "string" ||
      !role.trim() ||
      !appliedDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Company, role, and applied date are required",
        data: null,
      });
    }

    if (!["Full-time", "Internship", "Contract"].includes(jobType)) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid job type",
        data: null,
      });
    }

    const date = new Date(appliedDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (Number.isNaN(date.getTime()) || date > today) {
      return res.status(400).json({
        success: false,
        message: "Applied date must be valid and cannot be in the future",
        data: null,
      });
    }

    const cleanCompany = company.trim();
    const cleanRole = role.trim();

    const duplicate = await Application.findOne({
      company: {
        $regex: `^${escapeRegex(cleanCompany)}$`,
        $options: "i",
      },
      role: {
        $regex: `^${escapeRegex(cleanRole)}$`,
        $options: "i",
      },
      status: { $in: ["Applied", "Interview", "Offer"] },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "An active application for this company and role already exists",
        data: null,
      });
    }

    const prefix = cleanCompany.slice(0, 3).toUpperCase();
    const counter = await Counter.findByIdAndUpdate(
      cleanCompany.toLowerCase(),
      { $inc: { sequence: 1 } },
      { upsert: true, new: true }
    );

    const followUpDate = new Date(date);
    followUpDate.setUTCDate(followUpDate.getUTCDate() + 7);

    const application = await Application.create({
      applicationId: `JA-${prefix}-${String(counter.sequence).padStart(3, "0")}`,
      company: cleanCompany,
      role: cleanRole,
      jobType,
      appliedDate: date,
      followUpDate,
      salary: salary === "" || salary == null ? null : salary,
      notes: notes || "",
      status: "Applied",
      history: [{ status: "Applied", date: new Date() }],
    });

    res.status(201).json({
      success: true,
      message: "Application created",
      data: application,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
});
app.put("/api/applications/:id", async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
        data: null,
      });
    }

    const { company, role, jobType, salary, notes } = req.body;

    if (
      typeof company !== "string" || !company.trim() ||
      typeof role !== "string" || !role.trim() ||
      !["Full-time", "Internship", "Contract"].includes(jobType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a company, role, and valid job type",
        data: null,
      });
    }

    const cleanCompany = company.trim();
    const cleanRole = role.trim();

    if (["Applied", "Interview", "Offer"].includes(application.status)) {
      const duplicate = await Application.findOne({
        _id: { $ne: application._id },
        company: { $regex: `^${escapeRegex(cleanCompany)}$`, $options: "i" },
        role: { $regex: `^${escapeRegex(cleanRole)}$`, $options: "i" },
        status: { $in: ["Applied", "Interview", "Offer"] },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "An active application for this company and role already exists",
          data: null,
        });
      }
    }

    application.company = cleanCompany;
    application.role = cleanRole;
    application.jobType = jobType;
    application.salary = salary === "" || salary == null ? null : salary;
    application.notes = notes || "";
    await application.save();

    return res.json({
      success: true,
      message: "Application updated",
      data: application,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not update application",
      data: null,
    });
  }
});
async function start() {
  app.delete("/api/applications/:id", async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
        data: null,
      });
    }

    if (["Interview", "Offer"].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: "Applications in Interview or Offer cannot be deleted",
        data: null,
      });
    }

    await application.deleteOne();

    return res.json({
      success: true,
      message: "Application deleted",
      data: null,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not delete application",
      data: null,
    });
  }
});
  app.patch("/api/applications/:id/status", async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
        data: null,
      });
    }

    const allowed = {
      Applied: ["Interview", "Rejected"],
      Interview: ["Offer", "Rejected"],
      Offer: ["Accepted", "Declined"],
      Rejected: [],
      Accepted: [],
      Declined: [],
    };

    const nextStatus = req.body.status;

    if (!allowed[application.status].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "This status change is not allowed",
        data: null,
      });
    }

    application.status = nextStatus;
    application.history.push({ status: nextStatus, date: new Date() });
    await application.save();

    return res.json({
      success: true,
      message: "Status updated",
      data: application,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not update status",
      data: null,
    });
  }
});
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}

start();