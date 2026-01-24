import mongoose from "mongoose";

const cafeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    linkedManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Cafe can be created without manager
    },

    settings: {
      taxPercentage: { type: Number, default: 0 },
    },
    
    // Kitchen queue management
    currentKitchenOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  { 
    timestamps: true,
    collection: "cafes" // Explicitly set collection name to avoid pluralization issues
  }
);

export default mongoose.model("Cafe", cafeSchema);
