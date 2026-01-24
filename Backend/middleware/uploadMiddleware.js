import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

/**
 * Create upload middleware with dynamic folder based on cafe ID
 */
export const createUploadMiddleware = (cafeId) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      return {
        folder: `smartcafe/${cafeId}`, // Store in cafe-specific folder
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        transformation: [{ width: 800, height: 800, crop: "limit" }], // Resize images
        public_id: `${Date.now()}_${file.originalname.split('.')[0]}`, // Unique filename
      };
    },
  });

  return multer({ 
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`), false);
      }
    }
  });
};

/**
 * Single image upload middleware
 */
export const uploadSingle = (cafeId) => {
  return createUploadMiddleware(cafeId).single("image");
};

/**
 * Multiple images upload middleware
 * Uses .fields() to parse all form fields and images
 */
export const uploadMultiple = (cafeId) => {
  const multerInstance = createUploadMiddleware(cafeId);
  // Use .fields() to accept images array and parse all other text fields
  return multerInstance.fields([{ name: "images", maxCount: 5 }]);
};
