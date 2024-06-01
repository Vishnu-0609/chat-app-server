import express from "express";
import { configDotenv } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import UserRouter from "./routes/user.routes.js";
import { connectDB } from "./DB/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import ChatRouter from "./routes/chat.routes.js";
import { createUser } from "./seeders/user.js";
import { createGroupChats, createSingleChats,createMessagesInAChat } from "./seeders/chat.js";
import AdminRouter from "./routes/admin.routes.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { NEW_MESSAGE, NEW_MESSAGE_ALERT } from "./constants/events.js";
import { v4 as uuid } from "uuid";
import { getSockets } from "./constants/socket.js";
import { Message } from "./models/message.model.js";
import { ErrorHandler } from "./utils/ErrorHandler.js";
import {v2 as cloudinary} from 'cloudinary';

configDotenv({
    path:"./.env",
})

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const usersSocketIds = new Map();

const app = express();
const server = createServer(app);
const io = new Server(server,{});

app.use(cors({
    origin:["http://localhost:5173","http://localhost:4173",process.env.FRONTENED_URL],
    credentials:true
}));
app.use(cookieParser());
app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended:true,limit:"16kb"}));
app.use(express.static("public"));

app.use("/api/v1/user",UserRouter);
app.use("/api/v1/chat",ChatRouter);
app.use("/api/v1/admin",AdminRouter);

app.get("/",(req,res)=>{
    res.send("Hello World");
})

io.use((socket,next)=>{

});

io.on("connection",(socket)=>{

    // one way to access user token that sent from frontened during connection
    // socket.handshake.query.usertoken;
    console.log("user connected "+socket.id);

    const user = {
        _id:"6651e54ab90149a49c8af6d7",
        name:"Vishnu"
    };

    usersSocketIds.set(user._id.toString(),socket.id);

    socket.on(NEW_MESSAGE,async ({chatId,members,message})=>{

        const messageForRealTime = {
            content:message,
            _id:uuid(),
            sender:{
                _id:user._id,
                name:user.name
            },
            chat:chatId,
            createdAt:new Date().toISOString(),
        }

        const membersSocket = getSockets(members);

        // console.log(membersSocket);

        io.to(membersSocket).emit(NEW_MESSAGE,{
            chatId,
            message:messageForRealTime
        });

        io.to(membersSocket).emit(NEW_MESSAGE_ALERT,{chatId});

        const messageForDB = {
            content:message,
            sender:user._id,
            chat:chatId,
        }

        try
        {
            await Message.create(messageForDB);
        }
        catch(error)
        {
            next(new ErrorHandler("Something Wrong In Socket Message Creation",500));
        }
    })

    socket.on("disconnect",()=>{
        console.log(socket.id+" Disconnected");
        usersSocketIds.delete(user._id.toString());
    })
})

app.use(errorMiddleware);

connectDB()
.then(()=>{
    server.listen(process.env.PORT,()=>{
        console.log(`server run at ${process.env.PORT} in ${process.env.NODE_ENV.trim()} Mode`);
    })
    // createUser(5);
    // createSingleChats(10);
    // createGroupChats(10);
    // createMessagesInAChat("66549ca3f19b8b9410d47de1",20);
})
.catch(()=>{
    console.log("Something Wrong In DataBase Connectivity");
})

export {
    usersSocketIds
}