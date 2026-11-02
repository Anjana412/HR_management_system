import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
  employee:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  leaveType: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate:   { type: String, required: true },
  reason:    { type: String, required: true },
  status:    { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },

  // Who should approve this leave
  approver:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approverRole: { type: String, default: "hr" },

}, { timestamps: true });

const Leave = mongoose.model("Leave", leaveSchema);
export default Leave;