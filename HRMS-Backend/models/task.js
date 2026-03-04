import mongoose from "mongoose";

const taskschema = new mongoose.Schema(
    {
        title:{
            type:String,
            required:true
        },

        description:{
            type:String,
            required:true
        },

        assignedTo:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required: true
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required: true
        },
        priority: { 
            type: String, 
            enum: ["Low", "Medium", "High"], 
            default: "Medium" 
        },

        status: {
            type: String,
            enum: ["pending", "in-progress", "completed"],
            default: "pending"
        },

        dueDate: {
            type: Date
    }
    
    },
    { timestamps: true }
);

export default mongoose.model("Task",taskschema);