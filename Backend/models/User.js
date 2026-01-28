import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String },
    profilePicture: { type: String }, // Cloudinary URL
    status: { type: String, enum: ["active", "inactive"], default: "active" },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    cafes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cafe",
      },
    ],
  },
  { timestamps: true }
);

// Pre-save hook to enforce single cafe for manager and receptionist
userSchema.pre("save", async function (next) {
  // Only validate if role and cafes are populated or modified
  if (this.isModified("cafes") || this.isModified("role")) {
    try {
      await this.populate("role");
      
      // Check if role is manager or receptionist
      if (this.role && (this.role.name === "manager" || this.role.name === "receptionist")) {
        // Ensure only one cafe
        if (this.cafes && this.cafes.length > 1) {
          // Keep only the first cafe
          this.cafes = [this.cafes[0]];
        }
        
        // Ensure at least one cafe
        if (!this.cafes || this.cafes.length === 0) {
          return next(new Error(`${this.role.name} must be assigned to at least one cafe`));
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

export default mongoose.model("User", userSchema);
