import mongoose from "mongoose";
import Menu from "../models/Menu.js";
import MenuItem from "../models/MenuItem.js";
import Cafe from "../models/Cafe.js";

// ============ MENU MANAGEMENT ============

/**
 * POST /api/menus
 * Create menu (Manager, Receptionist)
 */
export const createMenu = async (req, res) => {
  try {
    const { name, items } = req.body;
    const currentUser = req.user;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Menu name is required",
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

    // Validate menu name uniqueness per cafe
    const existingMenu = await Menu.findOne({
      cafe: cafeId,
      name,
      status: { $ne: "deleted" },
    });
    if (existingMenu) {
      return res.status(400).json({
        success: false,
        message: "Menu name already exists for this cafe",
      });
    }

    // Validate items belong to same cafe
    if (items && items.length > 0) {
      const menuItems = await MenuItem.find({
        _id: { $in: items },
        cafe: cafeId,
      });
      if (menuItems.length !== items.length) {
        return res.status(400).json({
          success: false,
          message: "Some menu items do not belong to this cafe",
        });
      }
    }

    // Create menu (inactive by default)
    const menu = new Menu({
      cafe: cafeId,
      name,
      items: items || [],
      status: "inactive",
      timeSlots: [],
      createdBy: currentUser._id,
    });

    await menu.save();
    await menu.populate("cafe", "name");
    await menu.populate("items");
    await menu.populate("createdBy", "name");

    res.status(201).json({
      success: true,
      message: "Menu created successfully",
      data: { menu },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create menu",
      error: error.message,
    });
  }
};

/**
 * GET /api/menus
 * List all menus (Manager, Receptionist)
 */
export const listMenus = async (req, res) => {
  try {
    const currentUser = req.user;
    const cafeId = req.activeCafeId;

    if (!cafeId) {
      return res.status(400).json({
        success: false,
        message: "Active cafe is required",
      });
    }

    const menus = await Menu.find({
      cafe: cafeId,
      status: { $ne: "deleted" },
    })
      .populate("cafe", "name")
      .populate("items")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { menus },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch menus",
      error: error.message,
    });
  }
};

/**
 * GET /api/menus/today
 * Get all menus for today (menus with time slots for today + manually activated menus)
 * Returns menus with isCurrentlyActive flag
 */
export const getTodayMenus = async (req, res) => {
  try {
    const cafeId = req.activeCafeId;

    if (!cafeId) {
      return res.status(400).json({
        success: false,
        message: "Active cafe is required",
      });
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    // Get all menus with time slots (only inactive menus use time slots)
    const allMenusWithSlots = await Menu.find({
      cafe: cafeId,
      status: "inactive", // Only inactive menus use time slots
      timeSlots: { $exists: true, $ne: [] },
    }).populate("items");

    // Get all manually activated menus (status: "active" - they ignore time slots)
    const manuallyActivatedMenus = await Menu.find({
      cafe: cafeId,
      status: "active",
    }).populate("items");

    // Combine menus and use Map to avoid duplicates
    const menuMap = new Map();

    // Process menus with time slots - include ALL that have slots for today
    // (both currently active and inactive ones with today's slots)
    for (const menu of allMenusWithSlots) {
      // Check if menu has time slots for today
      const hasTodaySlot = menu.timeSlots && menu.timeSlots.some(
        (slot) => slot.dayOfWeek === currentDay
      );

      if (hasTodaySlot) {
        menuMap.set(menu._id.toString(), menu);
      }
    }

    // Add manually activated menus (they should always be included)
    for (const menu of manuallyActivatedMenus) {
      menuMap.set(menu._id.toString(), menu);
    }

    // Process each menu to determine if it's currently active
    const processedMenus = [];
    for (const menu of menuMap.values()) {
      let isCurrentlyActive = false;

      // Priority 1: Check if manually activated (status: "active")
      // Manually activated menus ignore time slots
      if (menu.status === "active") {
        isCurrentlyActive = true;
      } else {
        // Priority 2: Check if has active time slot right now (only for inactive menus)
        // Only check time slots for menus with status: "inactive"
        if (menu.timeSlots && menu.timeSlots.length > 0) {
          for (const slot of menu.timeSlots) {
            // Check if slot is for today and currently active
            if (
              slot.dayOfWeek === currentDay &&
              currentTime >= slot.startTime &&
              currentTime <= slot.endTime
            ) {
              isCurrentlyActive = true;
              break; // Found active slot, no need to check more
            }
          }
        }
      }

      // Filter only active items
      const activeItems = menu.items.filter((item) => item.isActive !== false);

      processedMenus.push({
        _id: menu._id,
        name: menu.name,
        isCurrentlyActive,
        timeSlots: menu.timeSlots || [],
        status: menu.status,
        items: activeItems,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt,
      });
    }

    // Sort: active menus first, then others
    const menusArray = processedMenus;
    menusArray.sort((a, b) => {
      // Active menus first
      if (a.isCurrentlyActive && !b.isCurrentlyActive) return -1;
      if (!a.isCurrentlyActive && b.isCurrentlyActive) return 1;
      // Then sort by name
      return a.name.localeCompare(b.name);
    });

    res.json({
      success: true,
      data: {
        menus: menusArray,
        currentTime,
        currentDay,
      },
    });
  } catch (error) {
    console.error("Get today menus error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch today's menus",
      error: error.message,
    });
  }
};

