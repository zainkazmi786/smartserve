import mongoose from "mongoose";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Cafe from "../models/Cafe.js";
import { generateToken } from "../utils/authUtils.js";
import { hashPassword, comparePassword } from "../utils/passwordUtils.js";

// ============ AUTHENTICATION ============

/**
 * POST /api/users/login
 * Login user
 * @body for - Optional. If "customer", only users with role "customer" can login (used by Food-Ordering-App).
 *        Omit for Cafe Management Portal (manager, receptionist, superadmin).
 */
export const login = async (req, res) => {
  try {
    const { email, phone, password, for: forClient } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is required",
      });
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email }, { phone }],
    })
      .populate("role")
      .populate("cafes");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if account is active
    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Account is inactive. Please contact administrator.",
      });
    }

    // Verify password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // When for=customer (Food-Ordering-App), only customer role can login
    if (forClient === "customer") {
      const roleName = user.role?.name;
      if (roleName !== "customer") {
        return res.status(403).json({
          success: false,
          message: "Only customer accounts can sign in here. Please use the Cafe Management Portal for staff access.",
        });
      }
    }

    // Determine active cafe (first cafe for staff, or selected one)
    const activeCafeId = user.cafes.length > 0 && user.cafes[0] && user.cafes[0]._id 
      ? user.cafes[0]._id.toString() 
      : null;

    // Generate token
    const token = generateToken(user._id.toString(), activeCafeId);

    // Remove password from response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      cafes: user.cafes,
      status: user.status,
    };

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        token,
        activeCafeId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

/**
 * POST /api/users/logout
 * Logout user (client-side token removal)
 */
export const logout = async (req, res) => {
  try {
    // Since we're using JWT, logout is handled client-side
    // This endpoint can be used for server-side token blacklisting if needed
    res.json({
      success: true,
      message: "Logout successful. Please remove token from client storage.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

/**
 * POST /api/users/register
 * Customer self sign-up
 */
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, cafeId } = req.body;

    // Validation
    if (!name || !password) {
      return res.status(400).json({
        success: false,
        message: "Name and password are required",
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email || null }, { phone: phone || null }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or phone already exists",
      });
    }

    // Get customer role
    const customerRole = await Role.findOne({ name: "customer" });
    if (!customerRole) {
      return res.status(500).json({
        success: false,
        message: "Customer role not found. Please contact administrator.",
      });
    }

    // Handle cafe selection
    let selectedCafeId = cafeId;

    // If no cafe selected, check if only one cafe exists and auto-assign it
    if (!selectedCafeId) {
      const cafes = await Cafe.find().lean(); // Use lean() for better performance
      
      if (cafes.length === 1) {
        // Auto-assign the single cafe
        selectedCafeId = cafes[0]._id;
      } else if (cafes.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No cafes available. Please contact administrator.",
          hint: "Run the seed script (npm run seed) to create initial data.",
        });
      } else {
        // Multiple cafes exist, user must select one
        return res.status(400).json({
          success: false,
          message: "Please select a cafe",
          data: { 
            cafes: cafes.map(cafe => ({
              _id: cafe._id,
              name: cafe.name,
              email: cafe.email,
              phone: cafe.phone
            }))
          },
        });
      }
    }

    // Verify cafe exists
    const cafe = await Cafe.findById(selectedCafeId);
    if (!cafe) {
      return res.status(400).json({
        success: false,
        message: "Invalid cafe selected",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = new User({
      name,
      email: email || undefined,
      phone: phone || undefined,
      password: hashedPassword,
      role: customerRole._id,
      cafes: [selectedCafeId],
      status: "active",
    });

    await user.save();

    // Populate references
    await user.populate("role");
    await user.populate("cafes");

    // Generate token
    const token = generateToken(user._id.toString(), selectedCafeId.toString());

    // Remove password from response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      cafes: user.cafes,
      status: user.status,
    };

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: userResponse,
        token,
        activeCafeId: selectedCafeId.toString(),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "User with this email or phone already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// ============ PROFILE ============

/**
 * GET /api/users/profile
 * Get logged-in user profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("role")
      .populate("cafes")
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

/**
 * PUT /api/users/profile
 * Update user profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user._id;

    // Check if email/phone already exists (excluding current user)
    if (email) {
      const emailExists = await User.findOne({
        email,
        _id: { $ne: userId },
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    if (phone) {
      const phoneExists = await User.findOne({
        phone,
        _id: { $ne: userId },
      });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone already in use",
        });
      }
    }

    // Update user
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("role")
      .populate("cafes")
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email or phone already in use",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

/**
 * PUT /api/users/profile/push-token
 * Update Expo Push Token for push notifications (customer app).
 */
export const updatePushToken = async (req, res) => {
  try {
    const { expoPushToken } = req.body;
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { expoPushToken: expoPushToken || null },
      { new: true }
    )
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Push token updated",
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update push token",
      error: error.message,
    });
  }
};

