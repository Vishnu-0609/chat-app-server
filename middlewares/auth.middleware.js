import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/ErrorHandler.js";

export const isAuthenticated = async (req,res,next) => {
    const {chatUser} = req.cookies;
    
    if(!chatUser)
    {
        return next(new ErrorHandler("Please Login To access this route",401));
    }

    const user = await jwt.verify(chatUser,process.env.JWT_SECRET);
    req.user = user;
    next();
}

export const isAuthenticatedAdmin = async (req,res,next) => {
    try 
    {
        const {chatAdmin} = req.cookies;

        if(!chatAdmin)
            return next(new ErrorHandler("Only Admin Can Access This route",401))

        const adminSecretkey = jwt.verify(chatAdmin,process.env.JWT_SECRET);
        const isAdmin = adminSecretkey === process.env.ADMIN_SECRET_KEY;

        if(!isAdmin)
            return next(new ErrorHandler("Only Admin Can Access This route",401))

        req.admin = adminSecretkey;
        next();
    } 
    catch (error) 
    {
        return next(error);
    }
}