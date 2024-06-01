import mongoose from "mongoose";
import { ALERT, NEW_ATTACHMENT, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { Chat } from "../models/chat.model.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { emitEvent } from "../utils/features.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { deleteFilesFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const newGroupChat = async (req,res,next) => {
    try 
    {
        const {name,members} = req?.body;

        if(members.length < 2)
            return next(new ErrorHandler("Group Chat must have at least 3 members",400))

        const allmembers = [...members,req.user._id];

        await Chat.create({name,groupChat:true,creator:req.user._id,members:allmembers});

        emitEvent(req,ALERT,allmembers,`Welcome to ${name} group`);        
        emitEvent(req,REFETCH_CHATS,members);

        return res
        .status(200)
        .json({success:true,message:"Group Created Sucessfully!"})
    } 
    catch (error) 
    {
        next(error);    
    }
}

const getMyChats = async (req,res,next) => {

    // aggregation example 1
    // const chats = await Chat.aggregate([
    //     {
    //         $match:{members:new mongoose.Types.ObjectId(req.user._id),groupChat:true}
    //     },
    //     {
    //         $lookup:{
    //             from:"users",
    //             localField:"members",
    //             foreignField:"_id",
    //             pipeline: [
    //                 {
    //                     // $project: {
    //                     //     _id: 0,
    //                     //     name:1,
    //                     //     "avatar.url": 1,
    //                     //     "url":"$avatar.url",
    //                     // }
    //                     $match : {
    //                         _id:{$not:{$eq:new mongoose.Types.ObjectId(req.user._id)}}
    //                     },
    //                 },
    //                 {
    //                     $project : {
    //                         "url":"$avatar.url",
    //                     }
    //                 }
    //             ],
    //             as:"user"
    //         }
    //     }
    //     // {
    //     //     $unwind:"$user"
    //     // },
    //     // {
    //     //     $group:{_id:"$_id",name:{ $first: "$name" },groupChat:{ $first: "$groupChat" },avatar:{$push:"$user.avatar.url"}}
    //     // }
    //     // {
    //     //     $project:{
    //     //         _id:1,
    //     //         name:1,
    //     //         groupChat:1,
    //     //         user:1
    //     //     }
    //     // }
    // ]);

    // console.log(chats);

    // aggregation example 2
    // const chats = await Chat.aggregate([
    //     {
    //         $match:{members:new mongoose.Types.ObjectId(req.user._id)}
    //     },
    //     {
    //         $lookup:{
    //             from:"users",
    //             localField:"members",
    //             foreignField:"_id",
    //             as:"avatar",
    //             pipeline:[
    //                 {
    //                     $project:{
    //                         _id:0,
    //                         "url":"$avatar.url"
    //                     },
    //                 }
    //             ]
    //         }
    //     },
    //     {
    //         $lookup:{
    //             from:"users",
    //             localField:"creator",
    //             foreignField:"_id",
    //             as:"creator"
    //         }
    //     },
    //     {
    //         $unwind:"$avatar"
    //     },
    //     {
    //         $group:{_id:"$_id",name:{$first:"$name"},groupChat:{$first:"$groupChat"},creator:{$first:"$creator"},members:{$first:"$members"},avatar:{$push:"$avatar.url"}}
    //     }
    // ])

    const chats = await Chat.find({members:req.user._id}).populate("members","name avatar");

    const transfomedChats = chats.map(({_id,name,groupChat,members})=>{

        return {
            _id,
            groupChat,
            members:members.reduce((prev,curr)=>{
                if(curr._id.toString()!==req.user._id.toString())
                {
                    prev.push(curr._id);
                }
                return prev;
            },[]),
            avatar : groupChat ? members.slice(0,3).map(({avatar})=>avatar.url) : [members.filter((member)=>member._id.toString()!==req.user._id.toString())[0].avatar.url],
            name : groupChat ? name : members.filter((member)=>member._id.toString()!==req.user._id.toString())[0].name,
        };
    });

    return res
    .status(200)
    .json({success:true,transfomedChats})
}

const getMyGroups = async (req,res,next) => {
    try 
    {
        const chats = await Chat.find({members:req.user._id,groupChat:true,creator:req.user._id}).populate("members","name avatar");

        if(!chats)
        {
            return next(new ErrorHandler("Group Not Found",404));
        }

        const groups = chats.map(({members,_id,groupChat,name})=>(
            {
                _id,
                groupChat,
                name,
                avatar:members.slice(0,3).map(({avatar})=>avatar.url)
            }
        ))

        return res
        .status(200)
        .json({success:true,groups})
    } 
    catch (error) {
        next(error);
    }
}

const addMembers = async (req,res,next) => {
    try 
    {
        const {chatId,members} = req.body;

        if(!members || members?.length < 1)
            return next(new ErrorHandler("Please provide members",403));

        const chat = await Chat.findById(chatId);

        if(!chat)
            return next(new ErrorHandler("Chat not found",404));

        if(!chat.groupChat)
            return next(new ErrorHandler("This is not a group chat",400));

        if(chat.creator.toString()!==req.user._id.toString())
            return next(new ErrorHandler("You aren't allowed to add members",403));

        const allNewMembersPromise = members.map((i)=>User.findById(i,"name"));

        const allNewMembers = await Promise.all(allNewMembersPromise);

        const uniqueMembers = allNewMembers.filter((i)=>!chat.members.includes(i._id.toString())).map((i)=>i._id);

        chat.members.push(...uniqueMembers);

        if(chat.members.length > 100)
            return next(new ErrorHandler("Group members limit reached",400));

        await chat.save();

        const allMembersName = allNewMembers.map((i)=>i.name).join(",");

        emitEvent(req,ALERT,chat.members,`${allMembersName} has been successfully added to ${chat.name}`);

        emitEvent(req,REFETCH_CHATS,chat.members);

        return res
        .status(200)
        .json({success:true,message:"Members added Successfully!"})
    } 
    catch (error) {
        next(error);
    }
}

const removeMembers = async (req,res,next) => {
    try 
    {
        const {chatId,memberId} = req.body;

        const [chat,userThatWillBeRemoved] = await Promise.all([
            Chat.findById(chatId),
            User.findById(memberId,"name")
        ]);

        if(!chat)
            return next(new ErrorHandler("Chat not found",404));

        if(!chat.groupChat)
            return next(new ErrorHandler("This is not a group chat",400));

        if(chat.creator.toString()!==req.user._id.toString())
            return next(new ErrorHandler("You aren't allowed to add members",403));

        if(chat.members.length <= 3)
            return next(new ErrorHandler("Group must have at least 3 members",400));

        chat.members = chat.members.filter((member)=>member.toString() !== memberId.toString());

        await chat.save();

        emitEvent(req,ALERT,chat.members,`${userThatWillBeRemoved.name} has been removed from the group`);
        emitEvent(req,REFETCH_CHATS,chat.members);
        
        return res
        .status(200)
        .json({success:true,message:"Members removed Successfully!"})
    } 
    catch (error) {
        next(error);
    }
}

const leaveGroup = async (req,res,next) => {
    try 
    {
        const {id} = req.params;
        const chat = await Chat.findById(id);   

        if(!chat)
            return next(new ErrorHandler("Chat Not Found",404));

        if(!chat.groupChat)
            return next(new ErrorHandler("Chat is not groupChat",403));

        const remainingMembers = chat.members.filter((member)=>member.toString()!==req.user._id);

        if(remainingMembers.length < 3)
            return new(new ErrorHandler("Group must have at least 3 members",400));

        if(chat.creator.toString() === req.user._id)
        {
            const newCreator = remainingMembers[0];
            chat.creator = newCreator;
        }

        chat.members = remainingMembers;

        await chat.save();
        const message = `${req.user.name} Leave Group ${chat.name} Successfully`;

        emitEvent(req,ALERT,chat.members,message);

        return res
        .status(200)
        .json({success:true,message})
    } 
    catch (error) 
    {
        return next(error);
    }
}

const sendAttachments = async (req,res,next) => {
    try 
    {
        const { chatId } = req.body;

        const files = req.files || [];

        if(files.length < 1)
            return next(new ErrorHandler("Please provide attachments",400));

        if(files.length > 5)
            return next(new ErrorHandler("Files can't be more than 5",400));

        const chat = await Chat.findById(chatId);

        if(!chat)
            return next(new ErrorHandler("Chat Not Found",404));

        const uploadFilesOnCloudinaryPromise = await Promise.all(files.map(async(file)=>{
            const {url,public_id} = await uploadOnCloudinary(file.path,next);
            return {public_id,url};
        }))

        const attachments = uploadFilesOnCloudinaryPromise || [];

        const messageForRealTime = {content : "",attachments,sender:{_id:req.user._id,name:req.user.name},chat:chatId};

        const messageForDB = {content : "",attachments,sender:req.user._id,chat:chatId};

        const message = await Message.create(messageForDB);

        emitEvent(req,NEW_ATTACHMENT,chat.members,{message:messageForRealTime,chatId});

        emitEvent(req,NEW_MESSAGE_ALERT,chat.members,{chatId});

        return res
        .status(200)
        .json({success:true,message});
    } 
    catch (error) 
    {
        return next(error);    
    }
}

const getChatDetails = async (req,res,next) => {
    try 
    {
        if(req.query.populate === "true")
        {
            const chat = await Chat.findById(req.params.id).populate("members","name avatar").lean();

            if(!chat)
                return next(new ErrorHandler("Chat Not Found",404));

            chat.members = chat.members.map(({id,name,avatar})=>(
                {
                    id,
                    name,
                    avatar:avatar.url
                }
            ))

            return res
            .status(200)
            .json({success:true,chat})
        }
        else
        {
            const chat = await Chat.findById(req.params.id);

            if(!chat)
                return next(new ErrorHandler("Chat Not Found",404));
            
            return res
            .status(200)
            .json({success:true,chat})
        }
    } 
    catch (error) 
    {
        return next(error);    
    }
}

const renameGroup = async (req,res,next) => {
    try 
    {
        const chatId = req.params.id;
        const {name} = req.body;

        if(!name)
            return next(new ErrorHandler("Please provide name for Rename",400));

        const chat = await Chat.findById(chatId);

        if(!chat)
            return next(new ErrorHandler("Chat Not Found",404));

        if(!chat.groupChat)
            return next(new ErrorHandler("This is not group chat",400));

        if(chat.creator.toString()!==req.user._id.toString())
            return next(new ErrorHandler("You aren't allowed to rename the group",403));

        chat.name = name;
        await chat.save();

        emitEvent(req,REFETCH_CHATS,chat.members);

        return res
        .status(200)
        .json({success:true,message:"Group renamed Successfully"})
    } 
    catch (error) 
    {
        return next(error);    
    }
}

const deleteChat = async (req,res,next) => {
    try 
    {
        const chatId = req.params.id;

        const chat = await Chat.findById(chatId);

        if(!chat)
            return next(new ErrorHandler("Chat Not Found",404));

        const members = chat.members;

        if(chat.groupChat && chat.creator.toString() !== req.user._id.toString())
            return next(new ErrorHandler("You are not allowed to delete the group",403));

        if(chat.groupChat && !chat.members.includes(req.user._id.toString()))
            return next(new ErrorHandler("You are not allowed to delete the chat",403));

        // Here we have to delete all messages as well as attachments or files from cloudinary

        const messagesWithAttachments = await Message.find({chat:chatId,attachments:{$exists:true,$ne:[]}});

        const public_ids = [];

        messagesWithAttachments.forEach(({attachments})=>{
            attachments.forEach(({publid_id})=>{
                public_ids.push(publid_id);
            })
        })

        // const removeFilesFromCloudinaryPromise = public_ids.map((public_id)=>{
        //     deleteFromCloudinary(public_id,next);
        // })

        // await Promise.all(deleteFromCloudinary);

        await Promise.all([
            // Delete Files From Cloudinary
            deleteFilesFromCloudinary(public_ids,next),
            chat.deleteOne(),
            Message.deleteMany({chat:chatId})
        ])

        emitEvent(req,REFETCH_CHATS,members);

        return res
        .status(200)
        .json({success:true,message:"Chat deleted successfully"})
    } 
    catch (error) 
    {
        return next(error);    
    }
}

const getMessages = async (req,res,next) => {
    try 
    {
        const chatId = req.params.id;
        const { page = 1 } = req.query;

        const limit = 20;
        const skip = (page-1)*limit;

        const [messages,totalMessagesCount] = await Promise.all([
            Message.find({chat:chatId}).sort({createdAt:-1}).skip(skip).limit(limit).populate("sender","name avatar").lean(),
            Message.countDocuments({chat:chatId}),
        ]);

        const totalPages = Math.ceil(totalMessagesCount / limit);

        return res
        .status(200)
        .json({success:true,messages:messages.reverse(),totalPages})
    } 
    catch (error) 
    {
        return next(error);    
    }
}

export {
    newGroupChat,
    getMyChats,
    getMyGroups,
    addMembers,
    removeMembers,
    leaveGroup,
    sendAttachments,
    getChatDetails,
    renameGroup,
    deleteChat,
    getMessages
}