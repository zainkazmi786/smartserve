import express from "express";
import {
  createMenu,
  listMenus,
  getActiveMenu,
  getTodayMenus,
  getMenu,
  updateMenu,
  activateMenu,
  deactivateMenu,
  addItemsToMenu,
  removeItemsFromMenu,
  deleteMenu,
  setTimeSlots,
  getTimeSlots,
  removeTimeSlots,
} from "../controllers/menuController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

// ============ MENU ROUTES ============

/**
 * @route   POST /api/menus
 * @desc    Create menu
 * @access  Private (Manager, Receptionist)
 */
router.post(
  "/",
  authenticate,
  requireRole("manager", "receptionist"),
  createMenu
);

/**
 * @route   GET /api/menus
 * @desc    List all menus (Staff view)
 * @access  Private (Manager, Receptionist)
 */
router.get(
  "/",
  authenticate,
  requireRole("manager", "receptionist"),
  listMenus
);

/**
 * @route   GET /api/menus/active
 * @desc    Get active menu (Customer view)
 * @access  Private (Customer, Manager, Receptionist)
 */
router.get(
  "/active",
  authenticate,
  requireRole("customer", "manager", "receptionist"),
  getActiveMenu
);

/**
 * @route   GET /api/menus/today
 * @desc    Get all menus for today (with time slots for today + manually activated)
 * @access  Private (Customer, Manager, Receptionist)
 */
router.get(
  "/today",
  authenticate,
  requireRole("customer", "manager", "receptionist"),
  getTodayMenus
);

/**
 * @route   GET /api/menus/:id
 * @desc    Get menu details
 * @access  Private (Manager, Receptionist)
 */
router.get(
  "/:id",
  authenticate,
  requireRole("manager", "receptionist"),
  getMenu
);

/**
 * @route   PUT /api/menus/:id
 * @desc    Update menu (only inactive menus)
 * @access  Private (Manager, Receptionist)
 */
router.put(
  "/:id",
  authenticate,
  requireRole("manager", "receptionist"),
  updateMenu
);

/**
 * @route   POST /api/menus/:id/activate
 * @desc    Activate menu manually
 * @access  Private (Manager, Receptionist)
 */
router.post(
  "/:id/activate",
  authenticate,
  requireRole("manager", "receptionist"),
  activateMenu
);

/**
 * @route   POST /api/menus/:id/deactivate
 * @desc    Deactivate menu
 * @access  Private (Manager, Receptionist)
 */
router.post(
  "/:id/deactivate",
  authenticate,
  requireRole("manager", "receptionist"),
  deactivateMenu
);

/**
 * @route   POST /api/menus/:id/items
 * @desc    Add items to menu
 * @access  Private (Manager, Receptionist)
 */
router.post(
  "/:id/items",
  authenticate,
  requireRole("manager", "receptionist"),
  addItemsToMenu
);

/**
 * @route   DELETE /api/menus/:id/items
 * @desc    Remove items from menu
 * @access  Private (Manager, Receptionist)
 */
router.delete(
  "/:id/items",
  authenticate,
  requireRole("manager", "receptionist"),
  removeItemsFromMenu
);

/**
 * @route   DELETE /api/menus/:id
 * @desc    Soft delete menu
 * @access  Private (Manager, Receptionist)
 */
router.delete(
  "/:id",
  authenticate,
  requireRole("manager", "receptionist"),
  deleteMenu
);

// ============ TIME SLOT ROUTES ============

/**
 * @route   PUT /api/menus/:id/time-slots
 * @desc    Set time slots for menu
 * @access  Private (Manager, Receptionist)
 */
router.put(
  "/:id/time-slots",
  authenticate,
  requireRole("manager", "receptionist"),
  setTimeSlots
);

/**
 * @route   GET /api/menus/:id/time-slots
 * @desc    Get time slots for menu
 * @access  Private (Manager, Receptionist)
 */
router.get(
  "/:id/time-slots",
  authenticate,
  requireRole("manager", "receptionist"),
  getTimeSlots
);

/**
 * @route   DELETE /api/menus/:id/time-slots
 * @desc    Remove time slots from menu
 * @access  Private (Manager, Receptionist)
 */
router.delete(
  "/:id/time-slots",
  authenticate,
  requireRole("manager", "receptionist"),
  removeTimeSlots
);

export default router;
