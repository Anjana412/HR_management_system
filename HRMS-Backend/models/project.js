import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({

  // ── Core ─────────────────────────────────────────────────
  name:        { type: String, required: true },
  projectCode: { type: String, unique: true },
  category:    { type: String },
  description: { type: String },
  notes:       { type: String },

  // ── Priority & Status ────────────────────────────────────
  priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  status:   { type: String, enum: ["active", "on-hold", "completed"],    default: "active" },

  // ── Dates ────────────────────────────────────────────────
  startDate: { type: String },
  deadline:  { type: String },

  // ── File ─────────────────────────────────────────────────
  projectFile: { type: String }, // Cloudinary URL

  // ── Creator ──────────────────────────────────────────────
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // ── Members ──────────────────────────────────────────────
  members: [
    {
      user:          { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      roleInProject: { type: String },
    }
  ],

}, { timestamps: true });

const Project = mongoose.model("Project", projectSchema);

export default Project;