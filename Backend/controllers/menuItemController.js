import mongoose from "mongoose";
import MenuItem from "../models/MenuItem.js";
import Cafe from "../models/Cafe.js";

// ============ MENU ITEM MANAGEMENT ============

/**
 * POST /api/menu-items
 * Create menu item (Manager, Receptionist)
 */
export const createMenuItem = async (req, res) => {
  try {
    // Debug: Log request body to see what's being received
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    
    const { name, description, category, price, type, timeToCook } = req.body;
    const currentUser = req.user;

    // Validation
    if (!name || !category || !price || !type) {
      return res.status(400).json({
        success: false,
        message: "Name, category, price, and type are required",
        received: {
          name: !!name,
          category: !!category,
          price: !!price,
          type: !!type,
          bodyKeys: Object.keys(req.body || {}),
        },
      });
    }

    // Get cafe from active cafe (never from request body)
    const cafeId = req.activeCafeId;
    if (!cafeId) {
      return res.status(400).json({
        success: false,
        message: "Active cafe is required",
      });
    }

    // Verify cafe exists
    const cafe = await Cafe.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Validate type and timeToCook
    if (type === "long" && (!timeToCook || timeToCook <= 0)) {
      return res.status(400).json({
        success: false,
        message: "timeToCook is required for long type items",
      });
    }

    if (type === "short" && timeToCook) {
      return res.status(400).json({
        success: false,
        message: "timeToCook must be null for short type items",
      });
    }

    // Handle images - from file uploads or URLs
    let images = [];
    
    // If files were uploaded via multer (using .fields(), files are in req.files.images array)
    if (req.files && req.files.images && req.files.images.length > 0) {
      images = req.files.images.map((file) => file.path); // Cloudinary URL is in file.path
    }
    // Otherwise, use images from request body (URLs)
    else if (req.body.images) {
      // Handle both array and single value
      images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    // Create menu item
    const menuItem = new MenuItem({
      cafe: cafeId,
      name,
      description: description || undefined,
      category,
      price: parseFloat(price),
      type,
      timeToCook: type === "long" ? parseInt(timeToCook) : null,
      images,
      isActive: true,
    });

    await menuItem.save();
    await menuItem.populate("cafe", "name");

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: { menuItem },
    });
  } catch (error) {
    if (error.message.includes("timeToCook")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create menu item",
      error: error.message,
    });
  }
};

/**
 * GET /api/menu-items
 * List menu items (Manager, Receptionist: all items, Super Admin: filtered)
 */
export const listMenuItems = async (req, res) => {
  try {
    const { category, isActive, cafe } = req.query;
    const currentUser = req.user;
    let query = {};

    // Determine cafe scope
    if (currentUser.role?.name === "superadmin") {
      // Super admin can filter by cafe
      if (cafe) {
        query.cafe = cafe;
      }
    } else if (
      currentUser.role?.name === "manager" ||
      currentUser.role?.name === "receptionist"
    ) {
      // Manager/Receptionist see only their cafe items
      const cafeId = req.activeCafeId;
      if (!cafeId) {
        return res.status(400).json({
          success: false,
          message: "Active cafe is required",
        });
      }
      query.cafe = cafeId;
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const menuItems = await MenuItem.find(query)
      .populate("cafe", "name")
      .sort({ category: 1, name: 1 });

    res.json({
      success: true,
      data: { menuItems },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu items",
      error: error.message,
    });
  }
};

/**
 * GET /api/menu-items/:id
 * Get menu item details (Manager, Receptionist, Super Admin)
 */
export const getMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const menuItem = await MenuItem.findById(id).populate("cafe", "name");

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    // Manager/Receptionist can only view items from their cafe
    if (
      currentUser.role?.name === "manager" ||
      currentUser.role?.name === "receptionist"
    ) {
      const cafeId = req.activeCafeId;
      if (menuItem.cafe._id.toString() !== cafeId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view items from your cafe.",
        });
      }
    }

    res.json({
      success: true,
      data: { menuItem },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu item",
      error: error.message,
    });
  }
};

