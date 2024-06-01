import { body, check, param, query, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/ErrorHandler.js";

const validateHandler = (req,res,next) => {
    const errors = validationResult(req);
    let errorMessages = errors.array().map((error)=>error.msg).join(", ")

    if(errors.isEmpty())
        return next();
    else 
        return next(new ErrorHandler(errorMessages,400));
}

const registerValidator = () => [
    body("name","Please Enter Name").notEmpty(),
    body("username","Please Enter Username").notEmpty(),
    body("password","Please Enter Password").notEmpty(),
    body("bio","Please Enter Bio").notEmpty()
];

const loginValidator = () => [
    body("username","Please Enter Username").notEmpty(),
    body("password","Please Enter Password").notEmpty(),
];

const newGroupValidator = () => [
    body("name","Please Enter Name").notEmpty(),
    body("members").notEmpty().withMessage("Please Enter Members").isArray({min:2,max:100}).withMessage("Members must be 2-100"),
];

const addMemberValidator = () => [
    body("chatId","Please Enter Chat ID").notEmpty(),
    body("members").notEmpty().withMessage("Please Enter Members").isArray({min:1,max:97}).withMessage("Members must be 1-97"),
];

const removeMemberValidator = () => [
    body("memberId","Please Enter Member ID").notEmpty(),
    body("chatId","Please Enter Chat ID").notEmpty(),
];

const leaveGroupValidator = () => [
    param("id","Please Enter Chat ID").notEmpty(),
];

const sendAttachmentsValidator = () => [
    body("chatId","Please Enter Chat ID").notEmpty(),
];

const getMessagesValidator = () => [
    param("id","Please Enter Chat ID").notEmpty(),
];

const groupRenameValidator = () => [
    param("id","Please Enter Chat ID").notEmpty(),
    body("name","Please Enter Group Name").notEmpty()
];

const sendRequestValidator = () => [
    body("userId","Please Enter User ID").notEmpty()
];

const acceptRequestValidator = () => [
    body("requestId","Please Enter Request ID").notEmpty(),
    body("accept").notEmpty().withMessage("Please add Accept").isBoolean().withMessage("Accept must be boolean"),
];

const adminLoginValidator = () => [
    body("secretKey","Please Enter Secret Key").notEmpty(),
];

export {
    validateHandler,
    registerValidator,
    loginValidator,
    newGroupValidator,
    addMemberValidator,
    removeMemberValidator,
    leaveGroupValidator,
    sendAttachmentsValidator,
    getMessagesValidator,
    groupRenameValidator,
    sendRequestValidator,
    acceptRequestValidator,
    adminLoginValidator
}