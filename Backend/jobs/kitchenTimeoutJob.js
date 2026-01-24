import Order from "../models/Order.js";
import { requeueOrder, setCurrentKitchenOrder } from "../services/kitchenQueueManager.js";
import { notifyOrderStatusChange } from "../services/notificationService.js";

/**
 * Background Job: Kitchen Timeout Handler
 * 
 * EXPLANATION:
 * - Runs every 5 seconds (setInterval)
 * - Checks all orders with timeoutAt < now AND status = "preparing"
 * - If timeout expired and order has long items → re-queue
 * - This ensures long items don't block the queue forever
 * 
 * Why background job:
 * - Server-side control (more reliable than client)
 * - Works even if kitchen screen disconnects
 * - Centralized timeout logic
 */

let intervalId = null;

/**
 * Start the background job
 */
export const startKitchenTimeoutJob = () => {
  if (intervalId) {
    console.log("⚠️ Kitchen timeout job already running");
    return;
  }
  
  console.log("🕐 Starting kitchen timeout background job...");
  
  // Run every 1 second for faster response
  intervalId = setInterval(async () => {
    try {
      await checkTimeoutOrders();
    } catch (error) {
      console.error("Error in kitchen timeout job:", error);
    }
  }, 1000); // 1 second - reduced from 5 seconds for faster response
};

/**
 * Stop the background job
 */
export const stopKitchenTimeoutJob = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("🛑 Kitchen timeout job stopped");
  }
};

/**
 * Check for orders that have timed out
 */
const checkTimeoutOrders = async () => {
  const now = new Date();
  
  // Find orders that have timed out
  const timedOutOrders = await Order.find({
    status: "preparing",
    timeoutAt: { $exists: true, $lte: now },
    hasLongItems: true,
  }).populate("cafe", "_id");
  
  for (const order of timedOutOrders) {
    try {
      const cafeId = order.cafe._id.toString();
      
      console.log(`⏰ Order ${order._id} timed out, re-queuing...`);
      
      // Re-queue order (move to tail)
      await requeueOrder(order._id, cafeId);
      
      console.log(`✅ Order ${order._id} re-queued successfully`);
    } catch (error) {
      console.error(`Error re-queuing order ${order._id}:`, error);
    }
  }
};
