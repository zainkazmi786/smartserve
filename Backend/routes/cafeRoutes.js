import express from "express";
import {
  createCafe,
  getCafeDetails,
  updateCafe,
  assignManager,
  changeManager,
  listCafes,
  addUserToCafe,
  removeUserFromCafe,
  listCafeUsers,
  getCafeSettings,
  updateCafeSettings,
} from "../controllers/cafeController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

// ============ CAFE MANAGEMENT ============ 

/**
 * @route   POST /api/cafes
 * @desc    Create cafe
 * @access  Private (Super Admin)
 */
router.post("/", authenticate, requireRole("superadmin"), createCafe);

/**
 * @route   GET /api/cafes
 * @desc    List cafes
 * @access  Private (Super Admin: all, Manager: own cafe)
 */
router.get("/",  listCafes);

/**
 * @route   GET /api/cafes/:id
 * @desc    Get cafe details
 * @access  Private (Super Admin, Manager)
 */
router.get("/:id", authenticate, requireRole("superadmin", "manager"), getCafeDetails);

/**
 * @route   PUT /api/cafes/:id
 * @desc    Update cafe
 * @access  Private (Super Admin, Manager)
 */
router.put("/:id", authenticate, requireRole("superadmin", "manager"), updateCafe);

/**
 * @route   POST /api/cafes/:id/assign-manager
 * @desc    Assign manager to cafe
 * @access  Private (Super Admin)
 */
router.post(
  "/:id/assign-manager",
  authenticate,
  requireRole("superadmin"),
  assignManager
);

/**
 * @route   PUT /api/cafes/:id/change-manager
 * @desc    Change cafe manager
 * @access  Private (Super Admin)
 */
router.put(
  "/:id/change-manager",
  authenticate,
  requireRole("superadmin"),
  changeManager
);

// ============ CAFE USER MANAGEMENT ============

/**
 * @route   POST /api/cafes/:id/users
 * @desc    Add user to cafe
 * @access  Private (Manager, Super Admin)
 */
router.post(
  "/:id/users",
  authenticate,
  requireRole("manager", "superadmin"),
  addUserToCafe
);

/**
 * @route   DELETE /api/cafes/:id/users/:userId
 * @desc    Remove user from cafe
 * @access  Private (Manager, Super Admin)
 */
router.delete(
  "/:id/users/:userId",
  authenticate,
  requireRole("manager", "superadmin"),
  removeUserFromCafe
);

/**
 * @route   GET /api/cafes/:id/users
 * @desc    List cafe users
 * @access  Private (Manager, Super Admin)
 */
router.get(
  "/:id/users",
  authenticate,
  listCafeUsers
);

// ============ CAFE SETTINGS ============

/**
 * @route   GET /api/cafes/:id/settings
 * @desc    Get cafe settings
 * @access  Private (Manager, Receptionist)
 */
router.get(
  "/:id/settings",
  authenticate,
  requireRole("manager", "receptionist"),
  getCafeSettings
);

/**
 * @route   PUT /api/cafes/:id/settings
 * @desc    Update cafe settings
 * @access  Private (Manager)
 */
router.put(
  "/:id/settings",
  authenticate,
  requireRole("manager"),
  updateCafeSettings
);

export default router;
