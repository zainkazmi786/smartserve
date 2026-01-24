# Order Module Implementation Summary

## ✅ What Has Been Implemented

### 1. **Order Model Updates** (`models/Order.js`)
- ✅ Changed statuses to **lowercase**: `draft`, `payment_uploaded`, `cash_selected`, `disapproved`, `approved`, `preparing`, `ready`, `received`, `cancelled`
- ✅ Added kitchen queue fields:
  - `queuePosition`: Order's position in queue
  - `displayedAt`: When order was displayed on kitchen screen
  - `hasLongItems`: Boolean flag for long cooking items
  - `timeoutAt`: When to auto-requeue if not pressed

### 2. **Cafe Model Updates** (`models/Cafe.js`)
- ✅ Added `currentKitchenOrder`: Reference to currently displayed order on kitchen screen

### 3. **Kitchen Queue Manager** (`services/kitchenQueueManager.js`)

#### **In-Memory Queue with DB Backup - EXPLANATION:**

**How it works:**
1. **In-Memory (Map)**: Fast access for real-time operations
   - Structure: `Map<cafeId, [orderIds]>`
   - Operations: O(1) lookup, O(n) queue operations
   - Used for: Instant queue access during API calls

2. **Database Backup**:
   - Each order has `queuePosition` field in DB
   - On server start: Rebuild in-memory queue from DB
   - On every queue change: Sync positions to DB
   - Used for: Persistence, recovery after restart

**Benefits:**
- ✅ Fast real-time operations (memory)
- ✅ Data persistence (database)
- ✅ Automatic recovery on restart
- ✅ Single source of truth in DB

**Functions:**
- `initializeQueues()`: Rebuild queues from DB on server start
- `addToQueue(orderId, cafeId)`: Add order when approved
- `removeFromQueue(orderId, cafeId)`: Remove when marked ready
- `getNextOrder(cafeId)`: Get head of queue
- `setCurrentKitchenOrder(cafeId, orderId)`: Set displayed order
- `requeueOrder(orderId, cafeId)`: Move to tail (for long items timeout)

### 4. **Notification Service** (`services/notificationService.js`)

#### **WebSocket (Socket.io) for Portal - EXPLANATION:**

**How it works:**
1. **Server Setup**:
   - Socket.io server attached to HTTP server
   - Clients connect via WebSocket protocol
   - Bidirectional real-time communication

2. **Room System**:
   - `customer:{userId}`: Customer receives their order updates
   - `cafe:{cafeId}`: Staff receive all cafe order updates

3. **Event Emission**:
   ```javascript
   io.to(`customer:${customerId}`).emit("order:status-changed", {
     orderId, status, message, ...
   });
   ```

4. **Client Connection** (Frontend):
   ```javascript
   const socket = io("http://localhost:3000");
   socket.emit("authenticate", { userId, userRole, cafeIds });
   socket.on("order:status-changed", (data) => {
     // Update UI instantly
   });
   ```

**Benefits:**
- ✅ Instant updates (no polling)
- ✅ Multiple tabs synchronized
- ✅ Low latency
- ✅ Efficient (only sends when data changes)

#### **FCM for Mobile - EXPLANATION:**

**How it works:**
1. **Token Storage**: Store FCM token in User model
2. **Server Side**: Use `firebase-admin` SDK to send push notifications
3. **Delivery**: Firebase delivers to device even if app is closed

**Implementation Status:**
- ⚠️ **Stubbed for now** (commented code in `notificationService.js`)
- 📋 To implement later:
  1. Install: `npm install firebase-admin`
  2. Add service account key to `.env`
  3. Uncomment FCM code in notification service
  4. Store FCM tokens when user logs in

**Benefits:**
- ✅ Works when app is closed
- ✅ Native push notifications
- ✅ Battery efficient

### 5. **Background Job** (`jobs/kitchenTimeoutJob.js`)

#### **Long Item Timeout Handler - EXPLANATION:**

**How it works:**
1. **Interval**: Runs every 5 seconds
2. **Check**: Finds orders where:
   - `status = "preparing"`
   - `hasLongItems = true`
   - `timeoutAt <= now`
3. **Action**: Re-queue order (move to tail)

**Why Background Job:**
- ✅ Server-side control (reliable)
- ✅ Works even if kitchen screen disconnects
- ✅ Centralized timeout logic
- ✅ Automatic execution

**Functions:**
- `startKitchenTimeoutJob()`: Start the interval
- `stopKitchenTimeoutJob()`: Stop the interval
- `checkTimeoutOrders()`: Check and re-queue timed out orders

### 6. **Order Controller** (`controllers/orderController.js`)

