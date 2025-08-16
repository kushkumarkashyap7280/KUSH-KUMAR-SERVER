import {Schema , model} from "mongoose";

const adminSchema = new Schema({
     Fname : {
        type : String,
        required : true
     },
     Lname : {
        type : String,
     },
     avatar: {
        type: String,
        required: true,
     },
     avatarPublicId: {
        type: String,
     },
     resumeUrl: {
        type: String,
        required: true,
     },
     email : {
        type : String,
        required : true,
        unique : true,
     },
     password : {
        type : String,
        required : true
     },
},
{
    timestamps : true
})


const Admin = model("Admin",adminSchema);

export default Admin;
