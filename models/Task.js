const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  task_title: String,
  task_detail: String,
  required_workers: Number,
  payable_amount: Number,
  total_payable: Number,
  completion_date: String,
  submission_info: String,
  task_image_url: String,
  buyer_email: String,
  buyer_name: String,
  buyer_id: mongoose.Schema.Types.ObjectId,
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Task", taskSchema);
