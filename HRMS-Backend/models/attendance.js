import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: {
    type: String,
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
  },

  // ── Breaks ───────────────────────────────────────────────
  breaks: [
    {
      type:      { type: String, enum: ["lunch", "tea"], required: true },
      startTime: { type: Date, required: true },
      endTime:   { type: Date },
      duration:  { type: Number, default: 0 }, // in minutes
    }
  ],

}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);