import Leave from "../models/leave.js";

export const applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const leave = await Leave.create({
      employee: req.user.userId,
      leaveType,
      startDate,
      endDate,
      reason
    });

    res.status(201).json({
      success: true,
      leave
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ employee: req.user.userId });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getAllLeaves = async (req, res) => {
  try {
    if (req.user.role === "employee") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const leaves = await Leave.find().populate("employee", "name email");
    res.json(leaves);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (req.user.role === "employee") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    leave.status = status;
    await leave.save();

    res.json({
      success: true,
      leave
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;

    // employee not allowed
    if (req.user.role === "employee") {
      return res.status(403).json({ message: "Not authorized to delete leave" });
    }

    const leave = await Leave.findById(id);

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    await leave.deleteOne();

    res.json({
      success: true,
      message: "Leave deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};