import Order from "../models/Order.js";
import Cafe from "../models/Cafe.js";
import MenuItem from "../models/MenuItem.js";
import { notifyKitchenUpdate } from "./notificationService.js";

/**
 * In-Memory Queue Manager with DB Backup
 * 
 * EXPLANATION:
 * - In-memory: Fast access for real-time operations (Map<cafeId, [orderIds]>)
 * - DB Backup: Queue state persisted in Order.queuePosition field
 * - On server restart: Rebuild in-memory queue from DB (orders with status "preparing" or "approved")
 * - Sync: Every queue operation updates both memory and DB
 */

// In-memory queue storage: cafeId -> [orderIds]
const kitchenQueues = new Map();

/**
 * Initialize queue manager - rebuild from DB on server start
 */
export const initializeQueues = async () => {
  try {
    console.log("🔄 Initializing kitchen queues from database...");
    
    // Get all cafes
    const cafes = await Cafe.find().select("_id");
    
    for (const cafe of cafes) {
      const cafeId = cafe._id.toString();
      
      // Get all preparing/approved orders for this cafe, sorted by approval time
      const orders = await Order.find({
        cafe: cafeId,
        status: { $in: ["preparing", "approved"] },
      })
        .sort({ updatedAt: 1 }) // Oldest first (FIFO)
        .select("_id queuePosition hasLongItems");
      
      // Build queue from DB
      const queue = orders.map((order) => order._id.toString());
      kitchenQueues.set(cafeId, queue);
      
      // Update queue positions in DB (sync)
      await syncQueuePositions(cafeId);
      
      console.log(`✅ Queue initialized for cafe ${cafeId}: ${queue.length} orders`);
    }
    
    console.log("✅ All kitchen queues initialized");
  } catch (error) {
    console.error("❌ Error initializing kitchen queues:", error);
  }
};

/**
 * Sync queue positions in database
 * Updates Order.queuePosition field for all orders in queue
 */
const syncQueuePositions = async (cafeId) => {
  const queue = kitchenQueues.get(cafeId) || [];
  
  // Update all orders in queue
  for (let i = 0; i < queue.length; i++) {
    await Order.findByIdAndUpdate(queue[i], { queuePosition: i + 1 });
  }
  
  // Clear queuePosition for orders not in queue
  await Order.updateMany(
    {
      cafe: cafeId,
      status: { $in: ["preparing", "approved"] },
      _id: { $nin: queue.map((id) => id) },
    },
    { $unset: { queuePosition: "" } }
  );
};

/**
 * Add order to kitchen queue (when approved)
 */
export const addToQueue = async (orderId, cafeId) => {
  try {
    // Get order to check for long items
    const order = await Order.findById(orderId).populate("items.item");
    if (!order) throw new Error("Order not found");
    
    // Check if order has long items
    const hasLongItems = order.items.some((orderItem) => {
      const item = orderItem.item;
      const cookingType = orderItem.cookingOverrideType || item.type;
      return cookingType === "long";
    });
    
    // Update order
    order.hasLongItems = hasLongItems;
    order.status = "preparing";
    await order.save();
    
    // Get or create queue for cafe
    let queue = kitchenQueues.get(cafeId.toString()) || [];
    
    // Add to end of queue
    queue.push(orderId.toString());
    kitchenQueues.set(cafeId.toString(), queue);
    
    // Sync to DB
    await syncQueuePositions(cafeId.toString());
    
    // If queue was empty, set as current kitchen order
    const cafe = await Cafe.findById(cafeId);
    if (!cafe.currentKitchenOrder && queue.length === 1) {
      await setCurrentKitchenOrder(cafeId, orderId);
      // Notify kitchen screen about new active order
      await notifyKitchenUpdate(cafeId, "active-order-changed", {
        orderId: orderId.toString(),
      });
    }
    
    // Notify queue updated
    await notifyKitchenUpdate(cafeId, "queue-updated", {
      queueLength: queue.length,
    });
    
    return { queueLength: queue.length, hasLongItems };
  } catch (error) {
    console.error("Error adding to queue:", error);
    throw error;
  }
};

/**
 * Get next order for kitchen screen (head of queue)
 */
