import jwt from "jsonwebtoken";

const verifyToken = (req, res,next)=>{
    try{
        const authHeader = req.headers.authorization;
        console.log("Auth header:",authHeader);

        if(!authHeader){
            return res.status(401).json({message:"Authorization token missing" });

        }

        const token =authHeader.split(" ")[1];
        if(!token){
            return res.status(401).json({ message: "Token not found in Authorization"});
        }

        const decoded = jwt.verify(token,"abc");
        req.user =decoded;
        console.log("Decoded Token Data:", decoded);
        next();
        
    }
    catch (e) {
        res.status(401).json({message:"Invalid or expired token",error: e.message});
        console.log("Token verification failed:",e.message);
        
    }
};

export default verifyToken;