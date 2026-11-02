import express from "express";
import verifyToken from "../middleware/auth.js";
import { getNotifications, markAllRead } from "../controller/notificationcontroller.js";

const notificationRouter = express.Router();

notificationRouter.get("/getnotification",verifyToken, getNotifications);
notificationRouter.put("/mark-read", verifyToken, markAllRead);

export default notificationRouter;