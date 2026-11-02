import Task from "../models/task.js";
import User from "../models/user.js";
import Project from "../models/project.js";
import { createNotification } from "./notificationcontroller.js";

const MANAGE_ROLES = ["admin", "hr", "manager", "projectmanager", "projectcoordinator", "teamlead"];

// ================= CREATE TASK =================
export const createTask = async (req, res) => {
  try {
    const {
      title, description, assignedTo, dueDate, startDate,
      priority, category, estimatedHours, remarks, project
    } = req.body;

    if (!title || !assignedTo) {
      return res.status(400).json({ message: "Title and AssignedTo are required" });
    }

    // If project is provided, verify it exists and user is a member/creator
    if (project) {
      const proj = await Project.findById(project);
      if (!proj) return res.status(404).json({ message: "Project not found" });

      const isMember  = proj.members.some(m => m.user.toString() === req.user.userId);
      const isCreator = proj.createdBy.toString() === req.user.userId;
      const isAdmin   = ["admin", "hr", "manager"].includes(req.user.role);

      if (!isMember && !isCreator && !isAdmin) {
        return res.status(403).json({ message: "You are not part of this project" });
      }
    }

    const task = await Task.create({
      title, description, assignedTo,
      dueDate, startDate, priority,
      category:       category       || "other",
      estimatedHours: estimatedHours || 0,
      remarks:        remarks        || "",
      project:        project        || null,
      assignedBy:     req.user.userId
    });

    // Notify assigned user
    await createNotification({
      recipient: assignedTo,
      message:   `You have been assigned a new task: "${title}"`,
      type:      "info"
    });

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Failed to create task", error: error.message });
  }
};

// ================= GET ALL TASKS =================
export const getAllTasks = async (req, res) => {
  try {
    let query = {};

    // Employees only see their own tasks
    if (req.user.role === "employee") {
      query = { assignedTo: req.user.userId };
    }

    // Team lead sees tasks they assigned OR assigned to them
    if (req.user.role === "teamlead") {
      query = {
        $or: [
          { assignedTo: req.user.userId },
          { assignedBy: req.user.userId }
        ]
      };
    }

    // Filter by project if provided
    if (req.query.project) {
      query.project = req.query.project;
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "name email photo usertype")
      .populate("assignedBy", "name usertype")
      .populate("project", "name projectCode")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET TASKS BY PROJECT =================
export const getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const tasks = await Task.find({ project: projectId })
      .populate("assignedTo", "name email photo usertype")
      .populate("assignedBy", "name usertype")
      .sort({ createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET TASK BY ID =================
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email photo usertype")
      .populate("assignedBy", "name usertype")
      .populate("project",    "name projectCode status");

    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= UPDATE TASK =================
export const updateTask = async (req, res) => {
  try {
    const { status, feedback, priority, dueDate, actualHours, remarks } = req.body;
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate("assignedTo", "name")
      .populate("assignedBy", "name");
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Employee can only update their own task status
    if (req.user.role === "employee" && task.assignedTo._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (status       !== undefined) task.status       = status;
    if (feedback     !== undefined) task.feedback      = feedback;
    if (priority     !== undefined) task.priority      = priority;
    if (dueDate      !== undefined) task.dueDate       = dueDate;
    if (actualHours  !== undefined) task.actualHours   = actualHours;
    if (remarks      !== undefined) task.remarks       = remarks;

    // Set completedAt when marked complete
    if (status === "completed" && !task.completedAt) {
      task.completedAt = new Date();
    }

    await task.save();

    // Notify HR and assignedBy when task is completed
    if (status === "completed") {
      const hrUsers = await User.find({ usertype: "hr" });
      for (const hr of hrUsers) {
        await createNotification({
          recipient: hr._id,
          message:   `${task.assignedTo.name} completed the task: "${task.title}"`,
          type:      "success"
        });
      }
      // Also notify the person who assigned it
      if (task.assignedBy._id.toString() !== req.user.userId) {
        await createNotification({
          recipient: task.assignedBy._id,
          message:   `${task.assignedTo.name} completed the task: "${task.title}"`,
          type:      "success"
        });
      }
    }

    // Notify employee when feedback is added
    if (feedback !== undefined && req.user.role !== "employee") {
      await createNotification({
        recipient: task.assignedTo._id,
        message:   `Feedback added on your task "${task.title}"`,
        type:      "info"
      });
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= DELETE TASK =================
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (req.user.role === "employee") return res.status(403).json({ message: "Not authorized" });
    await task.deleteOne();
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= UPLOAD TASK PROOF =================
export const uploadTaskProof = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id).populate("assignedTo", "name");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isManager         = MANAGE_ROLES.includes(req.user.role);
    const isAssignedEmployee = task.assignedTo._id.toString() === req.user.userId;

    if (!isManager && !isAssignedEmployee) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    task.proofFiles.push({ url: req.file.path, name: req.file.originalname });
    await task.save();

    // Notify HR and task assigner
    const hrUsers = await User.find({ usertype: "hr" });
    for (const hr of hrUsers) {
      await createNotification({
        recipient: hr._id,
        message:   `${task.assignedTo.name} uploaded proof for task "${task.title}"`,
        type:      "info"
      });
    }

    res.json({ success: true, message: "Proof uploaded", proofFiles: task.proofFiles });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};