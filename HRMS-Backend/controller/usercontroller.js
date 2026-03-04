import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { name, email, password, usertype, department,phonenumber } = req.body;

    if (!name || !email || !password || !usertype) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // 🔒 ROLE PROTECTION
    if (req.user) {
      const creatorRole = req.user.role; // from token

      if (creatorRole === "admin") {
        if (!["hr", "employee"].includes(usertype)) {
          return res.status(403).json({
            success: false,
            message: "Admin can only create HR or Employee",
          });
        }
      }

      else if (creatorRole === "hr") {
        if (usertype !== "employee") {
          return res.status(403).json({
            success: false,
            message: "HR can only create Employee",
          });
        }
      }

      else {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);



    // Generate employee ID automatically
let employeeId;
if (usertype === "hr") {
  const hrCount = await User.countDocuments({ usertype: "hr" });
  employeeId = "HR" + String(hrCount + 1).padStart(3, "0"); // HR001, HR002...
} else if (usertype === "employee") {
  const empCount = await User.countDocuments({ usertype: "employee" });
  employeeId = "EMP" + String(empCount + 1).padStart(4, "0"); // EMP0001, EMP0002...
}



    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      usertype,
      employeeId,
      department,
      phonenumber,
    });

    const savedUser = await newUser.save();

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

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare password
    const matchedPassword = await bcrypt.compare(password, user.password);

    if (!matchedPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Create token (include role inside token)
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.usertype,
      },
      process.env.JWT_SECRET || "abc", // use .env in real projects
      { expiresIn: "1h" }
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


// ================= GET USERS BY TYPE =================
export const getUsersByType = async (req, res) => {
  try {
    const { usertype } = req.params; // we will pass 'hr' in the route

    if (!["hr", "employee"].includes(usertype)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    }

    const users = await User.find({ usertype }).select(
      "_id name email phonenumber department employeeId"
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
    const user = await User.findById(id).select("-password"); // Don't send the password!

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
    const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true }).select("-password");
    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};


export const deleteUser = async(req,res)=>{
    try{
      const { id } = req.params;
      await User.findByIdAndDelete(id)
      
      return res.status(200).json({success:true,message:"Hr deleted sucessfully"});
      console.log("Sucessfully deleted");
      
    }
    catch(error){
      return res.status(500).json({success:false,message:"Failed to delete."});
      
    }
}