All APIs implemented:
- ✅ `createOrder`: Create order from cart
- ✅ `uploadReceipt`: Upload/re-upload receipt
- ✅ `approveOrder`: Approve and send to kitchen (with cooking overrides)
- ✅ `disapproveOrder`: Reject payment with note
- ✅ `cancelOrder`: Cancel order (role-based rules)
- ✅ `markOrderReady`: Kitchen button press
- ✅ `markOrderReceived`: Customer pickup confirmation
- ✅ `getOrder`: Get order details
- ✅ `getOrderHistory`: Get filtered order list (role-based)
- ✅ `getNextKitchenOrder`: Get next order for kitchen screen

### 7. **Order Routes** (`routes/orderRoutes.js`)
All endpoints configured with proper authentication and authorization.

### 8. **Server Updates** (`server.js`)
- ✅ Socket.io server setup
- ✅ Queue initialization on DB connect
- ✅ Background job startup
- ✅ Notification service initialization

### 9. **Postman Collection** (`Smart_Cafe_Order_API.postman_collection.json`)
Complete collection with all endpoints and examples.

---

## 📦 Installation Steps

1. **Install Socket.io**:
   ```bash
   npm install socket.io
   ```

2. **Start Server**:
   ```bash
   npm run dev
   ```

   You should see:
   ```
   ✅ MongoDB connected - initializing services...
   ✅ Queue initialized for cafe...
   ✅ All kitchen queues initialized
   ✅ Notification service initialized with Socket.io
   🕐 Starting kitchen timeout background job...
   ✅ All services initialized
   🚀 Server is running on port 3000
   📡 Socket.io server ready
   ```

---

## 🔌 Socket.io Client Connection (Frontend Example)

### Portal (Web):
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Authenticate after login
socket.emit('authenticate', {
  userId: currentUser._id,
  userRole: currentUser.role.name,
  cafeIds: currentUser.cafes.map(c => c._id)
});

// Listen for order updates
socket.on('order:status-changed', (data) => {
  console.log('Order update:', data);
  // Update UI: show notification, refresh order list, etc.
  // data = { orderId, status, message, type, ... }
});
```

### Mobile (React Native - for future FCM):
```javascript
// Use react-native-push-notification for FCM
// Or socket.io-client for in-app updates when app is open
```

---

## 🎯 Key Features Explained

### **Single Active Order Per Cafe (Single Screen)**
- Only one order displayed at a time on kitchen screen
- `Cafe.currentKitchenOrder` tracks which order is shown
- When order is marked ready → next order automatically becomes current
- Kitchen screen polls `/api/orders/kitchen/next` to get current order

### **Queue Flow:**
```
Order Approved
  ↓
Add to Queue (tail)
  ↓
If queue was empty → Set as current kitchen order
  ↓
Kitchen screen displays current order
  ↓
Long items: Auto-hide after 20s → Re-queue (tail)
Short items: Stay until button pressed
  ↓
Button Press → Mark Ready → Remove from Queue → Next order becomes current
```

---

## 📋 Postman Collection Usage

1. **Import** `Smart_Cafe_Order_API.postman_collection.json` into Postman
2. **Set Variables**:
   - `baseUrl`: `http://localhost:3000`
   - `authToken`: Your JWT token (get from login)
   - `orderId`: Order ID for testing
   - `menuItemId`: Menu item ID for creating orders

3. **Test Flow**:
   - Create Order (Customer)
   - Approve Order (Manager/Receptionist)
   - Get Next Kitchen Order (Kitchen Screen)
   - Mark Order Ready (Kitchen)
   - Mark Order Received (Customer)

---

## 🔮 Future Enhancements

1. **FCM Implementation**: Add Firebase Admin SDK for mobile push notifications
2. **Redis Queue** (Optional): For multi-server deployment, replace in-memory with Redis
3. **Order Analytics**: Add aggregation endpoints for sales reports
4. **Webhook Support**: Allow external systems to subscribe to order events

---

## ✅ Testing Checklist

- [ ] Create order (customer)
- [ ] Upload receipt
- [ ] Approve order (manager/receptionist)
- [ ] Disapprove order
- [ ] Get next kitchen order
- [ ] Mark order ready (button press)
- [ ] Mark order received (customer)
- [ ] Cancel order (customer before approval)
- [ ] Cancel order (staff anytime)
- [ ] Order history filters
- [ ] Queue persistence (restart server)
- [ ] Long item timeout (wait 20s after approval)

---

## 🐛 Troubleshooting

**Queue not initializing?**
- Check MongoDB connection
- Verify orders have correct status (`preparing` or `approved`)

**Socket.io not working?**
- Check CORS settings in `server.js`
- Verify client is connecting to correct URL
- Check browser console for connection errors

**Background job not running?**
- Check server logs for "Starting kitchen timeout background job"
- Verify orders have `hasLongItems = true` and `timeoutAt` set

---

**Implementation Complete! 🎉**
