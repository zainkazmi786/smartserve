/**
 * Notification Service
 * 
 * EXPLANATION:
 * 
 * 1. WebSocket (Socket.io) for Portal:
 *    - Real-time bidirectional communication
 *    - Server emits events when order status changes
 *    - Portal connects via Socket.io client
 *    - Works for multiple tabs/sessions
 *    - No polling needed - instant updates
 * 
 * 2. FCM (Firebase Cloud Messaging) for Mobile:
 *    - Push notifications when app is closed/backgrounded
 *    - Stores FCM tokens in User model
 *    - Server sends notifications via Firebase Admin SDK
 *    - Works even if app is not running
 *    - Fallback: WebSocket for in-app updates when app is open
 * 
 * Usage:
 * - notifyOrderStatusChange(order, newStatus, changedBy)
 * - This will emit Socket.io event AND send FCM push
 */

import User from "../models/User.js";

let io = null; // Socket.io instance (set by initializeNotifications)

/**
 * Initialize notification service with Socket.io instance
 */
export const initializeNotifications = (socketIO) => {
  io = socketIO;
  console.log("✅ Notification service initialized with Socket.io");
};

/**
 * Notify order status change to customer and staff
 */
export const notifyOrderStatusChange = async (order, newStatus, changedBy = null) => {
  try {
    // Populate order with customer info
    await order.populate("createdBy", "name email phone");
    await order.populate("cafe", "name");
    
    const customerId = order.createdBy._id.toString();
    const cafeId = order.cafe._id.toString();
    
    // Notification data
    const notificationData = {
      orderId: order._id.toString(),
      orderNumber: order._id.toString().slice(-6), // Last 6 chars
      status: newStatus,
      cafeName: order.cafe.name,
      timestamp: new Date().toISOString(),
    };
    
    // 1. WebSocket Notification (Portal + Mobile in-app)
    if (io) {
      // Emit to customer's room
      io.to(`customer:${customerId}`).emit("order:status-changed", {
        ...notificationData,
        type: "order_update",
        message: getStatusMessage(newStatus),
      });
      
      // Emit to cafe staff room
      io.to(`cafe:${cafeId}`).emit("order:status-changed", {
        ...notificationData,
        type: "order_update",
        message: getStatusMessage(newStatus),
      });
      
      console.log(`📡 WebSocket notification sent: Order ${order._id} → ${newStatus}`);
    }
    
    // 2. FCM Push Notification (Mobile - if app is closed)
    // TODO: Implement FCM when firebase-admin is installed
    // await sendFCMPushNotification(customerId, notificationData);
    
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

/**
 * Get human-readable message for status
 */
const getStatusMessage = (status) => {
  const messages = {
    approved: "Your order has been approved and is being prepared",
    ready: "Your order is ready for pickup",
    disapproved: "Payment issue - please re-upload receipt",
    cancelled: "Your order has been cancelled",
    preparing: "Your order is being prepared",
    received: "Order received - thank you!",
  };
  return messages[status] || `Order status changed to ${status}`;
};

/**
 * Send FCM push notification (to be implemented)
 * 
 * This will be implemented later when firebase-admin is added:
 * 
 * import admin from 'firebase-admin';
 * 
 * const sendFCMPushNotification = async (userId, notificationData) => {
 *   const user = await User.findById(userId);
 *   if (!user || !user.fcmToken) return;
 *   
 *   const message = {
 *     token: user.fcmToken,
 *     notification: {
 *       title: 'Order Update',
 *       body: getStatusMessage(notificationData.status),
 *     },
 *     data: notificationData,
 *   };
 *   
 *   await admin.messaging().send(message);
 * };
 */

/**
 * Notify kitchen screen about updates (active order or queue changes)
 */
export const notifyKitchenUpdate = async (cafeId, updateType, data) => {
  try {
    if (!io) return;

    // Emit to cafe kitchen room
    io.to(`cafe:${cafeId}`).emit("kitchen:update", {
      type: updateType, // 'active-order-changed', 'queue-updated', 'order-ready'
      data,
      timestamp: new Date().toISOString(),
    });

    console.log(`📡 Kitchen update sent to cafe ${cafeId}: ${updateType}`);
  } catch (error) {
    console.error("Error sending kitchen update:", error);
  }
};

/**
 * Register user for notifications (Socket.io room)
 */
export const registerUserForNotifications = (socket, userId, userRole, cafeIds = []) => {
  // Join customer room
  socket.join(`customer:${userId}`);
  
  // Join cafe rooms for staff
  if (userRole === "manager" || userRole === "receptionist") {
    cafeIds.forEach((cafeId) => {
      socket.join(`cafe:${cafeId}`);
    });
  }
};
