import express from "express";
import {
  createReview,
  listReviews,
  getReview,
  replyToReview,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";

const router = express.Router();

/**
 * @route   POST /api/reviews
 * @desc    Create a new review (Customer)
 * @access  Private (Customer)
 */
router.post("/", authenticate, requirePermission("reviews", "create"), createReview);

/**
 * @route   GET /api/reviews
 * @desc    List reviews (filtered by cafe for manager/receptionist)
 * @access  Private (All authenticated users - scoped by role)
 */
router.get("/", authenticate, requirePermission("reviews", "read"), listReviews);

/**
 * @route   GET /api/reviews/:id
 * @desc    Get single review details
 * @access  Private (All authenticated users - scoped by role)
 */
router.get("/:id", authenticate, requirePermission("reviews", "read"), getReview);

/**
 * @route   PUT /api/reviews/:id/reply
 * @desc    Reply to a review (Manager, Receptionist)
 * @access  Private (Manager, Receptionist)
 */
router.put("/:id/reply", authenticate, requirePermission("reviews", "update"), replyToReview);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Update review (Manager only)
 * @access  Private (Manager)
 */
router.put("/:id", authenticate, requirePermission("reviews", "update"), updateReview);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete review (Manager only)
 * @access  Private (Manager)
 */
router.delete("/:id", authenticate, requirePermission("reviews", "delete"), deleteReview);

export default router;
