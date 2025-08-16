import { Schema, model } from "mongoose";

const contactSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    email: { type: String, required: true, trim: true, lowercase: true },
    topic: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["professional", "help", "other"], default: "other" },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

contactSchema.index({ createdAt: -1 });

const Contact = model("Contact", contactSchema);
export default Contact;
