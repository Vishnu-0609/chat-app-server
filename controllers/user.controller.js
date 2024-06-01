import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v4 as uuid } from 'uuid';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {ErrorHandler} from "../utils/ErrorHandler.js";
import { Chat } from "../models/chat.model.js";
import { Request } from "../models/request.model.js";
import { emitEvent } from "../utils/features.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";

const cookieOption = {
    maxAge:15*24*60*60*1000,
    sameSite:"none",
    httpOnly:true,
    secure:true,
};

const register = async(req,res,next) => {
    try 
    {
        const {name,username,password,bio} = req.body;
        const avatar = req.file;
    
        if(!avatar)
        {
            return next(new ErrorHandler("Please Upload Avatar",400));
        }
    
        const avatarURL = await uploadOnCloudinary(avatar.path,next);  
    
        if(!name && !username && !password && !bio)
        {
            return next(new ErrorHandler("Invalid Credentials!",404));
        }
    
        const createdUser = await User.create({name,username,password,bio,avatar:{public_id:uuid(),url:avatarURL?.url}}); 
    
        if(!createdUser)
        {
            return next(new ErrorHandler("Something Wrong In User Creation!",500));
        }
    
        const userToken = await jwt.sign({name:createdUser.name,username:createdUser.username,_id:createdUser._id},process.env.JWT_SECRET);
    
        return res
        .status(200)
        .cookie("chatUser",userToken,cookieOption)
        .json({success:true,createdUser})
    } 
    catch (error) 
    {
        next(error);
    }
}

const login = async (req,res,next) => {
    try 
    {
        const {username,password} = req?.body;

        const user = await User.findOne({username}).select("+password");

        if(!user)
        {
            return next(new ErrorHandler("Invalid UserName or Password",404));
        }

        const isMatch = await bcrypt.compare(password,user.password);

        if(!isMatch)
        {
            return next(new ErrorHandler("Invalid UserName or Password",404));
        }

        const userToken = await jwt.sign({name:user.name,username:user.username,_id:user._id},process.env.JWT_SECRET);

        return res
        .status(200)
        .cookie("chatUser",userToken,cookieOption)
        .json({success:true,user})
    } 
    catch (error) 
    {
        next(error);
    }
}

const getMyProfile = async (req,res,netx) => {
    try
    {
        if(!req.user)
        {
            return next(new ErrorHandler("Please Login To access this route"));
        }
        const {_id} = req.user;
    
        const user = await User.findById({_id}).select("-createdAt -updatedAt -__v");
    
        if(!user)
        {
            return next(new ErrorHandler("User Not Found!"));
        }
        
        res
        .status(200)
        .json(user)
    }
    catch(error)
    {
        next(error);
    }
}

const logout = async (req,res,next) => {
    return res
    .status(200)
    .clearCookie("chatUser")
    .json({message:"Logout Successfully!"});
}

const searchUser = async (req,res,next) => {
    const {name=""} = req.query;
    
    const myChats = await Chat.find({members:req.user._id,groupChat:false}).lean();

    const friends = myChats.flatMap((chat)=>chat.members);

    const allUserExceptMeAndMyFriends = await User.find({_id:{$nin:friends},name:{$regex:name,$options:"i"}});

    const users = allUserExceptMeAndMyFriends.map(({_id,name,avatar})=>({
        _id,
        name,
        avatar:avatar.url,
    }))

    return res
    .status(200)
    .json({success:true,users})
}

const sendFriendRequest = async (req,res,next) => {

    const {userId} = req.body;

    const request = await Request.findOne({$or:[{sender:req.user._id,receiver:userId},{sender:userId,receiver:req.user._id}]});

    if(request)
        return next(new ErrorHandler("Request already sent",400));

    await Request.create({sender:req.user._id,receiver:userId});

    emitEvent(req,NEW_REQUEST,[userId]);

    return res
    .status(200)
    .json({success:true,message:"Friend Request Sent Successfully!"});
}

const acceptFriendRequest = async (req,res,next) => {

    const {requestId,accept} = req.body;

    const request = await Request.findById(requestId).populate("sender","name").populate("receiver","name");

    if(!request)
        return next(new ErrorHandler("Invalid Request"));

    if(request.receiver._id.toString()!==req.user._id.toString())
        return next(new ErrorHandler("You aren't authorized to accept this request",401));

    if(!accept)
    {
        await request.deleteOne();

        return res
        .status(200)
        .json({success:true,message:"Friend Request Rejected"});
    }

    const members = [request.sender._id,request.receiver._id];

    const [chatd,requestd] = await Promise.all([
        Chat.create({members,name:`${request.sender.name}-${request.receiver.name}`,creator:request.sender._id}),
        request.deleteOne()
    ]);

    emitEvent(req,REFETCH_CHATS,members);

    return res
    .status(200)
    .json({success:true,message:"Friend Request accepted",senderId:request.sender._id});
}

const getMyNotifications = async (req,res,next) => {
    try 
    {
        const request = await Request.find({receiver:req.user._id}).populate("sender","name avatar");

        const allRequest = request.map(({_id,sender})=>({
            _id,
            sender:{
                _id:sender._id,
                name:sender.name,
                avatar:sender.avatar.url,
            }
        }))

        return res
        .status(200)
        .json({success:true,allRequest})
    } 
    catch (error) 
    {
        return next(error);
    }
}

const getMyFriends = async (req,res,next) => {
    const chatId = req.query.chatId;

    const myChats = await Chat.find({members:req.user._id,groupChat:false}).lean();

    let members = myChats.flatMap((chat)=>chat.members);

    let friends = [];

    members.map((id)=>{
        if(!friends.includes(id.toString()) && id.toString()!==req.user._id.toString())
            friends.push(id.toString())
    })

    const allFriends = await User.find({_id:{$in:friends}});

    const MyAllFriends = allFriends.map(({_id,name,avatar})=>({
        _id,
        name,
        avatar:avatar.url,
    }))

    if(chatId)
    {
        const chat = await Chat.findById(chatId);
        
        const Chatmembers = chat.members.map((id)=>(id.toString()))

        const availableFriends = MyAllFriends.filter((friend)=>Chatmembers.includes(friend._id.toString()));

        return res
        .status(200)
        .json({success:true,availableFriends})
    }
    else
    {
        return res
        .status(200)
        .json({success:true,"friends":MyAllFriends})
    }
}

export {
    login,
    register,
    getMyProfile,
    logout,
    searchUser,
    sendFriendRequest,
    acceptFriendRequest,
    getMyNotifications,
    getMyFriends
}