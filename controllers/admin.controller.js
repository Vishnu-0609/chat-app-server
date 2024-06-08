import { getTotalFriends, getTotalGroups } from "../lib/helper.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import jwt from "jsonwebtoken";

const adminLogin = async (req,res,next) => {
    try 
    {
        const {secretKey} = req.body;

        const adminSecretKey = process.env.ADMIN_SECRET_KEY || "vishnu";

        const isMatch = secretKey === adminSecretKey;

        if(!isMatch)
            return next(new ErrorHandler("Invalid Admin Key",401));

        const token = jwt.sign(secretKey,process.env.JWT_SECRET);

        return res
        .status(200)
        .cookie("chatAdmin",token,{maxAge:1000*60*15,sameSite:"none",httpOnly:true,secure:true})
        .json({success:true,message:"Admin Login Successfully!"})
    } 
    catch (error) 
    {
        next(error);
    }
}

const adminLogout = async (req,res,next) => {
    try 
    {
        return res
        .status(200)
        .clearCookie("chatAdmin")
        .json({success:true,message:"Admin Logout Successfully!"})
    } 
    catch (error) 
    {
        next(error);
    }
}

const getAdminData = async (req,res,next) => {
    try 
    {
        return res
        .status(200)
        .json({admin:true});
    } 
    catch (error) 
    {
        next(error);
    }
}

const getAllUsers = async (req,res,next) => {
    try 
    {
        const allUsers = await User.find().select("-password");

        const tranformedUserData =  await Promise.all(allUsers.map(async({_id,avatar,name,bio,username})=>({
            _id,
            name,
            username,
            avatar:avatar.url,
            friends:await getTotalFriends(_id),
            groups:await getTotalGroups(_id),
        })))

        return res
        .status(200)
        .json({success:true,tranformedUserData})
    } 
    catch (error) 
    {
        return next(error);
    }
}

const getAllChats = async (req,res,next) => {
    try 
    {
        const chats = await Chat.find().populate("members","name avatar").populate("creator","name avatar");

        const tranformedChatsData = await Promise.all(chats.map(async({members,_id,groupChat,name,creator})=>{

            const totalMessages = await Message.countDocuments({chat:_id});
            return {
                _id,
                groupChat,
                name,
                avatar:members.slice(0,3).map((member)=>member.avatar.url),
                members:members.map(({_id,name,avatar})=>({
                        _id,
                        name,
                        avatar:avatar.url
                })),
                creator:{
                    name:creator?.name || "None",
                    avatar:creator?.avatar.url || "None"
                },
                totalMembers:members.length,
                totalMessages,
            }
        }))

        return res
        .status(200)
        .json({success:true,chats:tranformedChatsData})
    } 
    catch (error) 
    {
        return next(error);
    }
}

const getAllMessages = async (req,res,next) => {
    try 
    {
        const messages = await Message.find().populate("sender","name avatar").populate("chat","groupChat");

        const transformedMessagesData = messages.map(({_id,content,attachments,createdAt,sender,chat})=>(
            {
                _id,
                attachments,
                content,
                createdAt,
                chat,
                chat:chat?._id || "None",
                groupChat:chat?.groupChat || "None",
                sender:{
                    _id:sender._id,
                    name:sender.name,
                    avatar:sender.avatar.url
                }
            }
        ));

        return res
        .status(200)
        .json({success:true,transformedMessagesData})
    } 
    catch (error) 
    {
        return next(error);
    }
}

const getDashboardStats = async (req,res,next) => {
    try 
    {
        const [groupsCount,usersCount,messagesCount,totalChatsCount] = await Promise.all([
            Chat.countDocuments({groupChat:true}),
            User.countDocuments(),
            Message.countDocuments(),
            Chat.countDocuments(),
        ]);

        const today = new Date();

        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate()-7);

        const last7DaysMessages = await Message.find({createdAt:{$gte:last7Days,$lte:today}}).select("+createdAt");

        const messages = new Array(7).fill(0);
        const dayInMilliseconds = 1000 * 60 * 60 * 24;

        last7DaysMessages.forEach((message)=>{
            const indexApprox =(today.getTime()-message.createdAt.getTime())/dayInMilliseconds;
            const index = Math.floor(indexApprox);
            messages[6-index]++;
        })

        const stats = {
            groupsCount,
            usersCount,
            messagesCount,
            totalChatsCount,
            messagesChart:messages
        }

        return res
        .status(200)
        .json({success:true,stats})
    } 
    catch (error) 
    {
        return next(error);
    }
}

export {
    getAllUsers,
    getAllChats,
    getAllMessages,
    getDashboardStats,
    adminLogin,
    adminLogout,
    getAdminData
}