/**
 * PUT /api/users/profile/password
 * Change user password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validation
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is required",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Check if new password is different
    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    // Get updated user without password
    const updatedUser = await User.findById(userId)
      .populate("role")
      .populate("cafes")
      .select("-password");

    res.json({
      success: true,
      message: "Password updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update password",
      error: error.message,
    });
  }
};

/**
 * POST /api/users/profile/picture
 * Upload profile picture
 */
export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if file was uploaded (middleware should handle this, but double-check)
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required",
      });
    }

    // Get Cloudinary URL from uploaded file
    const imageUrl = req.file.path; // Cloudinary returns full URL in path

    // Update user profile picture
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: imageUrl },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("role")
      .populate("cafes")
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile picture updated successfully",
      data: {
        user,
        imageUrl: imageUrl, // Full Cloudinary URL
      },
    });
  } catch (error) {
    console.error("Upload profile picture error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload profile picture. Please try again.",
      error: error.message,
    });
  }
};

// ============ CAFE ASSOCIATION ============

/**
 * GET /api/users/cafes
 * Get user's cafes
 */
export const getUserCafes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("cafes");

    res.json({
      success: true,
      data: { cafes: user.cafes },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cafes",
      error: error.message,
    });
  }
};

/**
 * POST /api/users/cafes/switch
 * Switch active cafe
 */
