import mongoose from "mongoose";
import Cafe from "../models/Cafe.js";
import User from "../models/User.js";
import Role from "../models/Role.js";

// ============ CAFE MANAGEMENT ============

/**
 * POST /api/cafes
 * Create cafe (Super Admin only)
 */
export const createCafe = async (req, res) => {
  try {
    const { name, email, phone, taxPercentage } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Cafe name is required",
      });
    }

    // Email format validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
    }

    // Check if cafe name already exists
    const existingCafe = await Cafe.findOne({ name });
    if (existingCafe) {
      return res.status(400).json({
        success: false,
        message: "Cafe name already exists",
      });
    }

    // Create cafe without manager
    const cafe = new Cafe({
      name,
      email: email || undefined,
      phone: phone || undefined,
      linkedManager: null, // No manager initially
      settings: {
        taxPercentage: taxPercentage || 0,
      },
    });

    await cafe.save();

    res.status(201).json({
      success: true,
      message: "Cafe created successfully",
      data: { cafe },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Cafe name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create cafe",
      error: error.message,
    });
  }
};

/**
 * GET /api/cafes/:id
 * Get cafe details (Super Admin, Manager)
 */
export const getCafeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const cafe = await Cafe.findById(id)
      .populate("linkedManager", "name email phone role")
      .lean();

    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Manager can only view their own cafe
    if (currentUser.role?.name === "manager") {
      const managerCafeIds = currentUser.cafes.map((c) => c._id.toString());
      if (!managerCafeIds.includes(id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view your own cafe.",
        });
      }
    }

    // Determine if cafe is active (has a manager)
    const isActive = !!cafe.linkedManager;

    res.json({
      success: true,
      data: {
        cafe: {
          ...cafe,
          isActive,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cafe details",
      error: error.message,
    });
  }
};

/**
 * PUT /api/cafes/:id
 * Update cafe (Super Admin, Manager)
 */
export const updateCafe = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, taxPercentage } = req.body;
    const currentUser = req.user;

    const cafe = await Cafe.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Manager can only update their own cafe
    if (currentUser.role?.name === "manager") {
      const managerCafeIds = currentUser.cafes.map((c) => c._id.toString());
      if (!managerCafeIds.includes(id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only update your own cafe.",
        });
      }
    }

    // Email format validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
    }

    // Check name uniqueness if name is being changed
    if (name && name !== cafe.name) {
      const existingCafe = await Cafe.findOne({ name, _id: { $ne: id } });
      if (existingCafe) {
        return res.status(400).json({
          success: false,
          message: "Cafe name already exists",
        });
      }
      cafe.name = name;
    }

    // Update fields
    if (email !== undefined) cafe.email = email || undefined;
    if (phone !== undefined) cafe.phone = phone || undefined;
    if (taxPercentage !== undefined) {
      cafe.settings.taxPercentage = taxPercentage || 0;
    }

    await cafe.save();

    await cafe.populate("linkedManager", "name email phone role");

    res.json({
      success: true,
      message: "Cafe updated successfully",
      data: { cafe },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Cafe name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update cafe",
      error: error.message,
    });
  }
};

/**
 * POST /api/cafes/:id/assign-manager
 * Assign manager to cafe (Super Admin only)
 */
export const assignManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find cafe
    const cafe = await Cafe.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Find user and populate role
    const user = await User.findById(userId).populate("role");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate user role is manager
    if (user.role?.name !== "manager") {
      return res.status(400).json({
        success: false,
        message: "User must have manager role",
      });
    }

    // Check if manager already has a cafe
    if (user.cafes && user.cafes.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Manager is already assigned to a cafe",
      });
    }

    // Store old manager ID before making changes
    const oldManagerId = cafe.linkedManager?.toString();

    // If cafe already has a manager, remove old manager first
    if (oldManagerId) {
      const oldManager = await User.findById(oldManagerId);
      if (oldManager) {
        oldManager.cafes = oldManager.cafes.filter(
          (c) => c.toString() !== id
        );
        try {
          await oldManager.save();
        } catch (error) {
          console.error("Failed to remove old manager from cafes array:", error);
          // Continue anyway as the main operation should proceed
        }
      }
    }

    // Assign manager to cafe
    cafe.linkedManager = userId;
    try {
      await cafe.save();
    } catch (error) {
      // If cafe save fails, try to restore old manager
      if (oldManagerId) {
        cafe.linkedManager = oldManagerId;
        await cafe.save().catch(() => {}); // Ignore errors in rollback
      }
      throw error;
    }

    // Add cafe to user's cafes array
    user.cafes = [new mongoose.Types.ObjectId(id)];
    try {
      await user.save();
    } catch (error) {
      // If user save fails, rollback cafe assignment
      cafe.linkedManager = oldManagerId || null;
      await cafe.save().catch(() => {}); // Ignore errors in rollback
      throw error;
    }

    await cafe.populate("linkedManager", "name email phone role");
    await user.populate("cafes");

    res.json({
      success: true,
      message: "Manager assigned to cafe successfully",
      data: {
        cafe,
        manager: user,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to assign manager",
      error: error.message,
    });
  }
};

