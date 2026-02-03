// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import { networkInterfaces } from "os";
import userRoutes from "./routes/userRoutes.js";
import cafeRoutes from "./routes/cafeRoutes.js";
import menuItemRoutes from "./routes/menuItemRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import { initializeQueues } from "./services/kitchenQueueManager.js";
import { initializeNotifications, registerUserForNotifications } from "./services/notificationService.js";
import { startKitchenTimeoutJob } from "./jobs/kitchenTimeoutJob.js";
import { verifyToken } from "./utils/authUtils.js";
import User from "./models/User.js";

const app = express();
const httpServer = createServer(app);
// CORS configuration for Socket.io
// If CORS_ORIGINS is set, use it; otherwise allow all (for hybrid dev/prod setup)
const socketCorsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : "*"; // Allow all - set CORS_ORIGINS env var to restrict in production

const io = new Server(httpServer, {
  cors: {
    origin: socketCorsOrigins === "*" ? "*" : socketCorsOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0"; // Listen on all network interfaces

// Get local IP address for display
const getLocalIP = () => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
};

const localIP = getLocalIP();

// Middleware - CORS configuration
// If CORS_ORIGINS is set, use it; otherwise allow all (for hybrid dev/prod setup)
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : "*"; // Allow all - set CORS_ORIGINS env var to restrict in production

app.use(cors({
  origin: corsOrigins === "*" ? "*" : corsOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smartcafe", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Routes
app.use("/api/users", userRoutes);
app.use("/api/cafes", cafeRoutes);
app.use("/api/menu-items", menuItemRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Handle user authentication and room joining (verify JWT, then register rooms)
  socket.on("authenticate", async (data) => {
    try {
      const token = socket.handshake?.auth?.token || data?.token;
      if (!token) {
        console.warn("Socket authenticate: no token");
        return;
      }
      const decoded = verifyToken(token);
      const userId = decoded.userId;
      const user = await User.findById(userId).populate("role").populate("cafes").select("-password");
      if (!user) {
        console.warn("Socket authenticate: user not found");
        return;
      }
      const userRole = user.role?.name;
      const cafeIds = (user.cafes || []).map((c) => c._id?.toString?.() || c);
      registerUserForNotifications(socket, userId, userRole, cafeIds);
      console.log(`✅ Socket authenticated: ${userId} (${userRole})`);
    } catch (error) {
      console.error("Socket authentication error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Initialize services after DB connection
mongoose.connection.once("open", async () => {
  console.log("✅ MongoDB connected - initializing services...");
  
  // Initialize kitchen queues from DB
  await initializeQueues();
  
  // Initialize notification service with Socket.io
  initializeNotifications(io);
  
  // Start background jobs
  startKitchenTimeoutJob();
  
  console.log("✅ All services initialized");
});

// Start server
httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`\n📍 Access your server from:`);
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://${localIP}:${PORT}`);
  console.log(`   External: http://<your-public-ip>:${PORT} (if port forwarded)`);
  console.log(`\n💡 To access from mobile device:`);
  console.log(`   1. Make sure your mobile device is on the same WiFi network`);
  console.log(`   2. Use: http://${localIP}:${PORT}`);
  console.log(`   3. Or configure port forwarding for external access\n`);
});
