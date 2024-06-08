import { v2 as cloudinary } from 'cloudinary';
import cookieParser from "cookie-parser";
import cors from "cors";
import { configDotenv } from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { connectDB } from "./DB/index.js";
import { CHAT_JOINED, CHAT_LEAVED, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from "./constants/events.js";
import { getSockets } from "./constants/socket.js";
import { socketAuthenticator } from "./middlewares/auth.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { Message } from "./models/message.model.js";
import AdminRouter from "./routes/admin.routes.js";
import ChatRouter from "./routes/chat.routes.js";
import UserRouter from "./routes/user.routes.js";
import { ErrorHandler } from "./utils/ErrorHandler.js";

configDotenv({
    path:"./.env",
})

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const usersSocketIds = new Map();
const onlineUsers = new Set();

const app = express();
const server = createServer(app);

const io = new Server(server,{
    cors:{
        origin:["http://localhost:5173","http://localhost:4173",process.env.FRONTENED_URL],
        methods:["GET","POST","PUT","DELETE"],
        credentials:true
    }
});

app.set("io",io)

app.use(cors({
    origin:["http://localhost:5173","http://localhost:4173",process.env.FRONTENED_URL],
    methods:["GET","POST","PUT","DELETE"],
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
    cookieParser()(socket.request,socket.request.res,async(err)=>{
        await socketAuthenticator(err,socket,next);
    })
});

io.on("connection",(socket)=>{

    const user = socket?.user;

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

    socket.on(START_TYPING,async({chatId,members})=>{
        const membersSockets = getSockets(members);
        socket.to(membersSockets).emit(START_TYPING,{chatId})
    })

    socket.on(STOP_TYPING,async({chatId,members})=>{
        const membersSockets = getSockets(members);
        socket.to(membersSockets).emit(STOP_TYPING,{chatId})
    })

    socket.on(CHAT_JOINED,async({userId,members})=>{
        onlineUsers.add(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS,Array.from(onlineUsers));
    })

    socket.on(CHAT_LEAVED,async({userId,members})=>{
        onlineUsers.delete(userId.toString());
        
        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS,Array.from(onlineUsers));
    })

    socket.on("disconnect",()=>{
        onlineUsers.delete(user._id.toString());
        usersSocketIds.delete(user._id.toString());
        socket.broadcast.emit(ONLINE_USERS,Array.from(onlineUsers))
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
};