/**
 * GET /api/menus/active
 * Get active menu (Customer view)
 */
export const getActiveMenu = async (req, res) => {
  try {
    const cafeId = req.activeCafeId;

    if (!cafeId) {
      return res.status(400).json({
        success: false,
        message: "Active cafe is required",
      });
    }

    // Priority 1: Check for scheduled menu (time-slot based)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    // Find menus with time slots for current day and time
    const allMenus = await Menu.find({
      cafe: cafeId,
      status: { $ne: "deleted" },
      timeSlots: { $exists: true, $ne: [] },
    }).populate("items");

    let activeMenu = null;
    let highestPriority = -1;

    // Check time slots
    for (const menu of allMenus) {
      for (const slot of menu.timeSlots) {
        if (
          slot.dayOfWeek === currentDay &&
          currentTime >= slot.startTime &&
          currentTime <= slot.endTime
        ) {
          const priority = slot.priority || 0;
          if (!activeMenu || priority > highestPriority) {
            activeMenu = menu;
            highestPriority = priority;
          }
        }
      }
    }

    // Priority 2: If no scheduled menu, check manually activated menu
    if (!activeMenu) {
      activeMenu = await Menu.findOne({
        cafe: cafeId,
        status: "active",
      }).populate("items");
    }

    if (!activeMenu) {
      return res.status(404).json({
        success: false,
        message: "No active menu available",
      });
    }

    // Filter only active items
    const activeItems = activeMenu.items.filter(
      (item) => item.isActive !== false
    );
    activeMenu.items = activeItems;

    await activeMenu.populate("cafe", "name");

    res.json({
      success: true,
      data: { menu: activeMenu },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch active menu",
      error: error.message,
    });
  }
};

/**
 * GET /api/menus/:id
 * Get menu details
 */
export const getMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const cafeId = req.activeCafeId;

    const menu = await Menu.findOne({
      _id: id,
      cafe: cafeId,
      status: { $ne: "deleted" },
    })
      .populate("cafe", "name")
      .populate("items")
      .populate("createdBy", "name");

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    res.json({
      success: true,
      data: { menu },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu",
      error: error.message,
    });
  }
};

/**
 * PUT /api/menus/:id
 * Update menu (only inactive menus)
 */
export const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, items } = req.body;
    const cafeId = req.activeCafeId;

    const menu = await Menu.findOne({
      _id: id,
      cafe: cafeId,
      status: { $ne: "deleted" },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    // Active menus cannot be edited
    if (menu.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Active menus cannot be edited. Please deactivate first.",
      });
    }

    // Update name if provided
    if (name && name !== menu.name) {
      // Check name uniqueness
      const existingMenu = await Menu.findOne({
        cafe: cafeId,
        name,
        _id: { $ne: id },
        status: { $ne: "deleted" },
      });
      if (existingMenu) {
        return res.status(400).json({
          success: false,
          message: "Menu name already exists for this cafe",
        });
      }
      menu.name = name;
    }

    // Update items if provided
    if (items !== undefined) {
      // Validate items belong to same cafe
      if (items.length > 0) {
        const menuItems = await MenuItem.find({
          _id: { $in: items },
          cafe: cafeId,
        });
        if (menuItems.length !== items.length) {
          return res.status(400).json({
            success: false,
            message: "Some menu items do not belong to this cafe",
          });
        }
      }
      menu.items = items;
    }

    await menu.save();
    await menu.populate("cafe", "name");
    await menu.populate("items");
    await menu.populate("createdBy", "name");

    res.json({
      success: true,
      message: "Menu updated successfully",
      data: { menu },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update menu",
      error: error.message,
    });
  }
};

