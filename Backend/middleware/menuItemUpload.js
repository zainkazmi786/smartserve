import multer from "multer";
import { uploadMultiple } from "./uploadMiddleware.js";

/**
 * Menu item image upload middleware
 * Uses activeCafeId from request to determine folder
 * Handles both file uploads and regular JSON requests
 */
export const uploadMenuItemImages = (req, res, next) => {
  // If request doesn't have multipart/form-data, skip upload
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  const cafeId = req.activeCafeId;
  
  if (!cafeId) {
    return res.status(400).json({
      success: false,
      message: "Active cafe is required for image upload",
    });
  }

  // Create upload middleware with cafe-specific folder
  const upload = uploadMultiple(cafeId);
  
  upload(req, res, (err) => {
    if (err) {
      console.error("Upload error:", err);
      console.error("Error details:", {
        name: err.name,
        code: err.code,
        message: err.message,
        stack: err.stack,
        toString: String(err),
      });
      
      // Extract message from error object (handles different error formats)
      const errorMessage = err.message || err.toString() || String(err) || "Unknown error";
      
      // Handle specific multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File too large (max 5MB)",
            error: err.message,
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            success: false,
            message: "Too many files (max 5)",
            error: err.message,
          });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: "Unexpected file field. Use 'images' for file uploads.",
            error: err.message,
          });
        }
      }
      
      // Check for Cloudinary configuration errors
      const errorStr = errorMessage.toLowerCase();
      if (errorStr.includes("api_key") || errorStr.includes("must supply") || errorStr.includes("cloudinary")) {
        return res.status(500).json({
          success: false,
          message: "Cloudinary configuration error",
          error: errorMessage,
          hint: "Please check your .env file has CLOUDINARY_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET set correctly.",
          solution: "1. Check .env file exists in project root\n2. Verify all three Cloudinary variables are set\n3. Restart your server after updating .env",
        });
      }
      
      return res.status(400).json({
        success: false,
        message: "Image upload failed",
        error: errorMessage,
        errorType: err.name || "Unknown",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
    next();
  });
};
