import Attendance from "../models/attendance.js";
import PDFDocument from 'pdfkit';
import cloudinary from "../config/cloudinary.js";
import streamifier from 'streamifier';

export const checkIn = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const existing = await Attendance.findOne({ employee: req.user.userId, date: today });
    if (existing) return res.status(400).json({ message: "Already checked in today" });

    const attendance = await Attendance.create({
      employee: req.user.userId,
      date: today,
      checkIn: new Date()
    });
    res.status(201).json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkOut = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const attendance = await Attendance.findOne({ employee: req.user.userId, date: today });
    if (!attendance) return res.status(404).json({ message: "No check-in found for today" });
    if (attendance.checkOut) return res.status(400).json({ message: "Already checked out" });

    // End any active break before checkout
    const activeBreak = attendance.breaks?.find(b => !b.endTime);
    if (activeBreak) {
      activeBreak.endTime = new Date();
      activeBreak.duration = Math.round((activeBreak.endTime - activeBreak.startTime) / (1000 * 60));
    }

    attendance.checkOut = new Date();
    await attendance.save();
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ employee: req.user.userId }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate("employee", "name email usertype")
      .sort({ date: -1 });
    res.json({ attendance: records });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const startBreak = async (req, res) => {
  try {
    const { breakType } = req.body;
    if (!["lunch", "tea"].includes(breakType)) {
      return res.status(400).json({ message: "Invalid break type" });
    }

    const today = new Date().toISOString().split("T")[0];
    const attendance = await Attendance.findOne({ employee: req.user.userId, date: today });

    if (!attendance) return res.status(400).json({ message: "Check in first" });
    if (attendance.checkOut) return res.status(400).json({ message: "Already checked out" });

    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (activeBreak) return res.status(400).json({ message: "Break already running" });

    attendance.breaks.push({ type: breakType, startTime: new Date() });
    await attendance.save();
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const endBreak = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const attendance = await Attendance.findOne({ employee: req.user.userId, date: today });
    if (!attendance) return res.status(404).json({ message: "No record found" });

    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (!activeBreak) return res.status(400).json({ message: "No active break" });

    activeBreak.endTime = new Date();
    activeBreak.duration = Math.round((activeBreak.endTime - activeBreak.startTime) / (1000 * 60));
    await attendance.save();
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportAttendancePDF = async (req, res) => {
  try {
    const { attendanceData } = req.body;
    if (!attendanceData || attendanceData.length === 0) {
      return res.status(400).json({ message: "No data to export" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="attendance_${Date.now()}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text("HRMS ATTENDANCE REPORT", { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    const colX = { name: 40, date: 170, checkIn: 270, checkOut: 360, breaks: 450, status: 660 };
    const rowHeight = 24;

    // Header row
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    doc.rect(40, doc.y, 730, rowHeight).fill('#1e293b');
    const headerY = doc.y - rowHeight + 7;
    doc.text("EMPLOYEE",  colX.name,     headerY)
       .text("DATE",      colX.date,     headerY)
       .text("CLOCK IN",  colX.checkIn,  headerY)
       .text("CLOCK OUT", colX.checkOut, headerY)
       .text("BREAKS",    colX.breaks,   headerY)
       .text("STATUS",    colX.status,   headerY);
    doc.moveDown(0.3);

    attendanceData.forEach((log, i) => {
      const name     = log.employee?.name || "Unknown";
      const date     = log.date     ? new Date(log.date).toLocaleDateString() : "N/A";
      const checkIn  = log.checkIn  ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
      const checkOut = log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
      const status   = log.checkOut ? "Completed" : "On Duty";

      // Format breaks
      const breaksText = log.breaks?.length > 0
        ? log.breaks.map(b =>
            `${b.type}${b.duration ? ` (${b.duration}m)` : ""}`
          ).join(", ")
        : "—";

      const rowY = doc.y;
      doc.rect(40, rowY, 730, rowHeight).fill(i % 2 === 0 ? '#f8fafc' : '#ffffff');

      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text(name,       colX.name,     rowY + 7, { width: 120, ellipsis: true })
         .text(date,       colX.date,     rowY + 7)
         .text(checkIn,    colX.checkIn,  rowY + 7)
         .text(checkOut,   colX.checkOut, rowY + 7)
         .text(breaksText, colX.breaks,   rowY + 7, { width: 200, ellipsis: true });

      doc.fillColor(log.checkOut ? '#16a34a' : '#d97706')
         .text(status, colX.status, rowY + 7);

      doc.moveDown(0.3);
    });

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
       .text(`Total records: ${attendanceData.length}`, { align: 'right' });

    doc.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ message: error.message });
  }
};

export const importAttendancePDF = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a file" });
    const fileUrl = req.file.secure_url || req.file.path;
    if (!fileUrl) return res.status(500).json({ message: "Cloudinary did not return a file URL." });
    res.json({ success: true, message: "Report imported successfully", url: req.file.path });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};