// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import userRoutes from "./routes/userRoutes.js";
import cafeRoutes from "./routes/cafeRoutes.js";
import menuItemRoutes from "./routes/menuItemRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import { initializeQueues } from "./services/kitchenQueueManager.js";
import { initializeNotifications, registerUserForNotifications } from "./services/notificationService.js";
import { startKitchenTimeoutJob } from "./jobs/kitchenTimeoutJob.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Configure this based on your frontend URLs
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
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

  // Handle user authentication and room joining
  socket.on("authenticate", async (data) => {
    try {
      // In production, verify JWT token here
      const { userId, userRole, cafeIds } = data;
      
      if (userId) {
        registerUserForNotifications(socket, userId, userRole, cafeIds);
        console.log(`✅ Socket authenticated: ${userId} (${userRole})`);
      }
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
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
});
