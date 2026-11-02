import mongoose from "mongoose";

let userschema = new mongoose.Schema({
  // ── Core ─────────────────────────────────────────────────
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  usertype:   { type: String, required: true, enum: ["admin", "manager", "hr", "projectmanager", "projectcoordinator", "teamlead", "employee"] },
  employeeId: { type: String, unique: true, sparse: true },

  // ── Personal ─────────────────────────────────────────────
  dob:             { type: String },
  phonenumber:     { type: String },
  whatsappnumber:  { type: String },

  // ── Address ──────────────────────────────────────────────
  address:  { type: String },
  district: { type: String },
  state:    { type: String },

  // ── Professional ─────────────────────────────────────────
  department:       { type: String },
  employeetype:     { type: String },
  branch:           { type: String },
  experience:       { type: String },
  joiningdate:      { type: String },
  mode:             { type: String },
  employmentstatus: { type: String, default: "Active" },
  resignationdate:  { type: String },
  resume:           { type: String },
  remarks:          { type: String },

  // ── Photo (Cloudinary URL) ────────────────────────────────
  photo: { type: String },

  // ── Org structure ────────────────────────────────────────
  reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

}, { timestamps: true });

const User = mongoose.model("User", userschema);

export default User;