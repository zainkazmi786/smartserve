import express from "express";
import {
  createOrder,
  uploadReceipt,
  approveOrder,
  disapproveOrder,
  cancelOrder,
  markOrderReady,
  markOrderReceived,
  getOrder,
  getOrderHistory,
  getActiveKitchenOrder,
  getKitchenQueue,
  getNextKitchenOrder,
} from "../controllers/orderController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { uploadReceiptImage } from "../middleware/receiptUpload.js";

const router = express.Router();

/**
 * @route   POST /api/orders
 * @desc    Create order from cart (Customer)
 * @access  Private (Customer)
 * @note    Can use multipart/form-data for receipt upload or application/json with receipt URL
 */
router.post(
  "/",
  authenticate,
  requireRole("customer"),
  uploadReceiptImage, // Middleware handles receipt upload if file present, otherwise passes through
  createOrder
);

/**
 * @route   POST /api/orders/:id/upload-receipt
 * @desc    Upload/re-upload receipt (Customer)
 * @access  Private (Customer)
 * @note    Can use multipart/form-data for receipt upload or application/json with receipt URL
 */
router.post(
  "/:id/upload-receipt",
  authenticate,
  requireRole("customer"),
  uploadReceiptImage, // Middleware handles receipt upload if file present, otherwise passes through
  uploadReceipt
);

/**
 * @route   POST /api/orders/:id/approve
 * @desc    Approve order (Receptionist, Manager)
 * @access  Private (Receptionist, Manager)
 */
router.post("/:id/approve", authenticate, requireRole("manager", "receptionist"), approveOrder);

/**
 * @route   POST /api/orders/:id/disapprove
 * @desc    Disapprove order (Receptionist, Manager)
 * @access  Private (Receptionist, Manager)
 */
router.post("/:id/disapprove", authenticate, requireRole("manager", "receptionist"), disapproveOrder);

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order (Customer before approval, Staff anytime)
 * @access  Private (All authenticated users)
 */
router.post("/:id/cancel", authenticate, cancelOrder);

/**
 * @route   POST /api/orders/:id/mark-ready
 * @desc    Mark order as ready (Kitchen button press)
 * @access  Private (All authenticated users - as per doc)
 */
router.post("/:id/mark-ready", authenticate, markOrderReady);

/**
 * @route   POST /api/orders/:id/mark-received
 * @desc    Mark order as received (Customer)
 * @access  Private (Customer)
 */
router.post("/:id/mark-received", authenticate, requireRole("customer"), markOrderReceived);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order details
 * @access  Private
 */
router.get("/:id", authenticate, getOrder);

/**
 * @route   GET /api/orders
 * @desc    Get order history (filtered by role)
 * @access  Private
 */
router.get("/", authenticate, getOrderHistory);

/**
 * @route   GET /api/orders/kitchen/active
 * @desc    Get current active order on kitchen screen
 * @access  Private (Manager, Receptionist)
 */
router.get("/kitchen/active", authenticate, requireRole("manager", "receptionist"), getActiveKitchenOrder);

/**
 * @route   GET /api/orders/kitchen/queue
 * @desc    Get kitchen queue list
 * @access  Private (Manager, Receptionist)
 */
router.get("/kitchen/queue", authenticate, requireRole("manager", "receptionist"), getKitchenQueue);

/**
 * @route   GET /api/orders/kitchen/next
 * @desc    Get next order for kitchen screen
 * @access  Private (Staff)
 */
router.get("/kitchen/next", authenticate, getNextKitchenOrder);

export default router;
