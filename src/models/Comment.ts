import mongoose from "mongoose"

const CommentSchema = new mongoose.Schema(
  {
    spot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurfSpot",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: false, // Make it not required by default
      min: 1, // Keep the min as a static value
      max: 5,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    edited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

CommentSchema.pre("validate", function (next) {
  if (!this.parentId && this.rating === undefined) {
    this.invalidate("rating", "Rating is required for top-level comments")
  }

  if (this.parentId) {
    this.rating = undefined
  }

  next()
})

export default mongoose.models.Comment || mongoose.model("Comment", CommentSchema)

