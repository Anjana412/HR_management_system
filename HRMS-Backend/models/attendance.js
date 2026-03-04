// models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // We store the calendar date as a string for easy "Today" lookups
  date: {
    type: String, // e.g., "2024-05-20"
    required: true
  },
  checkIn: {
    type: Date,
    default: Date.now
  },
  checkOut: {
    type: Date
  },
  status: {
    type: String,
    enum: ["present", "absent"],
    default: "present"
  }
}, { timestamps: true });

// CRITICAL: This ensures one employee can only have ONE record per calendar date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);