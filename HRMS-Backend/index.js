import './env.js';

import express from 'express';
import cors from 'cors';
import userrouter from './Routes/userRoutes.js';
import { connectDB } from './utils/db.js';
import taskrouter from './Routes/taskRoutes.js';
import leaverouter from './Routes/leaveRoutes.js';
import attendancerouter from './Routes/attendanceRoutes.js';
import notificationRouter from './Routes/notificationRoutes.js';
import projectrouter from './Routes/projectRoutes.js';
import payrollrouter from './Routes/payrollRoutes.js';

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",").map((s) => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/user',userrouter);
app.use('/tasks',taskrouter);
app.use('/leaves',leaverouter);
app.use('/attendance',attendancerouter);
app.use('/notifications',notificationRouter);
app.use('/projects', projectrouter);
app.use('/payroll', payrollrouter);



// ── Global error handler (fixes Express 5 [object Object] issue) ──
app.use((err, req, res, next) => {
  console.error("Global Error:", err.message);
  console.error("Stack:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error("DB connection failed:", err.message);
});