/**
 * POST /api/menus/:id/activate
 * Activate menu manually (transactional)
 */
export const activateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const cafeId = req.activeCafeId;

    if (!cafeId) {
      return res.status(400).json({
        success: false,
        message: "Active cafe is required",
      });
    }

    const menu = await Menu.findOne({
      _id: id,
      cafe: cafeId,
      status: { $ne: "deleted" },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    // Check how many menus are currently active
    const activeMenusCount = await Menu.countDocuments({
      cafe: cafeId,
      status: "active",
    });

    // If already 2 active menus, prevent activation
    if (activeMenusCount >= 2) {
      return res.status(400).json({
        success: false,
        message: "Only 2 menus can be active at a time. Please deactivate one menu first.",
      });
    }

    // Activate this menu manually
    // Clear time slots since menu is now manually controlled
    const hadTimeSlots = menu.timeSlots && menu.timeSlots.length > 0;
    menu.status = "active";
    menu.timeSlots = []; // Clear time slots
    await menu.save();

    await menu.populate("cafe", "name");
    await menu.populate("items");
    await menu.populate("createdBy", "name");

    res.json({
      success: true,
      message: hadTimeSlots 
        ? "Menu activated successfully. Time slots have been removed as the menu is now manually controlled."
        : "Menu activated successfully",
      data: { menu },
    });
  } catch (error) {
    console.error("Activate menu error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to activate menu",
      error: error.message,
    });
  }
};

/**
 * POST /api/menus/:id/deactivate
 * Deactivate menu
 */
export const deactivateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const cafeId = req.activeCafeId;

    const menu = await Menu.findOne({
      _id: id,
      cafe: cafeId,
      status: { $ne: "deleted" },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    // Check if menu has time slots before deactivating
    const hadTimeSlots = menu.timeSlots && menu.timeSlots.length > 0;
    
    menu.status = "inactive";
    // Clear time slots if they exist (menu was time-slot based)
    if (hadTimeSlots) {
      menu.timeSlots = [];
    }
    await menu.save();

    await menu.populate("cafe", "name");
    await menu.populate("items");
    await menu.populate("createdBy", "name");

    res.json({
      success: true,
      message: hadTimeSlots
        ? "Menu deactivated successfully. Time slots have been removed."
        : "Menu deactivated successfully",
      data: { menu },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to deactivate menu",
      error: error.message,
    });
  }
};

/**
 * POST /api/menus/:id/items
 * Add items to menu
 */
