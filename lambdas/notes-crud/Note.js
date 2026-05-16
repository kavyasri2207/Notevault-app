const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
    user: {
      type: String, // Storing Cognito sub (UUID) as string
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

noteSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.models.Note || mongoose.model("Note", noteSchema);
