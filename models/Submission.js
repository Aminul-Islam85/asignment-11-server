const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  task_title: String,
  buyer_email: String,
  worker_email: String,
  worker_name: String,
  proof: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
}, { timestamps: true });

module.exports = mongoose.model("Submission", submissionSchema);
