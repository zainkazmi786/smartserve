import Review from "../models/Review.js";
import Cafe from "../models/Cafe.js";
import User from "../models/User.js";
import MenuItem from "../models/MenuItem.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";

// ============ CREATE REVIEW ============

/**
 * POST /api/reviews
 * Create a new review (Customer)
 */
export const createReview = async (req, res) => {
  try {
    const { item, order, rating, comment } = req.body;
    const currentUser = req.user;

    // Validation: rating is required
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating is required and must be between 1 and 5",
      });
    }

    // Validation: either item or order must be provided
    if (!item && !order) {
      return res.status(400).json({
        success: false,
        message: "Either item or order is required",
      });
    }

    // Validation: cannot provide both item and order
    if (item && order) {
      return res.status(400).json({
        success: false,
        message: "Cannot review both item and order. Please provide either item or order.",
      });
    }

    let cafeId;
    let itemDoc = null;
    let orderDoc = null;

    // If reviewing an item
    if (item) {
      itemDoc = await MenuItem.findById(item);
      if (!itemDoc) {
        return res.status(404).json({
          success: false,
          message: "Menu item not found",
        });
      }
      // Cafe is stored as ObjectId in MenuItem
      cafeId = itemDoc.cafe;
    }

    // If reviewing an order
    if (order) {
      orderDoc = await Order.findById(order);
      if (!orderDoc) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Verify that the order belongs to the current user
      if (orderDoc.createdBy.toString() !== currentUser._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only review your own orders",
        });
      }

      // Cafe is stored as ObjectId in Order
      cafeId = orderDoc.cafe;
    }

    // Check if user already reviewed this item/order
    const existingReviewQuery = {
      user: currentUser._id,
      cafe: cafeId,
    };

    if (item) {
      existingReviewQuery.item = item;
    }
    if (order) {
      existingReviewQuery.order = order;
    }

    const existingReview = await Review.findOne(existingReviewQuery);

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: item
          ? "You have already reviewed this item"
          : "You have already reviewed this order",
      });
    }

    // Create review
    const review = new Review({
      cafe: cafeId,
      user: currentUser._id,
      item: item || undefined,
      order: order || undefined,
      rating: parseInt(rating),
      comment: comment || undefined,
    });

    await review.save();

    // Populate for response
    await review.populate([
      { path: "cafe", select: "name" },
      { path: "user", select: "name email phone" },
      { path: "item", select: "name image" },
      { path: "order", select: "orderNumber" },
    ]);

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: { review },
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create review",
      error: error.message,
    });
  }
};

// ============ REVIEW LISTING ============

/**
 * GET /api/reviews
 * List reviews (filtered by cafe for manager/receptionist)
 */
export const listReviews = async (req, res) => {
  try {
    const { item, order, rating, user, page = 1, limit = 10, sort = "-createdAt" } = req.query;
    const currentUser = req.user;
    const activeCafeId = req.activeCafeId;

    let query = {};

    // Cafe scoping: Manager and Receptionist can only see their cafe's reviews
    if (currentUser.role?.name === "manager" || currentUser.role?.name === "receptionist") {
      if (!activeCafeId) {
        return res.status(400).json({
          success: false,
          message: "Active cafe is required",
        });
      }
      query.cafe = activeCafeId;
    } else if (currentUser.role?.name === "superadmin") {
      // Superadmin can see all reviews, but can filter by cafe if needed
      if (req.query.cafe) {
        query.cafe = req.query.cafe;
      }
    } else {
      // Customer can only see their own reviews
      query.user = currentUser._id;
    }

    // Additional filters
    if (item) {
      query.item = item;
    }
    if (order) {
      query.order = order;
    }
    if (rating) {
      query.rating = parseInt(rating);
    }
    if (user && (currentUser.role?.name === "superadmin" || currentUser.role?.name === "manager")) {
      query.user = user;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with population
    const reviews = await Review.find(query)
      .populate("cafe", "name")
      .populate("user", "name email phone")
      .populate("item", "name image")
      .populate("order", "orderNumber")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("List reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

// ============ GET SINGLE REVIEW ============

/**
 * GET /api/reviews/:id
 * Get single review details
 */
export const getReview = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const activeCafeId = req.activeCafeId;

    const review = await Review.findById(id)
      .populate("cafe", "name")
      .populate("user", "name email phone")
      .populate("item", "name image description")
      .populate("order", "orderNumber status");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check access permissions
    if (currentUser.role?.name === "manager" || currentUser.role?.name === "receptionist") {
      // Must be from their cafe
      if (review.cafe._id.toString() !== activeCafeId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. This review is not from your cafe.",
        });
      }
    } else if (currentUser.role?.name === "customer") {
      // Customer can only see their own reviews
      if (review.user._id.toString() !== currentUser._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    res.json({
      success: true,
      data: { review },
    });
  } catch (error) {
    console.error("Get review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch review",
      error: error.message,
    });
  }
};

// ============ REPLY TO REVIEW ============

/**
 * PUT /api/reviews/:id/reply
 * Reply to a review (Manager, Receptionist)
 */
export const replyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const currentUser = req.user;
    const activeCafeId = req.activeCafeId;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Reply message must be 500 characters or less",
      });
    }

    const review = await Review.findById(id).populate("cafe");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if review belongs to user's cafe
    if (review.cafe._id.toString() !== activeCafeId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. This review is not from your cafe.",
      });
    }

    // Update manager reply
    review.managerReply = {
      message: message.trim(),
      repliedAt: new Date(),
    };

    await review.save();

    // Populate for response
    await review.populate([
      { path: "cafe", select: "name" },
      { path: "user", select: "name email phone" },
      { path: "item", select: "name image" },
      { path: "order", select: "orderNumber" },
    ]);

    res.json({
      success: true,
      message: "Reply added successfully",
      data: { review },
    });
  } catch (error) {
    console.error("Reply to review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reply to review",
      error: error.message,
    });
  }
};

// ============ UPDATE REVIEW ============

/**
 * PUT /api/reviews/:id
 * Update review (Manager only - limited fields)
 */
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body; // Only allow updating comment for now
    const currentUser = req.user;
    const activeCafeId = req.activeCafeId;

    const review = await Review.findById(id).populate("cafe");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if review belongs to user's cafe
    if (review.cafe._id.toString() !== activeCafeId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. This review is not from your cafe.",
      });
    }

    // Update allowed fields
    if (comment !== undefined) {
      review.comment = comment;
    }

    await review.save();

    // Populate for response
    await review.populate([
      { path: "cafe", select: "name" },
      { path: "user", select: "name email phone" },
      { path: "item", select: "name image" },
      { path: "order", select: "orderNumber" },
    ]);

    res.json({
      success: true,
      message: "Review updated successfully",
      data: { review },
    });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update review",
      error: error.message,
    });
  }
};

// ============ DELETE REVIEW ============

/**
 * DELETE /api/reviews/:id
 * Delete review (Manager only)
 */
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const activeCafeId = req.activeCafeId;

    const review = await Review.findById(id).populate("cafe");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if review belongs to user's cafe
    if (review.cafe._id.toString() !== activeCafeId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. This review is not from your cafe.",
      });
    }

    await Review.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};
