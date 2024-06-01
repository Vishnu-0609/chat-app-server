import { faker } from "@faker-js/faker";
import { User } from "../models/user.model.js";

export const createUser = async (num) => {
    try 
    {
        const usersPromise = [];

        for(let i=0;i<num;i++)
        {
            const tempuser = User.create({
                name:faker.person.fullName(),
                username:faker.internet.userName(),
                bio:faker.lorem.sentence(10),
                password:"password",
                avatar:{
                    public_id:faker.system.fileName(),
                    url:faker.image.avatar(),
                }
            })
            usersPromise.push(tempuser);
        }

        await Promise.all(usersPromise);
        console.log("Users Created");
        process.emit(1);
    } 
    catch (error) 
    {
        console.log(error);    
        process.exit(1);
    }
}