/**
 * PUT /api/menu-items/:id
 * Update menu item (Manager, Receptionist)
 */
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, type, timeToCook, isActive } =
      req.body;
    const currentUser = req.user;

    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    // Manager/Receptionist can only update items from their cafe
    const cafeId = req.activeCafeId;
    if (menuItem.cafe.toString() !== cafeId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update items from your cafe.",
      });
    }

    // Validate type and timeToCook if type is being changed
    const newType = type || menuItem.type;
    const newTimeToCook = timeToCook !== undefined ? timeToCook : menuItem.timeToCook;

    if (newType === "long" && (!newTimeToCook || newTimeToCook <= 0)) {
      return res.status(400).json({
        success: false,
        message: "timeToCook is required for long type items",
      });
    }

    if (newType === "short" && newTimeToCook) {
      return res.status(400).json({
        success: false,
        message: "timeToCook must be null for short type items",
      });
    }

    // Update fields
    if (name !== undefined) menuItem.name = name;
    if (description !== undefined) menuItem.description = description || null;
    if (category !== undefined) menuItem.category = category;
    if (price !== undefined) menuItem.price = parseFloat(price);
    if (type !== undefined) {
      menuItem.type = type;
      menuItem.timeToCook = type === "long" ? parseInt(timeToCook) : null;
    } else if (timeToCook !== undefined && menuItem.type === "long") {
      menuItem.timeToCook = parseInt(timeToCook);
    }
    if (isActive !== undefined) menuItem.isActive = isActive;

    // Handle images update - from file uploads or URLs
    if (req.files && req.files.images && req.files.images.length > 0) {
      // If files were uploaded via multer, use those
      menuItem.images = req.files.images.map((file) => file.path); // Cloudinary URL is in file.path
    } else if (req.body.images !== undefined) {
      // Otherwise, use images from request body (URLs)
      if (Array.isArray(req.body.images)) {
        menuItem.images = req.body.images;
      } else if (req.body.images) {
        menuItem.images = [req.body.images];
      }
    }

    await menuItem.save();
    await menuItem.populate("cafe", "name");

    res.json({
      success: true,
      message: "Menu item updated successfully",
      data: { menuItem },
    });
  } catch (error) {
    if (error.message.includes("timeToCook")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update menu item",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/menu-items/:id/status
 * Toggle menu item active status (soft delete) (Manager, Receptionist)
 */
export const toggleMenuItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "isActive is required",
      });
    }

    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    // Manager/Receptionist can only update items from their cafe
    const cafeId = req.activeCafeId;
    if (menuItem.cafe.toString() !== cafeId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update items from your cafe.",
      });
    }

    menuItem.isActive = isActive;
    await menuItem.save();
    await menuItem.populate("cafe", "name");

    res.json({
      success: true,
      message: `Menu item ${isActive ? "activated" : "deactivated"} successfully`,
      data: { menuItem },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update menu item status",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/menu-items/:id
 * Soft delete menu item (set isActive = false) (Manager, Receptionist)
 */
export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    // Manager/Receptionist can only delete items from their cafe
    const cafeId = req.activeCafeId;
    if (menuItem.cafe.toString() !== cafeId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete items from your cafe.",
      });
    }

    // Soft delete: set isActive to false
    menuItem.isActive = false;
    await menuItem.save();

    res.json({
      success: true,
      message: "Menu item deleted successfully (soft delete)",
      data: { menuItem },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete menu item",
      error: error.message,
    });
  }
};

/**
 * GET /api/menu-items/categories
 * Get unique categories for a cafe (Manager, Receptionist)
 */
export const getCategories = async (req, res) => {
  try {
    const currentUser = req.user;
    let cafeId;

    if (currentUser.role?.name === "superadmin") {
      cafeId = req.query.cafe || req.activeCafeId;
    } else {
      cafeId = req.activeCafeId;
    }

    if (!cafeId) {
      return res.status(400).json({
        success: false,
        message: "Cafe ID is required",
      });
    }

    const categories = await MenuItem.distinct("category", {
      cafe: cafeId,
    });

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};
