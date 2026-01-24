import express from "express";
import {
  createMenuItem,
  listMenuItems,
  getMenuItem,
  updateMenuItem,
  toggleMenuItemStatus,
  deleteMenuItem,
  getCategories,
} from "../controllers/menuItemController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { uploadMenuItemImages } from "../middleware/menuItemUpload.js";

const router = express.Router();

// ============ MENU ITEM ROUTES ============

/**
 * @route   POST /api/menu-items
 * @desc    Create menu item (with optional image upload)
 * @access  Private (Manager, Receptionist)
 * @note    Can use multipart/form-data for file uploads or application/json with image URLs
 */
router.post(
  "/",
  authenticate,
  requireRole("manager", "receptionist"),
  uploadMenuItemImages, // Middleware handles uploads if files present, otherwise passes through
  createMenuItem
);

/**
 * @route   GET /api/menu-items
 * @desc    List menu items
 * @access  Private (Manager, Receptionist, Super Admin)
 */
router.get(
  "/",
  authenticate,
  requireRole("manager", "receptionist", "superadmin"),
  listMenuItems
);

/**
 * @route   GET /api/menu-items/categories
 * @desc    Get categories
 * @access  Private (Manager, Receptionist, Super Admin)
 */
router.get(
  "/categories",
  authenticate,
  requireRole("manager", "receptionist", "superadmin"),
  getCategories
);

/**
 * @route   GET /api/menu-items/:id
 * @desc    Get menu item details
 * @access  Private (Manager, Receptionist, Super Admin)
 */

router.get(
  "/:id",
  authenticate,
  requireRole("manager", "receptionist", "superadmin"),
  getMenuItem
);

/**
 * @route   PUT /api/menu-items/:id
 * @desc    Update menu item (with optional image upload)
 * @access  Private (Manager, Receptionist)
 * @note    Can use multipart/form-data for file uploads or application/json with image URLs
 */
router.put(
  "/:id",
  authenticate,
  requireRole("manager", "receptionist"),
  uploadMenuItemImages, // Middleware handles uploads if files present, otherwise passes through
  updateMenuItem
);

/**
 * @route   PATCH /api/menu-items/:id/status
 * @desc    Toggle menu item active status
 * @access  Private (Manager, Receptionist)
 */
router.patch(
  "/:id/status",
  authenticate,
  requireRole("manager", "receptionist"),
  toggleMenuItemStatus
);

/**
 * @route   DELETE /api/menu-items/:id
 * @desc    Soft delete menu item (set isActive = false)
 * @access  Private (Manager, Receptionist)
 */
router.delete(
  "/:id",
  authenticate,
  requireRole("manager", "receptionist"),
  deleteMenuItem
);

export default router;
