import express from "express";
import verifyToken from "../middleware/auth.js";
import { upload } from "../config/multer.js";
import {
  createProject,
  getAllProjects,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject,
  assignMember,
  removeMember,
} from "../controller/projectcontroller.js";

const projectrouter = express.Router();

// ── CRUD ──────────────────────────────────────────────────────
projectrouter.post("/create", verifyToken, upload.single("projectFile"), createProject);
projectrouter.get("/all",            verifyToken, getAllProjects);
projectrouter.get("/myprojects",     verifyToken, getMyProjects);
projectrouter.get("/:id",            verifyToken, getProjectById);
projectrouter.put("/update/:id",     verifyToken, updateProject);
projectrouter.delete("/delete/:id",  verifyToken, deleteProject);

// ── MEMBERS ───────────────────────────────────────────────────
projectrouter.post("/:id/assign",            verifyToken, assignMember);
projectrouter.delete("/:id/member/:userId",  verifyToken, removeMember);

export default projectrouter;