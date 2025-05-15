const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const User = require("../models/User");

// POST /api/tasks/add
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

// GET /api/tasks/my?email=buyer@example.com
router.get("/my", async (req, res) => {
  try {
    const email = req.query.email;
    const tasks = await Task.find({ buyer_email: email }).sort({ created_at: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to load tasks", error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting task", error: err.message });
  }
});



module.exports = router;
