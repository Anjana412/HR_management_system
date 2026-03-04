import express from 'express'
import verifyToken from '../middleware/auth.js'
import { applyLeave, deleteLeave, getAllLeaves, getMyLeaves, updateLeaveStatus } from '../controller/leavecontroller.js';


const leaverouter = express.Router();

leaverouter.post("/applyleave",verifyToken,applyLeave);
leaverouter.get("/myleave",verifyToken,getMyLeaves);
leaverouter.get("/allleave",verifyToken,getAllLeaves);
leaverouter.put("/updateleave/:id",verifyToken,updateLeaveStatus);
leaverouter.delete("/deleteleave/:id",verifyToken,deleteLeave);


export default leaverouter;

