import express from "express";
import verifyToken from "../middleware/auth.js";
import { 
  checkIn, 
  checkOut, 
  getAllAttendance, 
  getMyAttendance,
  exportAttendancePDF,
  importAttendancePDF,
  startBreak,
  endBreak
} from "../controller/attendancecontroller.js";
import upload from "../config/multer.js";

const attendancerouter = express.Router();

attendancerouter.post("/checkin", verifyToken, checkIn);
attendancerouter.put("/checkout", verifyToken, checkOut);
attendancerouter.get("/my", verifyToken, getMyAttendance);
attendancerouter.get("/all", verifyToken, getAllAttendance);
attendancerouter.post("/export-pdf", verifyToken, exportAttendancePDF);
attendancerouter.post("/import-pdf", verifyToken, upload.single("image"), importAttendancePDF);
attendancerouter.post("/startbreak", verifyToken, startBreak);
attendancerouter.post("/endbreak",   verifyToken, endBreak);

export default attendancerouter;