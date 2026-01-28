import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Menu from "../models/Menu.js";
import Cafe from "../models/Cafe.js";
import User from "../models/User.js";
import {
  addToQueue,
  removeFromQueue,
  getNextOrder,
  setCurrentKitchenOrder,
} from "../services/kitchenQueueManager.js";
import { notifyOrderStatusChange, notifyKitchenUpdate } from "../services/notificationService.js";

/**
 * Helper: Add audit log
 */
const addAuditLog = (order, previousStatus, newStatus, changedBy, role, note = "") => {
  order.auditLogs.push({
    previousState: previousStatus,
    newState: newStatus,
    changedBy: changedBy._id,
    role: role,
    note: note,
    timestamp: new Date(),
  });
};

/**
 * Helper: Validate status transition
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    draft: ["payment_uploaded", "cash_selected", "cancelled"],
    payment_uploaded: ["approved", "disapproved", "cancelled"],
    cash_selected: ["approved", "disapproved", "cancelled"],
    disapproved: ["payment_uploaded", "cancelled"],
    approved: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["received"],
    received: [],
    cancelled: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Generate unique order number (e.g. ORD-A3X9K2)
 */
const generateUniqueOrderNumber = async () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "ORD-";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  const exists = await Order.findOne({ orderNumber: result });
  if (exists) return generateUniqueOrderNumber();
  return result;
};

// ============ ORDER CREATION ============

/**
 * POST /api/orders
 * Create order from cart (Customer)
 */
