import mongoose, { Schema, model } from "mongoose";
const {models} = mongoose;
import bcrypt,{hash} from "bcrypt";

const userSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    bio:{
        type:String,
    },
    username:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true,
        select:false
    },
    avatar:{
        public_id:{
            type:String,
            required:true
        },
        url:{
            type:String,
            required:true
        }
    }
},{timestamps:true});

userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();
    this.password = await hash(this.password,10);
})

export const User = models.User || model("User",userSchema);