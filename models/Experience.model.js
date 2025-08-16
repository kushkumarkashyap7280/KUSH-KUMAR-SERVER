import { Schema, model } from "mongoose";

const experienceSchema = new Schema(
  {
    role: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    responsibilities: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    image: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    logoPath: { type: String, default: "" },
    logoPublicId: { type: String, default: "" },
    review: { type: String, default: "" },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Experience = model("Experience", experienceSchema);
export default Experience;