export const createOrder = async (req, res) => {
  try {
    let { items, paymentMethod, receiptImage } = req.body;
    const currentUser = req.user;
    const cafeId = req.activeCafeId;

    // Parse items if it's a string (from multipart/form-data)
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid items format. Must be a valid JSON array.",
          error: parseError.message,
        });
      }
    }

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      });
    }

    if (!paymentMethod || !["receipt", "cash"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Payment method must be 'receipt' or 'cash'",
      });
    }

    // Handle receipt image - from file upload or URL
    let finalReceiptImage = receiptImage;
    
    // If file was uploaded via multer
    if (req.file && req.file.path) {
      finalReceiptImage = req.file.path; // Cloudinary URL is in file.path
    }

    // Validate receipt for receipt payment method
    if (paymentMethod === "receipt") {
      if (!finalReceiptImage) {
        return res.status(400).json({
          success: false,
          message: "Receipt image is required for receipt payment. Upload file as 'receiptImage' field or provide URL in 'receiptImage' body field.",
        });
      }
    }

    // Verify cafe exists
    const cafe = await Cafe.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Get active menu (same logic as getActiveMenu - handles time-slot based menus)
    console.log("🔍 [Create Order] Looking for active menu for cafe:", cafeId);
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    console.log("🔍 [Create Order] Current day:", currentDay, "Current time:", currentTime);

    // Priority 1: Check for scheduled menu (time-slot based)
    const allMenus = await Menu.find({
      cafe: cafeId,
      status: { $ne: "deleted" },
      timeSlots: { $exists: true, $ne: [] },
    }).populate("items");

    console.log("🔍 [Create Order] Found", allMenus.length, "menus with time slots");

    let activeMenu = null;
    let highestPriority = -1;

    // Check time slots
    for (const menu of allMenus) {
      for (const slot of menu.timeSlots) {
        if (
          slot.dayOfWeek === currentDay &&
          currentTime >= slot.startTime &&
          currentTime <= slot.endTime
        ) {
          const priority = slot.priority || 0;
          console.log("🔍 [Create Order] Found matching time slot for menu:", menu._id, "priority:", priority);
          if (!activeMenu || priority > highestPriority) {
            activeMenu = menu;
            highestPriority = priority;
          }
        }
      }
    }

    // Priority 2: If no scheduled menu, check manually activated menu
    if (!activeMenu) {
      console.log("🔍 [Create Order] No time-slot menu found, checking manually activated menu...");
      activeMenu = await Menu.findOne({
        cafe: cafeId,
        status: "active",
      }).populate("items");
    }

    if (!activeMenu) {
      // Debug: Check all menus for this cafe
      const allCafeMenus = await Menu.find({
        cafe: cafeId,
        status: { $ne: "deleted" },
      }).select("_id name status timeSlots");
      
      console.log("❌ [Create Order] No active menu found!");
      console.log("❌ [Create Order] All menus for cafe:", JSON.stringify(allCafeMenus, null, 2));
      
      return res.status(400).json({
        success: false,
        message: "No active menu available for this cafe",
        debug: {
          cafeId,
          currentDay,
          currentTime,
          menusFound: allCafeMenus.length,
          menus: allCafeMenus,
        },
      });
    }

    console.log("✅ [Create Order] Active menu found:", activeMenu._id, "Status:", activeMenu.status);

    // Validate and calculate pricing
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of items) {
      const { itemId, quantity, cookingOverrideType, portionSize } = cartItem;
      const ps = portionSize || "full";

      if (!itemId || !quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Each item must have itemId and quantity >= 1",
        });
      }

      if (!["half", "full"].includes(ps)) {
        return res.status(400).json({
          success: false,
          message: "portionSize must be 'half' or 'full'",
        });
      }

      // Find menu item
      const menuItem = await MenuItem.findById(itemId);
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item ${itemId} not found`,
        });
      }

      // Verify item belongs to cafe and is active
      if (menuItem.cafe.toString() !== cafeId.toString()) {
        return res.status(400).json({
          success: false,
          message: `Item ${menuItem.name} does not belong to this cafe`,
        });
      }

      if (!menuItem.isActive) {
        return res.status(400).json({
          success: false,
          message: `Item ${menuItem.name} is not available`,
        });
      }

      // Verify item is in active menu
      const isInMenu = activeMenu.items.some(
        (item) => item._id.toString() === itemId.toString()
      );
      if (!isInMenu) {
        return res.status(400).json({
          success: false,
          message: `Item ${menuItem.name} is not in the active menu`,
        });
      }

      // Validate cooking override type
      if (cookingOverrideType && !["short", "long"].includes(cookingOverrideType)) {
        return res.status(400).json({
          success: false,
          message: "cookingOverrideType must be 'short' or 'long'",
        });
      }

      const unitPrice = ps === "half" ? menuItem.price / 2 : menuItem.price;
      const itemTotal = unitPrice * quantity;
      subtotal += itemTotal;

      orderItems.push({
        item: itemId,
        quantity,
        portionSize: ps,
        cookingOverrideType: cookingOverrideType || undefined,
      });
    }

    // Calculate tax and total
    const taxPercentage = cafe.settings?.taxPercentage || 0;
    const tax = (subtotal * taxPercentage) / 100;
    const total = subtotal + tax;

    // Determine initial status
    const initialStatus =
      paymentMethod === "receipt" ? "payment_uploaded" : "cash_selected";

    const orderNumber = await generateUniqueOrderNumber();

    // Create order
    const order = new Order({
      orderNumber,
      cafe: cafeId,
      createdBy: currentUser._id,
      status: initialStatus,
      items: orderItems,
      payment: {
        method: paymentMethod,
        receiptImage: finalReceiptImage || undefined,
        paidAmount: null, // Set during approval
      },
      pricing: {
        subtotal,
        tax,
        total,
      },
    });

    // Add initial audit log
    addAuditLog(order, "draft", initialStatus, currentUser, "customer");

    await order.save();

    // Populate order details
    await order.populate([
      { path: "createdBy", select: "name email phone" },
      { path: "cafe", select: "name" },
      { path: "items.item", select: "name price type" },
    ]);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: { order },
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// ============ RECEIPT UPLOAD ============

/**
 * POST /api/orders/:id/upload-receipt
 * Upload/re-upload receipt (Customer)
 */
export const uploadReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { receiptImage } = req.body;
    const currentUser = req.user;

    // Handle receipt image - from file upload or URL
    let finalReceiptImage = receiptImage;
    
    // If file was uploaded via multer
    if (req.file && req.file.path) {
      finalReceiptImage = req.file.path; // Cloudinary URL is in file.path
    }

    if (!finalReceiptImage) {
      return res.status(400).json({
        success: false,
        message: "Receipt image is required",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify ownership
    if (order.createdBy.toString() !== currentUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only upload receipts for your own orders",
      });
    }

    // Check if receipt upload is allowed
    if (!["payment_uploaded", "disapproved"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot upload receipt when order status is ${order.status}`,
      });
    }

    const previousStatus = order.status;
    order.status = "payment_uploaded";
    order.payment.receiptImage = finalReceiptImage;
    order.payment.rejectionNote = undefined; // Clear rejection note

    addAuditLog(order, previousStatus, "payment_uploaded", currentUser, "customer");

    await order.save();

    await order.populate([
      { path: "createdBy", select: "name email phone" },
      { path: "cafe", select: "name" },
    ]);

    res.json({
      success: true,
      message: "Receipt uploaded successfully",
      data: { order },
    });
  } catch (error) {
    console.error("Upload receipt error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload receipt",
      error: error.message,
    });
  }
};

