import mongoose from "mongoose";

export const connectDB = async() =>
{
    try {
        const {connection} = await mongoose.connect(`${process.env.MONGO_URL}/${process.env.DB_NAME}`);
        console.log(`MongoDB Connected to DB: ${connection.host}`);
    } 
    catch (error) {
        console.log("MongoDB ERROR!");
        throw error;
    }
}