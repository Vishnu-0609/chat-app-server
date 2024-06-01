import { usersSocketIds } from "../app.js";

export const getOtherMembers = (members,userId) => {
    members.find((member)=>member._id.toString() !== userId.toString());
}

export const getSockets = (users=[]) => {
    const sockets = users.map((user)=>{
        return usersSocketIds.get(user.toString());
    })

    return sockets;
}