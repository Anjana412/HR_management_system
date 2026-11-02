// controller/payrollController.js
import Payroll from "../models/payroll.js";
import User from "../models/user.js";
import { createNotification } from "./notificationcontroller.js";

// ── Helper: compute salary breakdown from CTC ─────────────────────────────
const computeSalary = (basicSalary, overrides = {}) => {
  const hra             = overrides.hra            ?? Math.round(basicSalary * 0.4);
  const da              = overrides.da             ?? Math.round(basicSalary * 0.1);
  const allowances      = overrides.allowances     ?? 0;
  const pf              = overrides.pf             ?? Math.round(basicSalary * 0.12);
  const esi             = overrides.esi            ?? Math.round(basicSalary * 0.0075);
  const tds             = overrides.tds            ?? 0;
  const otherDeductions = overrides.otherDeductions ?? 0;

  const grossSalary     = basicSalary + hra + da + allowances;
  const totalDeductions = pf + esi + tds + otherDeductions;
  const netSalary       = grossSalary - totalDeductions;

  return { hra, da, allowances, pf, esi, tds, otherDeductions, grossSalary, totalDeductions, netSalary };
};

// ── HR: Generate payroll for an employee ─────────────────────────────────
export const generatePayroll = async (req, res) => {
  try {
    if (!["hr", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only HR can generate payroll" });
    }

    const {
      employeeId, month, year, basicSalary,
      hra, da, allowances, pf, esi, tds, otherDeductions, remarks
    } = req.body;

    if (!employeeId || !month || !year || !basicSalary) {
      return res.status(400).json({ message: "employeeId, month, year and basicSalary are required" });
    }

    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const computed = computeSalary(Number(basicSalary), {
      hra, da, allowances, pf, esi, tds, otherDeductions
    });

    // Upsert — regenerate if already exists (draft only)
    const existing = await Payroll.findOne({ employee: employeeId, month, year });
    if (existing && existing.status === "paid") {
      return res.status(400).json({ message: "Payroll already marked as paid for this month" });
    }

    const payroll = await Payroll.findOneAndUpdate(
      { employee: employeeId, month, year },
      {
        basicSalary: Number(basicSalary),
        ...computed,
        remarks: remarks || "",
        generatedBy: req.user.userId,
        status: "draft",
      },
      { upsert: true, new: true }
    );

    // Notify the employee
    await createNotification({
      recipient: employeeId,
      message: `Your payslip for ${getMonthName(month)} ${year} has been generated.`,
      type: "success",
    });

    res.status(201).json({ success: true, payroll });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Payroll already exists for this employee and month" });
    }
    console.error("Generate payroll error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── HR: Get all payrolls (with optional filters) ──────────────────────────
export const getAllPayrolls = async (req, res) => {
  try {
    if (!["hr", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { month, year, status, employeeId } = req.query;
    const filter = {};
    if (month)      filter.month    = Number(month);
    if (year)       filter.year     = Number(year);
    if (status)     filter.status   = status;
    if (employeeId) filter.employee = employeeId;

    const payrolls = await Payroll.find(filter)
      .populate("employee", "name employeeId department usertype photo")
      .populate("generatedBy", "name")
      .sort({ year: -1, month: -1 });

    res.json({ success: true, payrolls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── HR: Mark payroll as paid ──────────────────────────────────────────────
export const markAsPaid = async (req, res) => {
  try {
    if (!["hr", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { id } = req.params;
    const payroll = await Payroll.findById(id).populate("employee", "name");
    if (!payroll) return res.status(404).json({ message: "Payroll record not found" });
    if (payroll.status === "paid") {
      return res.status(400).json({ message: "Already marked as paid" });
    }

    const today = new Date();
    payroll.status = "paid";
    payroll.paidOn = today.toISOString().split("T")[0];
    await payroll.save();

    await createNotification({
      recipient: payroll.employee._id,
      message: `Your salary for ${getMonthName(payroll.month)} ${payroll.year} has been credited.`,
      type: "success",
    });

    res.json({ success: true, payroll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── HR: Delete a draft payroll ────────────────────────────────────────────
export const deletePayroll = async (req, res) => {
  try {
    if (!["hr", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { id } = req.params;
    const payroll = await Payroll.findById(id);
    if (!payroll) return res.status(404).json({ message: "Payroll not found" });
    if (payroll.status === "paid") {
      return res.status(400).json({ message: "Cannot delete a paid payroll record" });
    }

    await payroll.deleteOne();
    res.json({ success: true, message: "Payroll deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Employee: Get my payslips ─────────────────────────────────────────────
export const getMyPayslips = async (req, res) => {
  try {
    const payslips = await Payroll.find({ employee: req.user.userId })
      .populate("employee", "name employeeId department usertype joiningdate")
      .populate("generatedBy", "name")
      .sort({ year: -1, month: -1 });
    res.json({ success: true, payslips });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// ── Employee: Get single payslip ──────────────────────────────────────────
export const getPayslipById = async (req, res) => {
  try {
    const payslip = await Payroll.findById(req.params.id)
      .populate("employee", "name employeeId department usertype photo joiningdate")
      .populate("generatedBy", "name");

    if (!payslip) return res.status(404).json({ message: "Payslip not found" });

    // Only the employee themselves, or HR/Admin can view
    const isOwner  = payslip.employee._id.toString() === req.user.userId;
    const isHRAdmin = ["hr", "admin"].includes(req.user.role);
    if (!isOwner && !isHRAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({ success: true, payslip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Utility ───────────────────────────────────────────────────────────────
const getMonthName = (month) => {
  return ["", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"][month];
};

export { getMonthName };