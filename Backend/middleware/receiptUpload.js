import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import Cafe from "../models/Cafe.js";

/**
 * Receipt upload middleware
 * Stores receipts in: receipts/{cafeName}/{customerId}
 * Handles both file uploads and regular JSON requests
 */
export const uploadReceiptImage = async (req, res, next) => {
  // If request doesn't have multipart/form-data, skip upload
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  const cafeId = req.activeCafeId;
  const customerId = req.user._id.toString();

  if (!cafeId) {
    return res.status(400).json({
      success: false,
      message: "Active cafe is required for receipt upload",
    });
  }

  // Get cafe name for folder structure
  const cafe = await Cafe.findById(cafeId).select("name");
  if (!cafe) {
    return res.status(404).json({
      success: false,
      message: "Cafe not found",
    });
  }

  // Sanitize cafe name for folder path (remove spaces, special chars)
  const cafeName = cafe.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

  // Create folder path: receipts/{cafeName}/{customerId}
  const folderPath = `receipts/${cafeName}/${customerId}`;

  // Create storage with dynamic folder
  const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      return {
        folder: folderPath,
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        transformation: [{ width: 1200, height: 1200, crop: "limit" }], // Receipts can be larger
        public_id: `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Unique filename
      };
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(", ")}`), false);
      }
    },
  }).single("receiptImage"); // Field name for receipt file

  upload(req, res, (err) => {
    if (err) {
      console.error("Receipt upload error:", err);
      console.error("Error details:", {
        name: err.name,
        code: err.code,
        message: err.message,
        toString: String(err),
      });

      const errorMessage = err.message || err.toString() || String(err) || "Unknown error";

      // Handle specific multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Receipt file too large (max 5MB)",
            error: err.message,
          });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: "Unexpected file field. Use 'receiptImage' for receipt uploads.",
            error: err.message,
          });
        }
      }

      // Check for Cloudinary configuration errors
      const errorStr = errorMessage.toLowerCase();
      if (
        errorStr.includes("api_key") ||
        errorStr.includes("must supply") ||
        errorStr.includes("cloudinary")
      ) {
        return res.status(500).json({
          success: false,
          message: "Cloudinary configuration error",
          error: errorMessage,
          hint: "Please check your .env file has CLOUDINARY_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET set correctly.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Receipt upload failed",
        error: errorMessage,
        errorType: err.name || "Unknown",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
    next();
  });
};
