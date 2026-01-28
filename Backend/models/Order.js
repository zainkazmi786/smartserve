import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true,
  },
  quantity: { type: Number, default: 1 },

  portionSize: {
    type: String,
    enum: ["half", "full"],
    default: "full",
  },

  cookingOverrideType: {
    type: String,
    enum: ["short", "long"],
  },
});

const auditLogSchema = new mongoose.Schema({
  previousState: String,
  newState: String,
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  role: String,
  note: String,
  timestamp: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema(
  {
    cafe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    orderNumber: {
      type: String,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "payment_uploaded",
        "cash_selected",
        "disapproved",
        "approved",
        "preparing",
        "ready",
        "received",
        "cancelled",
      ],
      default: "draft",
    },
    
    // Kitchen queue fields
    queuePosition: {
      type: Number,
      default: null,
    },
    displayedAt: {
      type: Date,
      default: null,
    },
    hasLongItems: {
      type: Boolean,
      default: false,
    },
    timeoutAt: {
      type: Date,
      default: null,
    },

    items: [orderItemSchema],

    payment: {
      method: {
        type: String,
        enum: ["receipt", "cash"],
      },
      receiptImage: String,
      paidAmount: Number,
      rejectionNote: String,
    },

    pricing: {
      subtotal: Number,
      tax: { type: Number, default: 0 },
      total: Number,
    },

    auditLogs: [auditLogSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
