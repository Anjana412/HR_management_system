// Routes/payrollRoutes.js
import express from "express";
import {
  generatePayroll,
  getAllPayrolls,
  markAsPaid,
  deletePayroll,
  getMyPayslips,
  getPayslipById,
} from "../controller/payrollcontroller.js";
import verifyToken from "../middleware/auth.js";

const payrollrouter = express.Router();

// ── HR: Generate a new payslip for an employee ────────────────────────────
payrollrouter.post("/hr/generate-payslip",        verifyToken, generatePayroll);

// ── HR: Get all payrolls (supports ?month=&year=&status=&employeeId=) ─────
payrollrouter.get("/hr/get-all-payrolls",         verifyToken, getAllPayrolls);

// ── HR: Mark a payroll record as paid ─────────────────────────────────────
payrollrouter.patch("/hr/:id/mark-as-paid",       verifyToken, markAsPaid);

// ── HR: Delete a draft payroll record ─────────────────────────────────────
payrollrouter.delete("/hr/:id/delete-payroll",    verifyToken, deletePayroll);

// ── Employee: Get my own payslip history ──────────────────────────────────
payrollrouter.get("/employee/my-payslips",        verifyToken, getMyPayslips);

// ── Shared: Get a single payslip by ID (employee = own only, HR = any) ───
payrollrouter.get("/get-payslip/:id",             verifyToken, getPayslipById);

export default payrollrouter;