import {Router} from "express";
import { getMyProfile, login,logout,register,searchUser,sendFriendRequest,acceptFriendRequest,getMyNotifications,getMyFriends } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { registerValidator, validateHandler,loginValidator,sendRequestValidator,acceptRequestValidator } from "../lib/validators.js";

const UserRouter = Router();

UserRouter.post("/register",upload.single("avatar"),registerValidator(),validateHandler,register);
UserRouter.post("/login",loginValidator(),validateHandler,login);

UserRouter.get("/profile",isAuthenticated,getMyProfile);
UserRouter.get("/logout",isAuthenticated,logout);
UserRouter.get("/search",isAuthenticated,searchUser);
UserRouter.put("/sendrequest",isAuthenticated,sendRequestValidator(),validateHandler,sendFriendRequest);
UserRouter.put("/acceptrequest",isAuthenticated,acceptRequestValidator(),validateHandler,acceptFriendRequest);
UserRouter.get("/notifications",isAuthenticated,getMyNotifications);
UserRouter.get("/friends",isAuthenticated,getMyFriends);

export default UserRouter;