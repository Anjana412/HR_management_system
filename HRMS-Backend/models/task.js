import mongoose from "mongoose";

const taskschema = new mongoose.Schema(
    {
        // ── Core ─────────────────────────────────────────────────
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },

        // ── Project link ─────────────────────────────────────────
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            default: null  // null = standalone task (old behaviour preserved)
        },

        // ── Assignment ───────────────────────────────────────────
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // ── Priority & Status ────────────────────────────────────
        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium"
        },
        status: {
            type: String,
            enum: ["pending", "in-progress", "completed", "cancelled"],
            default: "pending"
        },

        // ── Dates ────────────────────────────────────────────────
        dueDate:     { type: Date },
        startDate:   { type: Date },
        completedAt: { type: Date },

        // ── Category / Type ──────────────────────────────────────
        category: {
            type: String,
            enum: ["development", "design", "testing", "documentation", "research", "meeting", "other"],
            default: "other"
        },

        // ── Estimated hours ──────────────────────────────────────
        estimatedHours: { type: Number, default: 0 },
        actualHours:    { type: Number, default: 0 },

        // ── Feedback & Proof ─────────────────────────────────────
        feedback: { type: String, default: "" },
        remarks:  { type: String, default: "" },

        proofFiles: [{
            url:        { type: String, required: true },
            name:       { type: String, default: "file" },
            uploadedAt: { type: Date,   default: Date.now }
        }]
    },
    { timestamps: true }
);

export default mongoose.model("Task", taskschema);