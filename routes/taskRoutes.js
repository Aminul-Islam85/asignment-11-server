const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const Task = require("../models/Task");
const User = require("../models/User");

// ✅ POST /api/tasks/add
router.post("/add", async (req, res) => {
  try {
    const {
      task_title,
      task_detail,
      required_workers,
      payable_amount,
      completion_date,
      submission_info,
      task_image_url,
      buyer_email,
    } = req.body;

    const total_payable = required_workers * payable_amount;

    const buyer = await User.findOne({ email: buyer_email });

    if (!buyer || buyer.role !== "buyer") {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    if (buyer.coins < total_payable) {
      return res.status(400).json({
        message: "Not enough coins. Please purchase more.",
        redirect: "/dashboard/payments",
      });
    }

    // Deduct coins
    buyer.coins -= total_payable;
    await buyer.save();

    // Create task
    const task = new Task({
      task_title,
      task_detail,
      required_workers,
      payable_amount,
      total_payable,
      completion_date,
      submission_info,
      task_image_url,
      buyer_email: buyer.email,
      buyer_name: buyer.name,
      buyer_id: buyer._id,
    });

    await task.save();

    res.status(201).json({ message: "Task created successfully", task });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ GET /api/tasks/my?email=buyer@example.com
router.get("/my", async (req, res) => {
  try {
    const email = req.query.email;
    const tasks = await Task.find({ buyer_email: email }).sort({ created_at: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to load tasks", error: err.message });
  }
});

// ✅ DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting task", error: err.message });
  }
});

// ✅ PUT /api/tasks/:id
router.put("/:id", async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTask) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task updated successfully", task: updatedTask });
  } catch (err) {
    res.status(500).json({ message: "Failed to update task", error: err.message });
  }
});

// ✅ GET /api/tasks/available
router.get("/available", async (req, res) => {
  try {
    const tasks = await Task.find({});
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks", error: err.message });
  }
});

// ✅ POST /api/submissions (Worker submits task proof)
router.post("/submissions", async (req, res) => {
  try {
    const { task_id, worker_email, worker_name, proof } = req.body;

    const task = await Task.findById(task_id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const submission = new Submission({
      task_id,
      task_title: task.task_title,
      buyer_email: task.buyer_email,
      worker_email,
      worker_name,
      proof,
      status: "pending",
    });

    await submission.save();

    res.status(201).json({ message: "Submission successful", submission });
  } catch (err) {
    res.status(500).json({ message: "Submission failed", error: err.message });
  }
});

// ✅ GET /api/submissions/worker/:email
router.get("/submissions/worker/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const submissions = await Submission.find({ worker_email: email }).sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch submissions", error: err.message });
  }
});

// ✅ GET /api/submissions/task/:id - Buyer views all submissions for a specific task
router.get("/submissions/task/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const submissions = await Submission.find({ task_id: taskId }).sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: "Failed to load submissions", error: err.message });
  }
});

// ✅ PUT /api/submissions/:id/status - Update submission status (approve/reject)
router.put("/submissions/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Submission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json({ message: "Submission status updated", submission: updated });
  } catch (err) {
    res.status(500).json({ message: "Failed to update status", error: err.message });
  }
});



module.exports = router;
