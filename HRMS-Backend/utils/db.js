
import mongoose from "mongoose";

const DB_url = process.env.url;

export async function connectDB() {
  try {
    if (!DB_url) {
      throw new Error("MongoDB connection string (url) is missing");
    }

    await mongoose.connect(DB_url);
    console.log("Database connected");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
}