export const switchActiveCafe = async (req, res) => {
  try {
    const { cafeId } = req.body;
    const user = req.user;

    if (!cafeId) {
      return res.status(400).json({
        success: false,
        message: "Cafe ID is required",
      });
    }

    // Check if user is associated with this cafe
    const userCafeIds = user.cafes.map((cafe) => cafe._id.toString());
    if (!userCafeIds.includes(cafeId.toString())) {
      return res.status(403).json({
        success: false,
        message: "You are not associated with this cafe",
      });
    }

    // Generate new token with updated active cafe
    const token = generateToken(user._id.toString(), cafeId.toString());

    res.json({
      success: true,
      message: "Active cafe switched successfully",
      data: {
        activeCafeId: cafeId,
        token, // New token with updated cafe
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to switch cafe",
      error: error.message,
    });
  }
};

// ============ USER MANAGEMENT ============

/**
 * GET /api/users
 * List users (cafe scoped for manager, all for superadmin)
 */
export const listUsers = async (req, res) => {
  try {
    const { role, cafe } = req.query;
    const currentUser = req.user;

    let query = {};

    // Super admin can filter by role and cafe
    if (currentUser.role?.name === "superadmin") {
      if (role) {
        const roleDoc = await Role.findOne({ name: role });
        if (roleDoc) {
          query.role = roleDoc._id;
        }
      }
      if (cafe) {
        query.cafes = cafe;
      }
    } else if (currentUser.role?.name === "manager") {
      // Manager can only see users from their cafe
      const managerCafeIds = currentUser.cafes.map((c) => c._id.toString());
      query.cafes = { $in: managerCafeIds.map(id => new mongoose.Types.ObjectId(id)) };
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const users = await User.find(query)
      .populate("role")
      .populate("cafes")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

/**
 * POST /api/users
 * Create user (Manager or Super Admin)
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, phone, password, roleName, cafes } = req.body;
    const currentUser = req.user;

    // Validation
    if (!name || !roleName) {
      return res.status(400).json({
        success: false,
        message: "Name and role are required",
      });
    }

    // Get role
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // Handle cafe assignment
    let assignedCafes = [];

    if (currentUser.role?.name === "superadmin") {
      // Super admin can assign any cafe
      if (!cafes || cafes.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one cafe must be assigned",
        });
      }
      assignedCafes = cafes;
    } else if (currentUser.role?.name === "manager") {
      // Manager can only assign users to their own cafe
      if (!currentUser.cafes || currentUser.cafes.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Manager is not associated with any cafe",
        });
      }
      
      // Get manager's cafe (they should only have one)
      if (!currentUser.cafes[0] || !currentUser.cafes[0]._id) {
        return res.status(400).json({
          success: false,
          message: "Manager cafe information is invalid",
        });
      }
      const managerCafeId = currentUser.cafes[0]._id.toString();
      
      // If creating a manager role, cafe must be explicitly specified
      if (roleName === "manager") {
        if (!cafes || cafes.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Cafe must be specified when creating a manager user",
          });
        }
        // Validate that the specified cafe is the manager's cafe
        if (cafes[0] !== managerCafeId) {
          return res.status(403).json({
            success: false,
            message: "You can only assign users to your own cafe",
          });
        }
        assignedCafes = cafes;
      } else {
        // For other roles (receptionist, customer), auto-assign manager's cafe if not specified
        assignedCafes = cafes && cafes.length > 0 ? cafes : [managerCafeId];
        // Ensure it's the manager's cafe
        if (assignedCafes[0] !== managerCafeId) {
          return res.status(403).json({
            success: false,
            message: "You can only assign users to your own cafe",
          });
        }
      }
    }

    // Enforce single cafe restriction for manager and receptionist roles
    if ((roleName === "manager" || roleName === "receptionist") && assignedCafes.length > 1) {
      return res.status(400).json({
        success: false,
        message: `${roleName} can only be assigned to one cafe`,
      });
    }

    // Verify cafes exist
    const cafeDocs = await Cafe.find({ _id: { $in: assignedCafes } });
    if (cafeDocs.length !== assignedCafes.length) {
      return res.status(400).json({
        success: false,
        message: "One or more cafes not found",
      });
    }

    // Ensure manager/receptionist only gets one cafe
    if (roleName === "manager" || roleName === "receptionist") {
      assignedCafes = [assignedCafes[0]];
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email || null }, { phone: phone || null }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or phone already exists",
      });
    }

    // Generate temporary password if not provided
    const tempPassword = password || `Temp${Math.random().toString(36).slice(-8)}`;
    const hashedPassword = await hashPassword(tempPassword);

    // Create user
    const user = new User({
      name,
      email: email || undefined,
      phone: phone || undefined,
      password: hashedPassword,
      role: role._id,
      cafes: assignedCafes,
      status: "active",
    });

    await user.save();

    // Populate references
    await user.populate("role");
    await user.populate("cafes");

    // Remove password from response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      cafes: user.cafes,
      status: user.status,
    };

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: userResponse,
        tempPassword: !password ? tempPassword : undefined,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "User with this email or phone already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

/**
 * PUT /api/users/:id/role
 * Update user role (Super Admin only)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleName } = req.body;

    if (!roleName) {
      return res.status(400).json({
        success: false,
        message: "Role name is required",
      });
    }

    // Get role
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent self role change to manager (if needed)
    if (req.user._id.toString() === id && roleName === "manager") {
      return res.status(400).json({
        success: false,
        message: "Cannot change your own role to manager",
      });
    }

    // Enforce single cafe restriction for manager and receptionist roles
    await user.populate("cafes");
    if ((roleName === "manager" || roleName === "receptionist") && user.cafes.length > 1) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign ${roleName} role to user with multiple cafes. ${roleName} can only have one cafe.`,
      });
    }

    // If changing to manager/receptionist and user has no cafe, require assignment
    if ((roleName === "manager" || roleName === "receptionist") && user.cafes.length === 0) {
      return res.status(400).json({
        success: false,
        message: `${roleName} must be assigned to at least one cafe`,
      });
    }

    // Ensure only one cafe for manager/receptionist
    if (roleName === "manager" || roleName === "receptionist") {
      user.cafes = [user.cafes[0]]; // Keep only the first cafe
    }

    // Update role
    user.role = role._id;
    await user.save();

    await user.populate("role");
    await user.populate("cafes");

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      cafes: user.cafes,
      status: user.status,
    };

    res.json({
      success: true,
      message: "User role updated successfully",
      data: { user: userResponse },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user role",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/users/:id/cafe/:cafeId
 * Remove user from cafe (Manager)
 */
export const removeUserFromCafe = async (req, res) => {
  try {
    const { id, cafeId } = req.params;
    const currentUser = req.user;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Populate cafes if needed
    await user.populate("cafes");
    
    // Check if user is in the cafe
    const cafeIndex = user.cafes.findIndex(
      (c) => c._id.toString() === cafeId.toString()
    );

    if (cafeIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "User is not associated with this cafe",
      });
    }

    // Manager can only remove from their cafe
    if (currentUser.role?.name === "manager") {
      const managerCafeIds = currentUser.cafes.map((c) => c._id.toString());
      if (!managerCafeIds.includes(cafeId.toString())) {
        return res.status(403).json({
          success: false,
          message: "You can only remove users from your cafe",
        });
      }
    }

    // Populate user role to check restrictions
    await user.populate("role");
    
    // Prevent removing the last cafe from manager or receptionist
    if ((user.role?.name === "manager" || user.role?.name === "receptionist") && user.cafes.length === 1) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove the last cafe from ${user.role.name}. ${user.role.name} must have at least one cafe.`,
      });
    }

    // If removing a manager, clear cafe.linkedManager
    const isManager = user.role?.name === "manager";
    const cafe = isManager ? await Cafe.findById(cafeId) : null;
    
    // Remove cafe from user
    user.cafes.splice(cafeIndex, 1);
    await user.save();

    // Clear cafe.linkedManager if this was the manager
    if (isManager && cafe && cafe.linkedManager?.toString() === id) {
      cafe.linkedManager = null;
      await cafe.save();
    }

    await user.populate("role");
    await user.populate("cafes");

    res.json({
      success: true,
      message: "User removed from cafe successfully",
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to remove user from cafe",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/users/:id/status
 * Activate/Deactivate user
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'inactive'",
      });
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Manager can only manage users from their cafe
    if (req.user.role?.name === "manager") {
      const managerCafeIds = req.user.cafes.map((c) => c._id.toString());
      const userCafeIds = user.cafes.map((c) => c._id.toString());
      const hasCommonCafe = managerCafeIds.some((id) => userCafeIds.includes(id));

      if (!hasCommonCafe) {
        return res.status(403).json({
          success: false,
          message: "You can only manage users from your cafe",
        });
      }
    }

    // Prevent deactivating self
    if (req.user._id.toString() === id && status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate your own account",
      });
    }

    // Update status
    user.status = status;
    await user.save();

    await user.populate("role");
    await user.populate("cafes");

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      cafes: user.cafes,
      status: user.status,
    };

    res.json({
      success: true,
      message: `User ${status === "active" ? "activated" : "deactivated"} successfully`,
      data: { user: userResponse },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/users/:id
 * Delete user
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deleting self
    if (currentUser._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Manager can only delete users from their cafe
    if (currentUser.role?.name === "manager") {
      const managerCafeIds = currentUser.cafes.map((c) => c._id.toString());
      const userCafeIds = user.cafes.map((c) => c._id.toString());
      const hasCommonCafe = managerCafeIds.some((id) => userCafeIds.includes(id));

      if (!hasCommonCafe) {
        return res.status(403).json({
          success: false,
          message: "You can only delete users from your cafe",
        });
      }
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};
