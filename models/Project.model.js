import { Schema, model } from "mongoose";

const projectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    techStack: { type: [String], default: [] },
    features: { type: [String], default: [] },
    outcome: { type: String, default: "" },
    repoUrl: { type: String, default: "" },
    demoUrl: { type: String, default: "" },
    images: { type: [String], default: [] },
    imagesPublicIds: { type: [String], default: [] },
    thumbnail: { type: String, default: "" },
    thumbnailPublicId: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: ["planned", "in_progress", "completed", "archived"], default: "planned" },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Project = model("Project", projectSchema);
export default Project;
