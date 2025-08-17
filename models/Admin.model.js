import {Schema , model} from "mongoose";

const adminSchema = new Schema({
     Fname : {
        type : String,
        required : true
     },
     Lname : {
        type : String,
     },
     description: {
        type: String,
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
     qualification: [
        {
           instituteLink: { type: String, required: true },
           mediaUrl: { type: String },
           mediaType: { type: String, enum: ['svg', 'image'] },
           title: { type: String, required: true },
           desc: { type: String },
           skills: [{ type: String }],
           from: { type: Date, required: true },
           to: { type: Date },
           isPublished: { type: Boolean, default: false }
        }
     ],
},
{
    timestamps : true
})

const Admin = model("Admin",adminSchema);

export default Admin;

