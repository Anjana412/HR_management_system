import Project from "../models/project.js";
import User from "../models/user.js";
import { createNotification } from "./notificationcontroller.js";

// Who can create/edit/delete projects
const CREATE_ROLES  = ["admin", "projectmanager"];
// Who can assign members
const ASSIGN_ROLES  = ["admin", "projectmanager"];
// Who can view all projects
const VIEW_ALL_ROLES = ["admin", "manager", "hr"];

// ── Auto-generate project code ───────────────────────────────
const generateProjectCode = async () => {
  const count = await Project.countDocuments();
  return "PRJ" + String(count + 1).padStart(4, "0"); // PRJ0001, PRJ0002...
};

// ================= CREATE PROJECT =================
export const createProject = async (req, res) => {
  try {
    const {
      name, category, description, notes,
      priority, startDate, deadline,
      coordinators,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    if (!CREATE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Only Admin and Project Managers can create projects" });
    }

    // Handle file upload via multer/Cloudinary
    const projectFile = req.file?.path || "";

    // Auto-generate project code
    const projectCode = await generateProjectCode();

    // Build members array from assigned roles
    const members = [];
    const parseIds = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return [val]; }
    };

    parseIds(coordinators).forEach(id => members.push({ user: id, roleInProject: "projectcoordinator" }));

    const project = await Project.create({
      name, projectCode, category, description, notes,
      priority: priority || "medium",
      status:   "active", // always starts as active — only Admin/manager can change
      startDate: startDate || new Date().toISOString().split("T")[0],
      deadline,
      projectFile,
      createdBy: req.user.userId,
      members,
    });

    // Notify all assigned members
    for (const member of members) {
      await createNotification({
        recipient: member.user,
        message:   `You have been assigned to the project: "${name}"`,
        type:      "info"
      });
    }

    res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    res.status(500).json({ message: "Failed to create project", error: error.message });
  }
};

// ================= GET ALL PROJECTS =================
// Admin / manager / HR see all projects
export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("createdBy", "name usertype")
      .populate("members.user", "name email usertype photo")
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET MY PROJECTS =================
// PM / Coordinator / TeamLead / Employee see only projects they are members of
export const getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { createdBy: req.user.userId },
        { "members.user": req.user.userId },
      ]
    })
      .populate("createdBy", "name usertype")
      .populate("members.user", "name email usertype photo")
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET PROJECT BY ID =================
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("createdBy", "name usertype photo")
      .populate("members.user", "name email usertype photo department employeeId");

    if (!project) return res.status(404).json({ message: "Project not found" });

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= UPDATE PROJECT =================
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, status } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!CREATE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized to update projects" });
    }

    if (name)        project.name        = name;
    if (description) project.description = description;
    if (startDate)   project.startDate   = startDate;
    if (endDate)     project.endDate     = endDate;

    // Only admin or manager can change project status
    if (status && ["admin", "manager"].includes(req.user.role)) {
      project.status = status;
    }

    await project.save();
    res.json({ success: true, message: "Project updated", project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= DELETE PROJECT =================
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!CREATE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized to delete projects" });
    }

    await project.deleteOne();
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= ASSIGN MEMBER =================
export const assignMember = async (req, res) => {
  try {
    const { id } = req.params; // project id
    const { userId, roleInProject } = req.body;

    if (!userId) return res.status(400).json({ message: "userId is required" });

    if (!ASSIGN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized to assign members" });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Check if already a member
    const alreadyMember = project.members.some(
      m => m.user.toString() === userId
    );
    if (alreadyMember) {
      return res.status(400).json({ message: "User is already a member of this project" });
    }

    project.members.push({ user: userId, roleInProject: roleInProject || "employee" });
    await project.save();

    // Notify the assigned user
    await createNotification({
      recipient: userId,
      message:   `You have been assigned to the project: "${project.name}"`,
      type:      "info"
    });

    const updated = await Project.findById(id)
      .populate("members.user", "name email usertype photo");

    res.json({ success: true, message: "Member assigned successfully", project: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= REMOVE MEMBER =================
export const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    if (!ASSIGN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized to remove members" });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.members = project.members.filter(
      m => m.user.toString() !== userId
    );
    await project.save();

    res.json({ success: true, message: "Member removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};