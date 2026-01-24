import User from "../models/User.js";
import Role from "../models/Role.js";

/**
 * Check if user has required role(s)
 */
export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Populate role if not already populated
      if (!req.user.role || typeof req.user.role === "string") {
        await req.user.populate("role");
      }

      const userRoleName = req.user.role?.name;

      if (!userRoleName) {
        return res.status(403).json({
          success: false,
          message: "User role not found",
        });
      }

      if (!allowedRoles.includes(userRoleName)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Authorization error",
        error: error.message,
      });
    }
  };
};

/**
 * Check if user has permission for a resource and action
 */
export const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Populate role if not already populated
      if (!req.user.role || typeof req.user.role === "string") {
        await req.user.populate("role");
      }

      const role = req.user.role;

      if (!role || !role.permissions) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
        });
      }

      const hasPermission = role.permissions.some(
        (perm) => perm.resource === resource && perm.actions.includes(action)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${action} ${resource}`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Permission check error",
        error: error.message,
      });
    }
  };
};

/**
 * Manager can only access users from their cafe
 */
export const checkCafeAccess = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Super admin can access all
    if (user.role?.name === "superadmin") {
      return next();
    }

    // Manager can only access their cafe
    if (user.role?.name === "manager") {
      const cafeId = req.params.cafeId || req.body.cafe || req.query.cafe || req.activeCafeId;
      
      if (!cafeId) {
        return res.status(400).json({
          success: false,
          message: "Cafe ID required",
        });
      }

      const userCafeIds = user.cafes.map((cafe) => cafe._id.toString());
      
      if (!userCafeIds.includes(cafeId.toString())) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only manage users from your cafe.",
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Cafe access check error",
      error: error.message,
    });
  }
};
