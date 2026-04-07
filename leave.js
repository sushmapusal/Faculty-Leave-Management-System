const mongoose = require("mongoose");

const LeaveSchema = new mongoose.Schema({
  username: String,
  fromDate: Date,
  toDate: Date,
  reason: String,
  totalDays: Number,
  deduction: {
    type: Number,
    default: 0        // stores how much salary was deducted for this leave
  },
  status: {
    type: String,
    default: "Pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Leave", LeaveSchema);