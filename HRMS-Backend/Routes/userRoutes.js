import express from 'express';
import { changePassword, deleteUser, getUserById, getUsersByType, getDirectReports, getMyTeam, login, register, updateUser } from '../controller/usercontroller.js';
import verifyToken, { requireRole } from '../middleware/auth.js';
import { upload } from '../config/multer.js';

const userrouter = express.Router();

userrouter.post('/register', verifyToken, requireRole('admin', 'manager', 'hr'),
  upload.fields([
    { name: 'photo',  maxCount: 1 },
    { name: 'resume', maxCount: 1 },
  ]), register);

userrouter.post('/login', login);
userrouter.get('/userlist/:usertype',       verifyToken, getUsersByType);
userrouter.delete('/deleteuser/:id',        verifyToken, requireRole('admin', 'manager', 'hr'), deleteUser);
userrouter.get('/getuserbyid/:id',          verifyToken, getUserById);
userrouter.put('/updateprofile/:id',        verifyToken, updateUser);
userrouter.put('/changepassword',           verifyToken, changePassword);
userrouter.get('/directreports/:managerId', verifyToken, getDirectReports);
userrouter.get('/myteam',                   verifyToken, getMyTeam);

export default userrouter;