// ============ APPROVE/DISAPPROVE ============

/**
 * POST /api/orders/:id/approve
 * Approve order (Receptionist, Manager)
 */
export const approveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAmount, cookingOverrides } = req.body;
    const currentUser = req.user;
    const cafeId = req.activeCafeId;

    const order = await Order.findById(id).populate("items.item");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify cafe ownership
    if (order.cafe.toString() !== cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only approve orders for your cafe",
      });
    }

    // Check if can be approved
    if (!["payment_uploaded", "cash_selected"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be approved when status is ${order.status}`,
      });
    }

    // Apply cooking overrides if provided
    if (cookingOverrides && Array.isArray(cookingOverrides)) {
      for (const override of cookingOverrides) {
        const orderItem = order.items.id(override.orderItemId);
        if (orderItem && ["short", "long"].includes(override.type)) {
          orderItem.cookingOverrideType = override.type;
        }
      }
    }

    const previousStatus = order.status;
    order.status = "approved";
    order.approvedBy = currentUser._id;
    order.payment.paidAmount = paidAmount || order.pricing.total;

    addAuditLog(order, previousStatus, "approved", currentUser, currentUser.role.name, "Order approved");

    await order.save();

    // Add to kitchen queue
    await addToQueue(order._id, cafeId);

    // Notify customer
    await notifyOrderStatusChange(order, "approved", currentUser);

    // Notify kitchen screen about new order in queue
    await notifyKitchenUpdate(cafeId, "queue-updated", {
      orderId: order._id.toString(),
    });

    // Populate order details
    await order.populate([
      { path: "createdBy", select: "name email phone" },
      { path: "approvedBy", select: "name" },
      { path: "cafe", select: "name" },
      { path: "items.item", select: "name price type" },
    ]);

    res.json({
      success: true,
      message: "Order approved successfully",
      data: { order },
    });
  } catch (error) {
    console.error("Approve order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve order",
      error: error.message,
    });
  }
};

/**
 * POST /api/orders/:id/disapprove
 * Disapprove order (Receptionist, Manager)
 */
export const disapproveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionNote } = req.body;
    const currentUser = req.user;
    const cafeId = req.activeCafeId;

    if (!rejectionNote) {
      return res.status(400).json({
        success: false,
        message: "Rejection note is required",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify cafe ownership
    if (order.cafe.toString() !== cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only disapprove orders for your cafe",
      });
    }

    // Check if can be disapproved
    if (!["payment_uploaded", "cash_selected"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be disapproved when status is ${order.status}`,
      });
    }

    const previousStatus = order.status;
    order.status = "disapproved";
    order.payment.rejectionNote = rejectionNote;

    addAuditLog(
      order,
      previousStatus,
      "disapproved",
      currentUser,
      currentUser.role.name,
      rejectionNote
    );

    await order.save();

    // Notify customer
    await notifyOrderStatusChange(order, "disapproved", currentUser);

    await order.populate([
      { path: "createdBy", select: "name email phone" },
      { path: "cafe", select: "name" },
    ]);

    res.json({
      success: true,
      message: "Order disapproved",
      data: { order },
    });
  } catch (error) {
    console.error("Disapprove order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disapprove order",
      error: error.message,
    });
  }
};

// ============ CANCEL ORDER ============

