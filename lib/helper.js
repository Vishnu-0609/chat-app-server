import { Chat } from "../models/chat.model.js";
import { User } from "../models/user.model.js";

export const getTotalFriends = async(userId) => {
    const myChats = await Chat.find({members:userId,groupChat:false}).lean();

    let members = myChats.flatMap((chat)=>chat.members);

    let friends = [];

    members.map((id)=>{
        if(!friends.includes(id.toString()) && id.toString()!==userId.toString())
            friends.push(id.toString())
    })

    const allFriends = await User.find({_id:{$in:friends}}).countDocuments();

    return allFriends
}

export const getTotalGroups = async(userId) => {
    const TotalGroups = await Chat.find({members:userId,groupChat:true}).countDocuments();

    return TotalGroups
}