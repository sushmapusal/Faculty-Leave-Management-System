const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const User = require("./models/user");
const Leave = require("./models/leave");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://localhost:27017/facultyDB")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


// ================= LOGIN =================
app.post("/api/login", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // Check if selected role matches actual role in database
    if (user.role !== role) {
      return res.status(400).json({ message: "Invalid role selected" });
    }
    res.json({ username: user.username, role: user.role });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= APPLY LEAVE =================
app.post("/api/apply", async (req, res) => {
  try {
    const { username, fromDate, toDate, reason } = req.body;

    const start = new Date(fromDate);
    const end = new Date(toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reject past date applications
    if (start < today) {
      return res.status(400).json({ message: "Cannot apply leave for past dates" });
    }

    if (end < start) {
      return res.status(400).json({ message: "To Date must be after From Date" });
    }

    const totalDays = (end - start) / (1000 * 60 * 60 * 24) + 1;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Count Approved + Pending for deduction (pending leaves are already "used")
    const monthlyLeaves = await Leave.find({
      username,
      status: { $in: ["Approved", "Pending"] },
      createdAt: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lte: new Date(currentYear, currentMonth + 1, 0)
      }
    });

    const usedDays = monthlyLeaves.reduce(
      (sum, leave) => sum + leave.totalDays, 0
    );

    const user = await User.findOne({ username });

    let deduction = 0;

    // If exceeds 3 free days
    if (usedDays + totalDays > 3) {
      const extraDays = usedDays + totalDays - 3;
      const perDaySalary = user.salary / 30;
      deduction = extraDays * perDaySalary;
      user.salary -= deduction;
      await user.save();
    }

    const newLeave = new Leave({
      username,
      fromDate,
      toDate,
      reason,
      totalDays,
      deduction,       // store deduction in leave record
      status: "Pending"
    });

    await newLeave.save();

    res.json({ message: "Leave Applied Successfully", deduction });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= REMAINING DAYS =================
app.get("/api/remaining/:username", async (req, res) => {
  try {
    const username = req.params.username;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Only count Approved leaves — Rejected leaves should NOT reduce free days
    const monthlyLeaves = await Leave.find({
      username,
      status: "Approved",
      createdAt: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lte: new Date(currentYear, currentMonth + 1, 0)
      }
    });

    const usedDays = monthlyLeaves.reduce(
      (sum, leave) => sum + leave.totalDays, 0
    );

    res.json({
      usedDays,
      remainingDays: Math.max(3 - usedDays, 0)
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= USER INFO =================
app.get("/api/userinfo/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ username: user.username, salary: user.salary });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= HISTORY =================
app.get("/api/history/:username", async (req, res) => {
  try {
    const leaves = await Leave.find({ username: req.params.username });
    res.json(leaves);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= ADMIN VIEW =================
app.get("/api/all", async (req, res) => {
  try {
    const leaves = await Leave.find();
    res.json(leaves);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= APPROVE / REJECT =================
app.put("/api/update/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const leave = await Leave.findById(req.params.id);

    if (!leave) return res.status(404).json({ message: "Leave not found" });

    // If admin REJECTS a leave that had a deduction → refund salary
    if (status === "Rejected" && leave.status === "Pending" && leave.deduction > 0) {
      const user = await User.findOne({ username: leave.username });
      if (user) {
        user.salary += leave.deduction;
        await user.save();
      }
    }

    leave.status = status;
    await leave.save();

    res.json({ message: "Status Updated" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});


app.listen(5000, () =>
  console.log("Server running on port 5000")
);