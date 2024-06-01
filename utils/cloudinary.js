import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";
import { ErrorHandler } from './ErrorHandler.js';

export const uploadOnCloudinary = async (LocalPath,next) => {
    try
    {   
        const result = await cloudinary.uploader.upload(`${LocalPath}`);
        fs.unlinkSync(LocalPath);
        return result;
    }
    catch(error)
    {
        fs.unlinkSync(LocalPath);
        return next(new ErrorHandler("Something Wrong in Cloudinary Files Upload",500));
    }
}   
          
export const deleteFilesFromCloudinary = async (public_ids,next) => {
    try
    {

        // const result = await cloudinary.uploader.destroy(public_id);
        // return result;
    }
    catch(error)
    {
        return next(new ErrorHandler("Something Wrong in Cloudinary Files Deletion",500));
    }
}  