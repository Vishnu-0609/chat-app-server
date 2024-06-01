import { Router } from "express";
import { getAllUsers,getAllChats,getAllMessages,getDashboardStats,adminLogin,adminLogout,getAdminData } from "../controllers/admin.controller.js";
import { adminLoginValidator, validateHandler } from "../lib/validators.js";
import { isAuthenticatedAdmin } from "../middlewares/auth.middleware.js";

const AdminRouter = Router();

AdminRouter.get("/",isAuthenticatedAdmin,getAdminData)

AdminRouter.post("/verify",adminLoginValidator(),validateHandler,adminLogin)
AdminRouter.get("/logout",adminLogout)

AdminRouter.get("/users",isAuthenticatedAdmin,getAllUsers)
AdminRouter.get("/chats",isAuthenticatedAdmin,getAllChats)
AdminRouter.get("/messages",isAuthenticatedAdmin,getAllMessages)

AdminRouter.get("/stats",isAuthenticatedAdmin,getDashboardStats)

export default AdminRouter