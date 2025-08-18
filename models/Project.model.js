import { Schema, model } from "mongoose";

const projectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    techStack: [
      {
        type: String,
      },
    ],
    features: { type: [String], default: [] },
    outcome: { type: String, default: "" },
    repoUrl: { type: String, default: "" },
    demoUrl: { type: String, default: "" },
    imagesPublicIds: { type: [String], default: [] },
    thumbnail: { type: String, default: "" },
    thumbnailPublicId: { type: String, default: "" },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Project = model("Project", projectSchema);
export default Project;
