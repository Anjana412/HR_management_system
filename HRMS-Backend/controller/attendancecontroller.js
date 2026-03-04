import Attendance from "../models/attendance.js";

export const checkIn = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const existing = await Attendance.findOne({
      employee: req.user.userId,
      date: today
    });

    if (existing) {
      return res.status(400).json({ message: "Already checked in today" });
    }

    const attendance = await Attendance.create({
      employee: req.user.userId,
      date: today,
      checkIn: new Date()
    });

    res.status(201).json({
      success: true,
      attendance
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};





export const checkOut = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const attendance = await Attendance.findOne({
      employee: req.user.userId,
      date: today
    });

    if (!attendance) {
      return res.status(404).json({ message: "No check-in found for today" });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: "Already checked out" });
    }

    attendance.checkOut = new Date();
    await attendance.save();

    res.json({
      success: true,
      attendance
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({
      employee: req.user.userId
    }).sort({ date: -1 });

    res.json(records);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate("employee", "name email usertype") // Still 'employee' in DB
      .sort({ date: -1 });

    // Map the results so 'employee' becomes 'userId' for the Frontend
    const mappedRecords = records.map(record => ({
      ...record._doc,
      userId: record.employee // Rename for frontend
    }));

    res.json(mappedRecords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};