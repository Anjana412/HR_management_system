import Leave from "../models/leave.js";
import User from "../models/user.js";
import { createNotification } from "./notificationcontroller.js";

// Who can approve whose leave
const APPROVAL_CHAIN = {
  employee:           "teamlead",
  teamlead:           "projectcoordinator",
  projectcoordinator: "projectmanager",
  projectmanager:     "hr",
  hr:                 "manager",
  manager:           "admin",
};

export const applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find who should approve this leave (direct manager via reportsTo)
    const applicant = await User.findById(req.user.userId);
    const approverRole = APPROVAL_CHAIN[applicant?.usertype] || "hr";

    // Find the direct manager (reportsTo)
    let approver = null;
    if (applicant?.reportsTo) {
      approver = await User.findById(applicant.reportsTo);
    }
    // Fallback: find any user with the approver role
    if (!approver) {
      approver = await User.findOne({ usertype: approverRole });
    }

    const leave = await Leave.create({
      employee: req.user.userId,
      leaveType, startDate, endDate, reason,
      approverRole,
      approver: approver?._id || null,
    });

    // Notify the approver
    if (approver) {
      await createNotification({
        recipient: approver._id,
        message:   `${applicant.name} has submitted a leave request for your approval.`,
        type:      "alert"
      });
    }

    // Also notify HR always
    const hrUsers = await User.find({ usertype: "hr" });
    for (const hr of hrUsers) {
      if (hr._id.toString() !== approver?._id?.toString()) {
        await createNotification({
          recipient: hr._id,
          message:   `Leave request submitted by ${applicant.name}.`,
          type:      "alert"
        });
      }
    }

    res.status(201).json({ success: true, leave });
  } catch (error) {
    console.error("Apply leave error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ employee: req.user.userId })
      .populate("approver", "name usertype")
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get leaves that the logged-in user needs to approve
export const getPendingApprovals = async (req, res) => {
  try {
    const leaves = await Leave.find({ approver: req.user.userId })
      .populate("employee", "name email usertype photo department employeeId")
      .sort({ createdAt: -1 });
    res.json({ success: true, leaves });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// HR/Admin can see all leaves
export const getAllLeaves = async (req, res) => {
  try {
    const allowedRoles = ["admin", "hr", "manager"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const leaves = await Leave.find()
      .populate("employee", "name email usertype photo")
      .populate("approver",  "name usertype")
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const leave = await Leave.findById(id).populate("employee", "name usertype");
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    // Check authorization — must be the assigned approver or HR/Admin
    const isApprover  = leave.approver?.toString() === req.user.userId;
    const isHRAdmin   = ["hr", "admin", "manager"].includes(req.user.role);

    if (!isApprover && !isHRAdmin) {
      return res.status(403).json({ message: "Not authorized to approve this leave" });
    }

    leave.status = status;
    await leave.save();

    // Notify the employee
    await createNotification({
      recipient: leave.employee._id,
      message:   `Your leave request has been ${status}.`,
      type:      status === "approved" ? "success" : "alert"
    });

    res.json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;
    if (!["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized to delete leave" });
    }
    const leave = await Leave.findById(id);
    if (!leave) return res.status(404).json({ message: "Leave not found" });
    await leave.deleteOne();
    res.json({ success: true, message: "Leave deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};