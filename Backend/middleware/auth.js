import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { verifyToken } from "../utils/authUtils.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please provide a token.",
      });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please provide a token.",
      });
    }

    // Verify token using utility function
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtError) {
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token. Please login again.",
          error: jwtError.message,
        });
      }
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please login again.",
        });
      }
      throw jwtError;
    }
    
    // Find user and populate references
    const user = await User.findById(decoded.userId).populate("role").populate("cafes");
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Invalid token.",
      });
    }

    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Account is inactive. Please contact administrator.",
      });
    }

    // Attach user and active cafe to request
    req.user = user;
    req.activeCafeId = decoded.activeCafeId || (user.cafes.length > 0 ? user.cafes[0]._id.toString() : null);

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
};