export const addItemsToMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemIds } = req.body;
    const cafeId = req.activeCafeId;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "itemIds array is required",
      });
    }

    const menu = await Menu.findOne({
      _id: id,
      cafe: cafeId,
      status: { $ne: "deleted" },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    // Active menus cannot be modified
    if (menu.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Active menus cannot be modified. Please deactivate first.",
      });
    }

    // Validate items belong to same cafe
    const menuItems = await MenuItem.find({
      _id: { $in: itemIds },
      cafe: cafeId,
    });
    if (menuItems.length !== itemIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some menu items do not belong to this cafe",
      });
    }

    // Add items (avoid duplicates)
    const existingItemIds = menu.items.map((item) => item.toString());
    const newItems = itemIds.filter(
      (itemId) => !existingItemIds.includes(itemId.toString())
    );
    menu.items = [...menu.items, ...newItems.map((id) => new mongoose.Types.ObjectId(id))];

    await menu.save();
    await menu.populate("cafe", "name");
    await menu.populate("items");
    await menu.populate("createdBy", "name");

    res.json({
      success: true,
      message: "Items added to menu successfully",
      data: { menu },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add items to menu",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/menus/:id/items
 * Remove items from menu
 */
export const removeItemsFromMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemIds } = req.body;
    const cafeId = req.activeCafeId;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "itemIds array is required",
      });
    }

    const menu = await Menu.findOne({
      _id: id,
      cafe: cafeId,
      status: { $ne: "deleted" },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    // Active menus cannot be modified
    if (menu.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Active menus cannot be modified. Please deactivate first.",
      });
    }

    // Remove items
    menu.items = menu.items.filter(
      (item) => !itemIds.includes(item.toString())
    );

    await menu.save();
    await menu.populate("cafe", "name");
    await menu.populate("items");
    await menu.populate("createdBy", "name");

    res.json({
      success: true,
      message: "Items removed from menu successfully",
      data: { menu },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to remove items from menu",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/menus/:id
 * Soft delete menu
 */
export const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const cafeId = req.activeCafeId;

    const menu = await Menu.findOne({
      _id: id,
      cafe: cafeId,
      status: { $ne: "deleted" },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    // Soft delete: set status to deleted
    menu.status = "deleted";
    await menu.save();

    res.json({
      success: true,
      message: "Menu deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete menu",
      error: error.message,
    });
  }
};

// ============ TIME SLOT MANAGEMENT ============

/**
 * Helper function to check time slot overlap
 */
const checkTimeSlotOverlap = async (cafeId, timeSlots, excludeMenuId = null) => {
  const query = {
    cafe: cafeId,
    status: { $ne: "deleted" },
    timeSlots: { $exists: true, $ne: [] },
  };
  if (excludeMenuId) {
    query._id = { $ne: excludeMenuId };
  }

  const existingMenus = await Menu.find(query);

  for (const newSlot of timeSlots) {
    for (const menu of existingMenus) {
      for (const existingSlot of menu.timeSlots) {
        // Check if same day
        if (newSlot.dayOfWeek === existingSlot.dayOfWeek) {
          // Check time overlap
          const newStart = newSlot.startTime;
          const newEnd = newSlot.endTime;
          const existingStart = existingSlot.startTime;
          const existingEnd = existingSlot.endTime;

          // Check if time ranges overlap
          if (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          ) {
            return {
              overlap: true,
              message: `Time slot overlaps with menu "${menu.name}" (${existingStart}-${existingEnd} on day ${existingSlot.dayOfWeek})`,
            };
          }
        }
      }
    }
  }

  return { overlap: false };
};

/**
 * PUT /api/menus/:id/time-slots
 * Set time slots for menu
 */
export const setTimeSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeSlots } = req.body;
    const cafeId = req.activeCafeId;

    if (!timeSlots || !Array.isArray(timeSlots)) {
      return res.status(400).json({
        success: false,
        message: "timeSlots array is required",
      });
    }

    const menu = await Menu.findOne({
      _id: id,
      cafe: cafeId,
      status: { $ne: "deleted" },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    // Cannot set time slots for manually activated menus
    if (menu.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot set time slots for manually activated menu. Please deactivate the menu first.",
      });
    }

    // Validate time slot format
    for (const slot of timeSlots) {
      if (
        typeof slot.dayOfWeek !== "number" ||
        slot.dayOfWeek < 0 ||
        slot.dayOfWeek > 6
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid dayOfWeek (must be 0-6)",
        });
      }
      if (!slot.startTime || !slot.endTime) {
        return res.status(400).json({
          success: false,
          message: "startTime and endTime are required",
        });
      }
      // Validate time format (HH:mm)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        return res.status(400).json({
          success: false,
          message: "Invalid time format (must be HH:mm)",
        });
      }
      if (slot.startTime >= slot.endTime) {
        return res.status(400).json({
          success: false,
          message: "startTime must be before endTime",
        });
      }
    }

    // Allow overlapping time slots - we now support up to 2 active menus
    // Overlap check removed to allow multiple menus with overlapping time slots
    // The system will use priority to determine which menu is active when slots overlap

    // Update time slots
    menu.timeSlots = timeSlots;
    await menu.save();

    await menu.populate("cafe", "name");
    await menu.populate("items");
    await menu.populate("createdBy", "name");

    res.json({
      success: true,
      message: "Time slots set successfully",
      data: { menu },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to set time slots",
      error: error.message,
    });
  }
};

/**
 * GET /api/menus/:id/time-slots
 * Get time slots for menu
 */
export const getTimeSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const cafeId = req.activeCafeId;

    const menu = await Menu.findOne({
      _id: id,
      cafe: cafeId,
      status: { $ne: "deleted" },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    res.json({
      success: true,
      data: { timeSlots: menu.timeSlots },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch time slots",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/menus/:id/time-slots
 * Remove time slots from menu
 */
export const removeTimeSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const cafeId = req.activeCafeId;

    const menu = await Menu.findOne({
      _id: id,
      cafe: cafeId,
      status: { $ne: "deleted" },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    menu.timeSlots = [];
    await menu.save();

    res.json({
      success: true,
      message: "Time slots removed successfully",
      data: { menu },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to remove time slots",
      error: error.message,
    });
  }
};
