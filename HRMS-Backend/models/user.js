import mongoose from "mongoose";

let userschema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique:true
    },
    password:{
        type: String,
        required:true
    },
    usertype:{
        type:String,
        required:true,
    },
    employeeId:{
        type:String,
        unique:true,
    },
    department:{
        type:String
    },
    phonenumber:{
        type:String
    }
});

const User = mongoose.model("User",userschema);

export default User;