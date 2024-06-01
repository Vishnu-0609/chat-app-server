import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { newGroupChat,getMyChats,getMyGroups,addMembers,removeMembers,leaveGroup,sendAttachments,getChatDetails,renameGroup,deleteChat,getMessages } from "../controllers/chat.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { addMemberValidator, newGroupValidator, removeMemberValidator, validateHandler,leaveGroupValidator,sendAttachmentsValidator,getMessagesValidator,groupRenameValidator } from "../lib/validators.js";

const ChatRouter = Router();

ChatRouter.post("/newGroupChat",isAuthenticated,newGroupValidator(),validateHandler,newGroupChat);
ChatRouter.get("/myChats",isAuthenticated,getMyChats);
ChatRouter.get("/myGroups",isAuthenticated,getMyGroups);
ChatRouter.put("/addmembers",isAuthenticated,addMemberValidator(),validateHandler,addMembers);
ChatRouter.delete("/removemembers",isAuthenticated,removeMemberValidator(),validateHandler,removeMembers);
ChatRouter.delete("/leave/:id",isAuthenticated,leaveGroupValidator(),validateHandler,leaveGroup);

// send attachments
ChatRouter.post("/message",isAuthenticated,upload.array("files",5),sendAttachmentsValidator(),validateHandler,sendAttachments);

//get messages
ChatRouter.get("/message/:id",isAuthenticated,getMessagesValidator(),validateHandler,getMessages);

// get chat details,rename,delete
ChatRouter.route("/:id").get(isAuthenticated,getMessagesValidator(),validateHandler,getChatDetails).put(isAuthenticated,groupRenameValidator(),validateHandler,renameGroup).delete(isAuthenticated,getMessagesValidator(),validateHandler,deleteChat);

export default ChatRouter;