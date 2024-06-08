import { getSockets } from "../constants/socket.js"

const emitEvent = (req,event,users,data) => {
    const io = req.app.get("io");
    const membersSockets = getSockets(users);
    io.to(membersSockets).emit(event,data);
};

export {
    emitEvent
}