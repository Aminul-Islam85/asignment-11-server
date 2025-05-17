const express = require("express");
const router = express.Router();
const Submission = require("../models/Submission");
const Task = require("../models/Task");
const User = require("../models/User");
const WithdrawRequest = require("../models/WithdrawRequest");

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

// ✅ POST /api/submissions
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

// ✅ GET /api/submissions/task/:id
router.get("/submissions/task/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const submissions = await Submission.find({ task_id: taskId }).sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: "Failed to load submissions", error: err.message });
  }
});

// ✅ PUT /api/submissions/:id/status - Approve/Reject + pay worker
router.put("/submissions/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Prevent duplicate processing
    if (submission.status === "approved" || submission.status === "rejected") {
      return res.status(400).json({ message: "Submission already processed." });
    }

    // Update status
    submission.status = status;
    await submission.save();

    if (status === "approved") {
      const task = await Task.findById(submission.task_id);
      if (!task) return res.status(404).json({ message: "Task not found" });

      const worker = await User.findOne({ email: submission.worker_email });
      if (!worker) return res.status(404).json({ message: "Worker not found" });

      worker.coins += task.payable_amount;
      await worker.save();
    }

    res.json({ message: "Submission status updated", submission });
  } catch (err) {
    res.status(500).json({ message: "Failed to update status", error: err.message });
  }
});

// ✅ POST /api/tasks/withdraw
router.post("/withdraw", async (req, res) => {
  try {
    const { email, amount, method } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.role !== "worker") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (user.coins < amount) {
      return res.status(400).json({ message: "Not enough coins to withdraw." });
    }

    // Deduct coins
    user.coins -= amount;
    await user.save();

    // Save withdrawal request
    const request = new WithdrawRequest({ email, amount, method });
    await request.save();

    res.status(201).json({ message: "Withdrawal request submitted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit request", error: err.message });
  }
});

// ✅ POST /api/tasks/purchase
router.post("/purchase", async (req, res) => {
  try {
    const { email, coins } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can purchase coins." });
    }

    user.coins += coins;
    await user.save();

    res.json({ message: `Successfully purchased ${coins} coins.` });
  } catch (err) {
    res.status(500).json({ message: "Purchase failed", error: err.message });
  }
});

// ✅ GET /api/tasks/withdraw-requests (Admin view)
router.get("/withdraw-requests", async (req, res) => {
  try {
    const requests = await WithdrawRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
});

// ✅ DELETE /api/tasks/withdraw-requests/:id (Admin delete)
router.delete("/withdraw-requests/:id", async (req, res) => {
  try {
    await WithdrawRequest.findByIdAndDelete(req.params.id);
    res.json({ message: "Request removed" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete request", error: err.message });
  }
});

// ✅ GET /api/auth/submissions - Admin view of all submissions
router.get("/all-submissions", async (req, res) => {
  try {
    const submissions = await Submission.find().sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch submissions", error: err.message });
  }
});


module.exports = router;
