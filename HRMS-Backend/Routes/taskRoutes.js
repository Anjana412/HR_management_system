import express from "express";
import verifyToken from "../middleware/auth.js";
import { createTask, deleteTask, getAllTasks, getTaskById, updateTask } from "../controller/taskcontroller.js";

const taskrouter = express.Router();

taskrouter.post("/addtask",verifyToken,createTask);
taskrouter.get("/viewtask",verifyToken,getAllTasks);
taskrouter.put("/updatetask/:id",verifyToken,updateTask);
taskrouter.delete("/deletetask/:id",verifyToken,deleteTask);
taskrouter.get("/taskdetails/:id", verifyToken, getTaskById);

export default taskrouter;
