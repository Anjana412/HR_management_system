import express from 'express'
import cors from 'cors';
import userrouter from './Routes/userRoutes.js';
import { connectDB } from './utils/db.js';
import taskrouter from './Routes/taskRoutes.js';
import leaverouter from './Routes/leaveRoutes.js';
import attendancerouter from './Routes/attendanceRoutes.js';


const app= express();
app.use(cors());
app.use(express.json());
app.use('/user',userrouter);
app.use('/tasks',taskrouter);
app.use('/leaves',leaverouter);
app.use('/attendance',attendancerouter);




const PORT=4000;

connectDB().then(()=>{

})

app.listen(PORT,()=>{
    console.log(`Server is running on http://localhost:${PORT}`);
    
})