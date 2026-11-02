// models/payroll.js
import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema({
  employee:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  month:      { type: Number, required: true }, // 1–12
  year:       { type: Number, required: true },

  // Earnings
  basicSalary:  { type: Number, required: true },
  hra:          { type: Number, default: 0 },
  da:           { type: Number, default: 0 },
  allowances:   { type: Number, default: 0 }, // other allowances

  // Deductions
  pf:           { type: Number, default: 0 },
  esi:          { type: Number, default: 0 },
  tds:          { type: Number, default: 0 },
  otherDeductions: { type: Number, default: 0 },

  // Computed (stored for record)
  grossSalary:  { type: Number, required: true },
  totalDeductions: { type: Number, required: true },
  netSalary:    { type: Number, required: true },

  // Meta
  status:       { type: String, enum: ["draft", "paid"], default: "draft" },
  generatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  paidOn:       { type: String, default: null },
  remarks:      { type: String, default: "" },

}, { timestamps: true });

// Prevent duplicate payroll for same employee+month+year
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

const Payroll = mongoose.model("Payroll", payrollSchema);
export default Payroll;