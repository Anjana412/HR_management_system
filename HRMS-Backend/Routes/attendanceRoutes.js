import express from "express";
import verifyToken from "../middleware/auth.js";
import { checkIn, checkOut, getAllAttendance, getMyAttendance } from "../controller/attendancecontroller.js";

const attendancerouter = express.Router();

attendancerouter.post("/checkin", verifyToken, checkIn);
attendancerouter.put("/checkout", verifyToken, checkOut);
attendancerouter.get("/my", verifyToken, getMyAttendance);
attendancerouter.get("/all", verifyToken, getAllAttendance);

export default attendancerouter;
