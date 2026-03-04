import express from 'express';
import { deleteUser, getUserById, getUsersByType, login, register, updateUser } from '../controller/usercontroller.js';
import verifyToken from '../middleware/auth.js';


const userrouter = express.Router();

userrouter.post('/register',verifyToken,register);
userrouter.post('/login',login);
userrouter.get('/userlist/:usertype',verifyToken,getUsersByType);
userrouter.delete('/deleteuser/:id',verifyToken,deleteUser);
userrouter.get('/getuserbyid/:id', verifyToken, getUserById);
userrouter.put('/updateprofile/:id', verifyToken, updateUser);




export default userrouter;