export const getNextOrder = async (cafeId) => {
  const queue = kitchenQueues.get(cafeId.toString()) || [];
  
  if (queue.length === 0) {
    // Clear current kitchen order
    await Cafe.findByIdAndUpdate(cafeId, { $unset: { currentKitchenOrder: "" } });
    return null;
  }
  
  return queue[0]; // Return first order ID
};

/**
 * Set current kitchen order (displayed on screen)
 */
export const setCurrentKitchenOrder = async (cafeId, orderId) => {
  const cafe = await Cafe.findByIdAndUpdate(
    cafeId,
    { currentKitchenOrder: orderId },
    { new: true }
  );
  
  if (orderId) {
    // Update order displayedAt and calculate timeout for long items
    const order = await Order.findById(orderId);
    if (order && order.hasLongItems) {
      order.displayedAt = new Date();
      order.timeoutAt = new Date(Date.now() + 20 * 1000); // 20 seconds
      await order.save();
    } else if (order) {
      order.displayedAt = new Date();
      await order.save();
    }
  }
  
  return cafe;
};

/**
 * Remove order from queue (when marked ready)
 */
export const removeFromQueue = async (orderId, cafeId) => {
  try {
    let queue = kitchenQueues.get(cafeId.toString()) || [];
    
    // Remove from queue
    queue = queue.filter((id) => id !== orderId.toString());
    kitchenQueues.set(cafeId.toString(), queue);
    
    // Clear order queue fields
    await Order.findByIdAndUpdate(orderId, {
      $unset: { queuePosition: "", displayedAt: "", timeoutAt: "" },
    });
    
    // Sync to DB
    await syncQueuePositions(cafeId.toString());
    
    // Set next order as current if queue not empty
    if (queue.length > 0) {
      await setCurrentKitchenOrder(cafeId, queue[0]);
      // Notify kitchen screen about new active order
      await notifyKitchenUpdate(cafeId, "active-order-changed", {
        orderId: queue[0],
      });
    } else {
      await Cafe.findByIdAndUpdate(cafeId, { $unset: { currentKitchenOrder: "" } });
      // Notify kitchen screen that no active order
      await notifyKitchenUpdate(cafeId, "active-order-changed", {
        orderId: null,
      });
    }
    
    // Notify queue updated
    await notifyKitchenUpdate(cafeId, "queue-updated", {
      queueLength: queue.length,
    });
    
    return { queueLength: queue.length };
  } catch (error) {
    console.error("Error removing from queue:", error);
    throw error;
  }
};

/**
 * Re-queue order (move to tail) - for long items timeout
 */
export const requeueOrder = async (orderId, cafeId) => {
  try {
    let queue = kitchenQueues.get(cafeId.toString()) || [];
    
    // Remove from current position
    queue = queue.filter((id) => id !== orderId.toString());
    
    // Add to end
    queue.push(orderId.toString());
    kitchenQueues.set(cafeId.toString(), queue);
    
    // Clear displayedAt and timeoutAt
    await Order.findByIdAndUpdate(orderId, {
      $unset: { displayedAt: "", timeoutAt: "" },
    });
    
    // Sync to DB
    await syncQueuePositions(cafeId.toString());
    
    // Set new head as current
    if (queue.length > 0 && queue[0] !== orderId) {
      await setCurrentKitchenOrder(cafeId, queue[0]);
      // Notify kitchen screen about new active order
      await notifyKitchenUpdate(cafeId, "active-order-changed", {
        orderId: queue[0],
      });
    } else if (queue.length === 0) {
      // If queue is empty, notify that no active order
      await Cafe.findByIdAndUpdate(cafeId, { $unset: { currentKitchenOrder: "" } });
      await notifyKitchenUpdate(cafeId, "active-order-changed", {
        orderId: null,
      });
    }
    
    // Notify queue updated
    await notifyKitchenUpdate(cafeId, "queue-updated", {
      queueLength: queue.length,
    });
    
    return { queueLength: queue.length, newHead: queue[0] };
  } catch (error) {
    console.error("Error requeuing order:", error);
    throw error;
  }
};

/**
 * Get queue status for cafe
 */
export const getQueueStatus = (cafeId) => {
  const queue = kitchenQueues.get(cafeId.toString()) || [];
  return {
    queueLength: queue.length,
    queue: queue,
  };
};
