import mongoose, { Schema,model } from "mongoose";
const {models}=mongoose;

const chatSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    groupChat:{
        type:Boolean,
        default:false
    },
    creator:{
        type:mongoose.Types.ObjectId,
        ref:"User",
    },
    members:[
        {
            type:mongoose.Types.ObjectId,
            ref:"User",
        }
    ]
},{timestamps:true});


export const Chat = models.Chat || new model("Chat",chatSchema);