/**
 * PUT /api/cafes/:id/change-manager
 * Change cafe manager (Super Admin only)
 */
export const changeManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find cafe
    const cafe = await Cafe.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Find new manager and populate role
    const newManager = await User.findById(userId).populate("role");
    if (!newManager) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate user role is manager
    if (newManager.role?.name !== "manager") {
      return res.status(400).json({
        success: false,
        message: "User must have manager role",
      });
    }

    // Check if new manager already has a cafe
    if (newManager.cafes && newManager.cafes.length > 0) {
      const existingCafeId = newManager.cafes[0].toString();
      if (existingCafeId !== id) {
        return res.status(400).json({
          success: false,
          message: "Manager is already assigned to another cafe",
        });
      }
    }

    // Store old manager ID before making changes
    const oldManagerId = cafe.linkedManager?.toString();

    // Remove old manager if exists
    if (oldManagerId) {
      const oldManager = await User.findById(oldManagerId);
      if (oldManager) {
        oldManager.cafes = oldManager.cafes.filter(
          (c) => c.toString() !== id
        );
        try {
          await oldManager.save();
        } catch (error) {
          // If old manager save fails, rollback is not possible but log error
          console.error("Failed to remove old manager from cafes array:", error);
          // Continue anyway as the main operation should proceed
        }
      }
    }

    // Assign new manager to cafe
    cafe.linkedManager = userId;
    try {
      await cafe.save();
    } catch (error) {
      // If cafe save fails, try to restore old manager
      if (oldManagerId) {
        cafe.linkedManager = oldManagerId;
        await cafe.save().catch(() => {}); // Ignore errors in rollback
      }
      throw error;
    }

    // Add cafe to new manager's cafes array
    // Check if manager already has this cafe (shouldn't happen, but safe check)
    const hasCafe = newManager.cafes && newManager.cafes.some(
      (c) => c.toString() === id
    );
    
    if (!hasCafe) {
      // Remove any existing cafes (manager can only have one)
      newManager.cafes = [new mongoose.Types.ObjectId(id)];
      try {
        await newManager.save();
      } catch (error) {
        // If new manager save fails, rollback cafe assignment
        cafe.linkedManager = oldManagerId || null;
        await cafe.save().catch(() => {}); // Ignore errors in rollback
        throw error;
      }
    }

    await cafe.populate("linkedManager", "name email phone role");

    res.json({
      success: true,
      message: "Cafe manager changed successfully",
      data: { cafe },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to change manager",
      error: error.message,
    });
  }
};

/**
 * GET /api/cafes
 * List cafes (Super Admin: all, Manager: own cafe)
 */
