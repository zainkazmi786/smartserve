import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema({
  resource: {
    type: String,
    enum: [
      "users",
      "cafes",
      "menus",
      "menuItems",
      "orders",
      "reviews",
      "roles",
      "settings",
    ],
    required: true,
  },
  actions: [
    {
      type: String,
      enum: ["create", "read", "update", "delete", "approve", "manage"],
    },
  ],
});

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["superadmin", "manager", "receptionist", "customer"],
      required: true,
      unique: true,
    },
    description: { type: String },
    permissions: [permissionSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Role", roleSchema);
