const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  salary: Number
});

module.exports = mongoose.model("User", userSchema);