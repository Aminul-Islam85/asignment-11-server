const mongoose = require("mongoose");

const withdrawRequestSchema = new mongoose.Schema({
  email: String,
  amount: Number,
  method: String,
  status: {
    type: String,
    default: "pending", // pending, approved, rejected
  },
  requested_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("WithdrawRequest", withdrawRequestSchema);