/**
 * POST /api/orders/:id/cancel
 * Cancel order (Customer before approval, Staff anytime)
 */
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationNote } = req.body;
    const currentUser = req.user;
    const cafeId = req.activeCafeId;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check permissions
    const isOwner = order.createdBy.toString() === currentUser._id.toString();
    const isStaff =
      currentUser.role.name === "manager" || currentUser.role.name === "receptionist";

    // Customer can only cancel before approval
    if (isOwner && !isStaff) {
      if (["approved", "preparing", "ready"].includes(order.status)) {
        return res.status(403).json({
          success: false,
          message: "Customers cannot cancel orders after approval",
        });
      }
    }

    // Staff can cancel anytime
    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to cancel this order",
      });
    }

    // Check if already cancelled or received
    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    if (order.status === "received") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a received order",
      });
    }

    // Remove from kitchen queue if in queue
    if (order.status === "preparing" || order.status === "approved") {
      try {
        await removeFromQueue(order._id, cafeId || order.cafe);
      } catch (error) {
        console.error("Error removing from queue:", error);
      }
    }

    const previousStatus = order.status;
    order.status = "cancelled";

    addAuditLog(
      order,
      previousStatus,
      "cancelled",
      currentUser,
      currentUser.role.name,
      cancellationNote || "Order cancelled"
    );

    await order.save();

    // Notify customer
    await notifyOrderStatusChange(order, "cancelled", currentUser);

    await order.populate([
      { path: "createdBy", select: "name email phone" },
      { path: "cafe", select: "name" },
    ]);

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: { order },
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};

// ============ MARK READY ============

/**
 * POST /api/orders/:id/mark-ready
 * Mark order as ready (Kitchen button press)
 */
export const markOrderReady = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const cafeId = req.activeCafeId;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify cafe ownership
    if (order.cafe.toString() !== cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only mark orders ready for your cafe",
      });
    }

    // Check if can be marked ready
    if (order.status !== "preparing") {
      return res.status(400).json({
        success: false,
        message: `Order must be in 'preparing' status to mark ready. Current: ${order.status}`,
      });
    }

    const previousStatus = order.status;
    order.status = "ready";

    addAuditLog(order, previousStatus, "ready", currentUser, currentUser.role.name || "kitchen");

    await order.save();

    // Remove from kitchen queue
    await removeFromQueue(order._id, cafeId);

    // Notify customer
    await notifyOrderStatusChange(order, "ready", currentUser);

    // Notify kitchen screen about queue update
    await notifyKitchenUpdate(cafeId, "order-ready", {
      orderId: order._id.toString(),
    });

    await order.populate([
      { path: "createdBy", select: "name email phone" },
      { path: "cafe", select: "name" },
      { path: "items.item", select: "name price type" },
    ]);

    res.json({
      success: true,
      message: "Order marked as ready",
      data: { order },
    });
  } catch (error) {
    console.error("Mark ready error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark order ready",
      error: error.message,
    });
  }
};

// ============ MARK RECEIVED ============

/**
 * POST /api/orders/:id/mark-received
 * Mark order as received (Customer)
 */
export const markOrderReceived = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify ownership
    if (order.createdBy.toString() !== currentUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only mark your own orders as received",
      });
    }

    // Check if can be marked received
    if (order.status !== "ready") {
      return res.status(400).json({
        success: false,
        message: `Order must be 'ready' to mark received. Current: ${order.status}`,
      });
    }

    const previousStatus = order.status;
    order.status = "received";

    addAuditLog(order, previousStatus, "received", currentUser, "customer");

    await order.save();

    await order.populate([
      { path: "createdBy", select: "name email phone" },
      { path: "cafe", select: "name" },
    ]);

    res.json({
      success: true,
      message: "Order marked as received",
      data: { order },
    });
  } catch (error) {
    console.error("Mark received error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark order received",
      error: error.message,
    });
  }
};

// ============ GET ORDER ============

/**
 * GET /api/orders/:id
 * Get order details
 */
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const cafeId = req.activeCafeId;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check permissions
    const isOwner = order.createdBy.toString() === currentUser._id.toString();
    const isStaff =
      (currentUser.role.name === "manager" || currentUser.role.name === "receptionist") &&
      order.cafe.toString() === cafeId?.toString();

    if (!isOwner && !isStaff && currentUser.role.name !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this order",
      });
    }

    await order.populate([
      { path: "createdBy", select: "name email phone" },
      { path: "approvedBy", select: "name" },
      { path: "cafe", select: "name email phone" },
      { path: "items.item", select: "name description price type timeToCook images" },
    ]);

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get order",
      error: error.message,
    });
  }
};

// ============ MY ACTIVE ORDER (Customer) ============

/**
 * GET /api/orders/me/active
 * Get customer's current incomplete order (for blocking new orders & FAB)
 */
