import { Schema, model } from "mongoose";

const postSchema = new Schema(
  {
    platform: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
    excerpt: { type: String, default: "" },
    tags: { type: [String], default: [] },
    image: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for performance
postSchema.index({ createdAt: -1 });
postSchema.index({ published: 1, order: 1, createdAt: -1 });

const Post = model("Post", postSchema);
export default Post;
