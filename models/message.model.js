import mongoose, { Schema,Types,model } from "mongoose";
const {models}=mongoose;

const messageSchema = new Schema({
    content:String,
    attachments:[
        {
            public_id:{
                type:String,
                required:true
            },
            url:{
                type:String,
                required:true
            }
        },
    ],
    sender:{
        type:mongoose.Types.ObjectId,
        ref:"User",
        required:true
    },
    chat:{
        type:Types.ObjectId,
        ref:"Chat",
        required:true
    },
},{timestamps:true});


export const Message = models.Message || new model("Message",messageSchema);