export const getMyActiveOrder = async (req, res) => {
  try {
    const currentUser = req.user;

    const order = await Order.findOne({
      createdBy: currentUser._id,
      status: {
        $in: [
          "payment_uploaded",
          "cash_selected",
          "approved",
          "preparing",
          "ready",
          "disapproved",
        ],
      },
    })
      .sort({ createdAt: -1 })
      .limit(1)
      .populate([
        { path: "createdBy", select: "name email phone" },
        { path: "cafe", select: "name" },
        { path: "items.item", select: "name price type" },
      ]);

    res.json({
      success: true,
      data: { order: order || null },
    });
  } catch (error) {
    console.error("Get my active order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get active order",
      error: error.message,
    });
  }
};

// ============ ORDER HISTORY ============

/**
 * GET /api/orders
 * Get order history (filtered by role)
 */
export const getOrderHistory = async (req, res) => {
  try {
    const { status, startDate, endDate, paymentMethod, customerId } = req.query;
    const currentUser = req.user;
    const cafeId = req.activeCafeId;

    // Build query based on role
    let query = {};

    // Customer: only own orders
    if (currentUser.role.name === "customer") {
      query.createdBy = currentUser._id;
    }
    // Receptionist: today's orders for their cafe
    else if (currentUser.role.name === "receptionist") {
      query.cafe = cafeId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: today };
    }
    // Manager: all orders for their cafe
    else if (currentUser.role.name === "manager") {
      query.cafe = cafeId;
    }
    // Superadmin: all orders (with optional filters)
    // No additional query restrictions

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    if (paymentMethod) {
      query["payment.method"] = paymentMethod;
    }

    if (customerId && (currentUser.role.name === "manager" || currentUser.role.name === "superadmin")) {
      query.createdBy = customerId;
    }

    // Execute query
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate([
        { path: "createdBy", select: "name email phone" },
        { path: "approvedBy", select: "name" },
        { path: "cafe", select: "name" },
        { path: "items.item", select: "name price" },
      ]);

    res.json({
      success: true,
      data: { orders, count: orders.length },
    });
  } catch (error) {
    console.error("Get order history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get order history",
      error: error.message,
    });
  }
};

// ============ KITCHEN QUEUE ============

/**
 * GET /api/orders/kitchen/active
 * Get current active order displayed on kitchen screen
 */
export const getActiveKitchenOrder = async (req, res) => {
  try {
    const cafeId = req.activeCafeId;

    const cafe = await Cafe.findById(cafeId).populate({
      path: "currentKitchenOrder",
      populate: [
        { path: "createdBy", select: "name email phone" },
        { path: "items.item", select: "name description price type images timeToCook" },
      ],
    });

    if (!cafe || !cafe.currentKitchenOrder) {
      return res.json({
        success: true,
        message: "No active order",
        data: { order: null },
      });
    }

    res.json({
      success: true,
      data: { order: cafe.currentKitchenOrder },
    });
  } catch (error) {
    console.error("Get active kitchen order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get active kitchen order",
      error: error.message,
    });
  }
};

/**
 * GET /api/orders/kitchen/queue
 * Get kitchen queue list (all orders waiting)
 */
export const getKitchenQueue = async (req, res) => {
  try {
    const cafeId = req.activeCafeId;

    // Get orders in queue (status: preparing or approved)
    const queueOrders = await Order.find({
      cafe: cafeId,
      status: { $in: ["preparing", "approved"] },
      queuePosition: { $exists: true },
    })
      .sort({ queuePosition: 1 }) // Sort by queue position
      .populate([
        { path: "createdBy", select: "name" },
        { path: "items.item", select: "name price type images" },
      ])
      .select("_id status queuePosition items createdBy createdAt pricing hasLongItems");

    res.json({
      success: true,
      data: { queue: queueOrders },
    });
  } catch (error) {
    console.error("Get kitchen queue error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get kitchen queue",
      error: error.message,
    });
  }
};

/**
 * GET /api/orders/kitchen/next
 * Get next order for kitchen screen
 */
export const getNextKitchenOrder = async (req, res) => {
  try {
    const cafeId = req.activeCafeId;

    const nextOrderId = await getNextOrder(cafeId);

    if (!nextOrderId) {
      return res.json({
        success: true,
        message: "No orders in queue",
        data: { order: null },
      });
    }

    // Set as current kitchen order (display on screen)
    await setCurrentKitchenOrder(cafeId, nextOrderId);

    const order = await Order.findById(nextOrderId).populate([
      { path: "createdBy", select: "name email phone" },
      { path: "items.item", select: "name description price type images timeToCook" },
    ]);

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error("Get next kitchen order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get next kitchen order",
      error: error.message,
    });
  }
};
