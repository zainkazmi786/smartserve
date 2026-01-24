import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    cafe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: true,
    },

    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    images: [{ type: String }],
    price: { type: Number, required: true },

    type: {
      type: String,
      enum: ["short", "long"],
      required: true,
    },

    timeToCook: {
      type: Number, // in seconds
      required: false, // Required only if type is "long"
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Pre-save validation: timeToCook required if type is "long"
menuItemSchema.pre("save", function (next) {
  if (this.type === "long" && (!this.timeToCook || this.timeToCook <= 0)) {
    return next(new Error("timeToCook is required for long type items"));
  }
  if (this.type === "short" && this.timeToCook) {
    this.timeToCook = null;
  }
  next();
});

export default mongoose.model("MenuItem", menuItemSchema);
