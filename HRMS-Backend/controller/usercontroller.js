import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createNotification } from "./notificationcontroller.js";

const ALL_ROLES = ["admin", "manager", "hr", "projectmanager", "projectcoordinator", "teamlead", "employee"];

// Who may create / edit / delete which roles
const CREATION_RULES = {
  admin:   ["manager", "hr", "projectmanager", "projectcoordinator", "teamlead", "employee"],
  manager: ["hr", "projectmanager"],
  hr:      ["projectmanager", "projectcoordinator", "teamlead", "employee"],
};

const SELF_FIELDS = ["name", "email", "dob", "phonenumber", "whatsappnumber",
  "address", "district", "state", "photo", "resume"];
const STAFF_FIELDS = [...SELF_FIELDS, "department", "employeetype", "branch", "experience",
  "joiningdate", "mode", "employmentstatus", "resignationdate", "remarks", "reportsTo"];

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const {
      name, email, password, usertype,
      dob, phonenumber, whatsappnumber,
      address, district, state,
      department, employeetype, branch, experience,
      joiningdate, mode, employmentstatus, resignationdate, remarks,
      reportsTo,
    } = req.body;

    if (!name || !email || !password || !usertype) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

        // 🔒 ROLE PROTECTION — route already guarantees a logged-in user
    const allowed = CREATION_RULES[req.user.role];
    if (!allowed) {
      return res.status(403).json({ success: false, message: "You do not have permission to create users" });
    }
    if (!allowed.includes(usertype)) {
      return res.status(403).json({ success: false, message: `A ${req.user.role} cannot create a ${usertype}` });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate employee ID based on role
    const prefixMap = {
      manager:           { prefix: "DIR",  pad: 3 },
      hr:                 { prefix: "HR",   pad: 3 },
      projectmanager:     { prefix: "PM",   pad: 3 },
      projectcoordinator: { prefix: "PC",   pad: 3 },
      teamlead:           { prefix: "TL",   pad: 3 },
      employee:           { prefix: "EMP",  pad: 4 },
    };

    let employeeId;
    if (prefixMap[usertype]) {
      const { prefix, pad } = prefixMap[usertype];
      const count = await User.countDocuments({ usertype });
      employeeId = prefix + String(count + 1).padStart(pad, "0");
    }

    // Handle photo upload via Cloudinary (multer sets req.file)
    // Files uploaded to Cloudinary via multer-storage-cloudinary
    const photoUrl  = req.files?.photo?.[0]?.path  || "";
    const resumeUrl = req.files?.resume?.[0]?.path || "";

    const newUser = new User({
      name, email, password: hashedPassword, usertype, employeeId,
      dob, phonenumber, whatsappnumber,
      address, district, state,
      department, employeetype, branch, experience,
      joiningdate, mode,
      employmentstatus: employmentstatus || "Active",
      resignationdate, remarks,
      photo:     photoUrl,
      resume:    resumeUrl,
      reportsTo: reportsTo || null,
      resume: resumeUrl,
    });

    const savedUser = await newUser.save();

    // Welcome notification for new user
    await createNotification({
      recipient: savedUser._id,
      message: `Welcome to INTERNALLINK, ${savedUser.name}! Your account has been created.`,
      type: "success"
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        usertype: savedUser.usertype,
        employeeId: savedUser.employeeId,
      },
    });

  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error during registration",
    });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const matchedPassword = await bcrypt.compare(password, user.password);
    if (!matchedPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.usertype,
      },
       process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        usertype: user.usertype,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error during login",
    });
  }
};

// ================= GET MY TEAM (recursive) =================
// Returns all users that report under the logged-in user (entire subtree)
export const getMyTeam = async (req, res) => {
  try {
    const myId = req.user.userId;
    const myRole = req.user.role;

    // Admin and manager see everyone
    if (myRole === "admin" || myRole === "manager") {
      const users = await User.find({ _id: { $ne: myId } }).select(
        "_id name email phonenumber department employeeId reportsTo usertype employmentstatus photo"
      );
      return res.status(200).json({ success: true, users });
    }

    // For everyone else — recursively fetch all users under them
    const getAllUnder = async (managerId) => {
      const directReports = await User.find({ reportsTo: managerId }).select(
        "_id name email phonenumber department employeeId reportsTo usertype employmentstatus photo"
      );
      let all = [...directReports];
      for (const report of directReports) {
        const subReports = await getAllUnder(report._id);
        all = [...all, ...subReports];
      }
      return all;
    };

    const team = await getAllUnder(myId);
    return res.status(200).json({ success: true, users: team });

  } catch (error) {
    console.error("getMyTeam error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch team" });
  }
};

// ================= GET DIRECT REPORTS =================
export const getDirectReports = async (req, res) => {
  try {
    const { managerId } = req.params;
    const users = await User.find({ reportsTo: managerId }).select("-password");
    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch reports" });
  }
};

// ================= GET USERS BY TYPE =================
export const getUsersByType = async (req, res) => {
  try {
    const { usertype } = req.params;

    // Updated to accept all 7 roles
    if (!ALL_ROLES.includes(usertype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    }

    // Optional: filter by reportsTo (e.g. get all PMs under a specific HR)
    const filter = { usertype };
    if (req.query.reportsTo) filter.reportsTo = req.query.reportsTo;

    const users = await User.find(filter).select(
      "_id name email phonenumber department employeeId reportsTo usertype employmentstatus photo"
    );

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// ================= GET SINGLE USER BY ID =================
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await User.findById(id);
    if (!target) return res.status(404).json({ success: false, message: "User not found" });

    const isSelf = req.user.userId === id;
    const isStaff = (CREATION_RULES[req.user.role] || []).includes(target.usertype);

    if (!isSelf && !isStaff) {
      return res.status(403).json({ success: false, message: "Not allowed to edit this user" });
    }

    // usertype, password and employeeId can never be changed here
    const updates = pick(req.body, isStaff ? STAFF_FIELDS : SELF_FIELDS);

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");
    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await User.findById(id);
    if (!target) return res.status(404).json({ success: false, message: "User not found" });

    if (req.user.userId === id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }
    if (!(CREATION_RULES[req.user.role] || []).includes(target.usertype)) {
      return res.status(403).json({ success: false, message: "Not allowed to delete this user" });
    }

    await target.deleteOne();
    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete." });
  }
};


export const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("changePassword error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};