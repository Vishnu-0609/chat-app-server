import  mongoose,{ Schema,model } from "mongoose";
const {models} = mongoose;

const requestSchema = new Schema({
    status:{
        type:String,
        default:"pending",
        enum:["pending","accepted","rejected"],
    },
    sender:{
        type:mongoose.Types.ObjectId,
        ref:"User",
        required:true
    },
    receiver:{
        type:mongoose.Types.ObjectId,
        ref:"User",
        required:true
    },
},{timestamps:true});


export const Request = models.Request || new model("Request",requestSchema);