export const listCafes = async (req, res) => {
  try {
    const currentUser = req.user;
    let cafes;

    if (currentUser.role?.name === "superadmin") {
      // Super admin sees all cafes
      cafes = await Cafe.find()
        .populate("linkedManager", "name email phone role")
        .sort({ createdAt: -1 })
        .lean();
    } else if (currentUser.role?.name === "manager") {
      // Manager sees only their cafe
      if (!currentUser.cafes || currentUser.cafes.length === 0 || !currentUser.cafes[0] || !currentUser.cafes[0]._id) {
        return res.json({
          success: true,
          data: { cafes: [] },
        });
      }
      const managerCafeId = currentUser.cafes[0]._id;
      cafes = await Cafe.find({ _id: managerCafeId })
        .populate("linkedManager", "name email phone role")
        .lean();
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Add isActive status
    const cafesWithStatus = cafes.map((cafe) => ({
      ...cafe,
      isActive: !!cafe.linkedManager,
    }));

    res.json({
      success: true,
      data: { cafes: cafesWithStatus },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cafes",
      error: error.message,
    });
  }
};

// ============ CAFE USER MANAGEMENT ============

/**
 * POST /api/cafes/:id/users
 * Add user to cafe (Manager, Super Admin)
 */
export const addUserToCafe = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const currentUser = req.user;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find cafe
    const cafe = await Cafe.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Manager can only add users to their own cafe
    if (currentUser.role?.name === "manager") {
      const managerCafeIds = currentUser.cafes.map((c) => c._id.toString());
      if (!managerCafeIds.includes(id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only manage users in your cafe.",
        });
      }
    }

    // Find user and populate role
    const user = await User.findById(userId).populate("role");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Cannot add manager through this endpoint (use assign-manager instead)
    if (user.role?.name === "manager") {
      return res.status(400).json({
        success: false,
        message: "Cannot add manager to cafe. Use assign-manager endpoint instead.",
      });
    }

    // Check if user is already in the cafe
    const userCafeIds = user.cafes.map((c) => c._id.toString());
    if (userCafeIds.includes(id)) {
      return res.status(400).json({
        success: false,
        message: "User is already in this cafe",
      });
    }

    // Add cafe to user's cafes array
    user.cafes.push(new mongoose.Types.ObjectId(id));
    await user.save();

    await user.populate("cafes");
    await user.populate("role");

    res.json({
      success: true,
      message: "User added to cafe successfully",
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add user to cafe",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/cafes/:id/users/:userId
 * Remove user from cafe (Manager, Super Admin)
 */
export const removeUserFromCafe = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const currentUser = req.user;

    // Find cafe
    const cafe = await Cafe.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Manager can only remove users from their own cafe
    if (currentUser.role?.name === "manager") {
      const managerCafeIds = currentUser.cafes.map((c) => c._id.toString());
      if (!managerCafeIds.includes(id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only manage users in your cafe.",
        });
      }
    }

    // Find user and populate role
    const user = await User.findById(userId).populate("role");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Cannot remove manager
    if (user.role?.name === "manager" && cafe.linkedManager?.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove manager from cafe. Use change-manager endpoint instead.",
      });
    }

    // Check if user is in the cafe
    const cafeIndex = user.cafes.findIndex((c) => c.toString() === id);
    if (cafeIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "User is not in this cafe",
      });
    }

    // Remove cafe from user
    user.cafes.splice(cafeIndex, 1);
    await user.save();

    await user.populate("cafes");
    await user.populate("role");

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
 * GET /api/cafes/:id/users
 * List cafe users (Manager)
 */
export const listCafeUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.query;
    const currentUser = req.user;

    // Find cafe
    const cafe = await Cafe.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Only manager can list users of their cafe
    if (currentUser.role?.name === "manager") {
      const managerCafeIds = currentUser.cafes.map((c) => c._id.toString());
      if (!managerCafeIds.includes(id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view users in your cafe.",
        });
      }
    } else if (currentUser.role?.name !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Build query
    const query = { cafes: new mongoose.Types.ObjectId(id) };

    // Filter by role
    if (role) {
      const roleDoc = await Role.findOne({ name: role });
      if (roleDoc) {
        query.role = roleDoc._id;
      }
    }

    // Filter by status
    if (status) {
      query.status = status;
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
      message: "Failed to fetch cafe users",
      error: error.message,
    });
  }
};

// ============ CAFE SETTINGS ============

/**
 * GET /api/cafes/:id/settings
 * Get cafe settings (Manager, Receptionist)
 */
export const getCafeSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const cafe = await Cafe.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Manager and receptionist can only view their cafe settings
    if (currentUser.role?.name === "manager" || currentUser.role?.name === "receptionist") {
      const userCafeIds = currentUser.cafes.map((c) => c._id.toString());
      if (!userCafeIds.includes(id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view settings of your cafe.",
        });
      }
    }

    res.json({
      success: true,
      data: {
        settings: cafe.settings,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cafe settings",
      error: error.message,
    });
  }
};

/**
 * PUT /api/cafes/:id/settings
 * Update cafe settings (Manager only)
 */
export const updateCafeSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { taxPercentage } = req.body;
    const currentUser = req.user;

    const cafe = await Cafe.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Only manager can update their cafe settings
    if (currentUser.role?.name === "manager") {
      const managerCafeIds = currentUser.cafes.map((c) => c._id.toString());
      if (!managerCafeIds.includes(id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only update settings of your cafe.",
        });
      }
    } else if (currentUser.role?.name !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only manager can update cafe settings.",
      });
    }

    // Update tax percentage
    if (taxPercentage !== undefined) {
      cafe.settings.taxPercentage = taxPercentage || 0;
    }

    await cafe.save();

    res.json({
      success: true,
      message: "Cafe settings updated successfully",
      data: {
        settings: cafe.settings,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update cafe settings",
      error: error.message,
    });
  }
};
