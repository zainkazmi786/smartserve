import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

/**
 * Profile picture upload middleware
 * Stores profile pictures in: users/profiles
 * Handles multipart/form-data file uploads
 */
export const uploadProfilePicture = async (req, res, next) => {
  // If request doesn't have multipart/form-data, skip upload
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return res.status(400).json({
      success: false,
      message: "Content-Type must be multipart/form-data",
    });
  }

  // Create folder path: users/profiles
  const folderPath = "users/profiles";

  // Create storage with dynamic folder
  const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      return {
        folder: folderPath,
        allowed_formats: ["jpg", "png", "jpeg"],
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }], // Square crop, focus on face
        public_id: `profile_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Unique filename
      };
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Only JPEG, PNG, and JPG images are allowed`), false);
      }
    },
  }).single("profilePicture"); // Field name for profile picture file

  upload(req, res, (err) => {
    if (err) {
      console.error("Profile picture upload error:", err);
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
            message: "File size exceeds maximum limit of 5MB",
            error: err.message,
          });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: "Unexpected file field. Use 'profilePicture' for profile picture uploads.",
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

      // Handle file type errors
      if (errorMessage.includes("Invalid file type")) {
        return res.status(400).json({
          success: false,
          message: "Invalid file type. Only JPEG, PNG, and JPG images are allowed",
          error: errorMessage,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Failed to upload profile picture. Please try again.",
        error: errorMessage,
        errorType: err.name || "Unknown",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required",
      });
    }

    next();
  });
};
