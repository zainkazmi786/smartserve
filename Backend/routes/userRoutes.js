import express from "express";
import {
  login,
  logout,
  register,
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  getUserCafes,
  switchActiveCafe,
  listUsers,
  createUser,
  updateUserRole,
  removeUserFromCafe,
  updateUserStatus,
  deleteUser,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { uploadProfilePicture as uploadProfilePictureMiddleware } from "../middleware/profilePictureUpload.js";

const router = express.Router();

// ============ PUBLIC ROUTES ============

/**
 * @route   POST /api/users/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   POST /api/users/register
 * @desc    Customer self sign-up
 * @access  Public
 */
router.post("/register", register);

// ============ AUTHENTICATED ROUTES ============

/**
 * @route   POST /api/users/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", authenticate, logout);

/**
 * @route   GET /api/users/profile
 * @desc    Get logged-in user profile
 * @access  Private
 */
router.get("/profile", authenticate, getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put("/profile", authenticate, updateProfile);

/**
 * @route   PUT /api/users/profile/password
 * @desc    Change user password
 * @access  Private
 */
router.put("/profile/password", authenticate, changePassword);

/**
 * @route   POST /api/users/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post("/profile/picture", authenticate, uploadProfilePictureMiddleware, uploadProfilePicture);

// ============ CAFE ASSOCIATION ROUTES ============

/**
 * @route   GET /api/users/cafes
 * @desc    Get user's cafes
 * @access  Private
 */
router.get("/cafes", authenticate, getUserCafes);

/**
 * @route   POST /api/users/cafes/switch
 * @desc    Switch active cafe
 * @access  Private
 */
router.post("/cafes/switch", authenticate, switchActiveCafe);

// ============ USER MANAGEMENT ROUTES ============

/**
 * @route   GET /api/users
 * @desc    List users (cafe scoped for manager, all for superadmin)
 * @access  Private (Manager, Super Admin)
 */
router.get("/", authenticate, requireRole("manager", "superadmin"), listUsers);

/**
 * @route   POST /api/users
 * @desc    Create user (Manager or Super Admin)
 * @access  Private (Manager, Super Admin)
 */
router.post("/", authenticate, requireRole("manager", "superadmin"), createUser);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role (Super Admin only)
 * @access  Private (Super Admin)
 */
router.put(
  "/:id/role",
  authenticate,
  requireRole("superadmin"),
  updateUserRole
);

/**
 * @route   DELETE /api/users/:id/cafe/:cafeId
 * @desc    Remove user from cafe (Manager)
 * @access  Private (Manager, Super Admin)
 */
router.delete(
  "/:id/cafe/:cafeId",
  authenticate,
  requireRole("manager", "superadmin"),
  removeUserFromCafe
);

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Activate/Deactivate user
 * @access  Private (Manager, Super Admin)
 */
router.patch(
  "/:id/status",
  authenticate,
  requireRole("manager", "superadmin"),
  updateUserStatus
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Manager, Super Admin)
 */
router.delete(
  "/:id",
  authenticate,
  requireRole("manager", "superadmin"),
  deleteUser
);

export default router;
