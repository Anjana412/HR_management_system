import express from "express";
import axios from "axios";
import verifyToken from "../middleware/auth.js";
import {
  createTask, deleteTask, getAllTasks,
  getTaskById, updateTask, uploadTaskProof,
  getTasksByProject
} from "../controller/taskcontroller.js";
import { uploadProofLocal } from "../config/multer.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const taskrouter = express.Router();

taskrouter.post("/addtask",              verifyToken, createTask);
taskrouter.get("/viewtask",              verifyToken, getAllTasks);
taskrouter.put("/updatetask/:id",        verifyToken, updateTask);
taskrouter.delete("/deletetask/:id",     verifyToken, deleteTask);
taskrouter.get("/taskdetails/:id",       verifyToken, getTaskById);
taskrouter.get("/byproject/:projectId",  verifyToken, getTasksByProject);
taskrouter.post("/uploadproof/:id",      verifyToken, uploadProofLocal.single("file"), uploadTaskProof);

// Download proof
taskrouter.get("/download-proof", verifyToken, async (req, res) => {
  try {
    const { filename, name } = req.query;
    if (!filename) return res.status(400).json({ message: "No filename provided" });

    const isCloudinaryUrl = filename.startsWith("http");

    if (isCloudinaryUrl) {
      try {
        const response = await axios.get(filename, {
          responseType: "stream",
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        res.setHeader("Content-Disposition", `attachment; filename="${name || "proof_file"}"`);
        res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
        return response.data.pipe(res);
      } catch {
        return res.status(410).json({
          message: "This file was uploaded before the system update and cannot be downloaded. Please ask the employee to re-upload it."
        });
      }
    } else {
      const filePath = path.join(__dirname, "../uploads/proofs", filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }
      res.setHeader("Content-Disposition", `attachment; filename="${name || filename}"`);
      return res.download(filePath, name || filename);
    }
  } catch (err) {
    res.status(500).json({ message: "Download failed: " + err.message });
  }
});

export default taskrouter;