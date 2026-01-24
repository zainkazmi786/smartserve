import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Cafe from "../models/Cafe.js";
import { hashPassword } from "../utils/passwordUtils.js";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smartcafe";

/**
 * Seed script to create initial data:
 * - Roles (superadmin, manager, receptionist, customer)
 * - Super Admin user
 * - One Cafe
 * - One Manager user
 */
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Role.deleteMany({});
    await Cafe.deleteMany({});
    console.log("✓ Cleared existing data\n");

    // ============ CREATE ROLES ============
    console.log("Creating roles...");

    const roles = [
      {
        name: "superadmin",
        description: "Platform-level administrator with full access",
        permissions: [
          { resource: "users", actions: ["create", "read", "update", "delete", "manage"] },
          { resource: "cafes", actions: ["create", "read", "update", "delete", "manage"] },
          { resource: "menus", actions: ["create", "read", "update", "delete", "manage"] },
          { resource: "menuItems", actions: ["create", "read", "update", "delete", "manage"] },
          { resource: "orders", actions: ["create", "read", "update", "delete", "approve", "manage"] },
          { resource: "reviews", actions: ["create", "read", "update", "delete", "manage"] },
          { resource: "roles", actions: ["create", "read", "update", "delete", "manage"] },
          { resource: "settings", actions: ["create", "read", "update", "delete", "manage"] },
        ],
        isActive: true,
      },
      {
        name: "manager",
        description: "Full control of assigned cafe",
        permissions: [
          { resource: "users", actions: ["create", "read", "update", "delete", "manage"] },
          { resource: "cafes", actions: ["read", "update"] },
          { resource: "menus", actions: ["create", "read", "update", "delete", "manage"] },
          { resource: "menuItems", actions: ["create", "read", "update", "delete", "manage"] },
          { resource: "orders", actions: ["create", "read", "update", "delete", "approve", "manage"] },
          { resource: "reviews", actions: ["read", "update", "manage"] },
          { resource: "settings", actions: ["read", "update"] },
        ],
        isActive: true,
      },
      {
        name: "receptionist",
        description: "Order approval and menu control",
        permissions: [
          { resource: "menus", actions: ["read", "update"] },
          { resource: "menuItems", actions: ["read", "update"] },
          { resource: "orders", actions: ["read", "update", "approve", "manage"] },
          { resource: "reviews", actions: ["read", "update"] },
        ],
        isActive: true,
      },
      {
        name: "customer",
        description: "Mobile app end user",
        permissions: [
          { resource: "menus", actions: ["read"] },
          { resource: "menuItems", actions: ["read"] },
          { resource: "orders", actions: ["create", "read", "update"] },
          { resource: "reviews", actions: ["create", "read"] },
        ],
        isActive: true,
      },
    ];

    const createdRoles = await Role.insertMany(roles);
    console.log("✓ Created roles:", createdRoles.map(r => r.name).join(", "));
    console.log("");

    // Find role references
    const superAdminRole = createdRoles.find(r => r.name === "superadmin");
    const managerRole = createdRoles.find(r => r.name === "manager");

    // ============ CREATE SUPER ADMIN USER ============
    console.log("Creating super admin user...");
    const superAdminPassword = await hashPassword("SuperAdmin@123");
    
    const superAdmin = new User({
      name: "Super Admin",
      email: "superadmin@smartcafe.com",
      phone: "+1234567890",
      password: superAdminPassword,
      role: superAdminRole._id,
      cafes: [],
      status: "active",
    });

    await superAdmin.save();
    console.log("✓ Created super admin user");
    console.log("  Email: superadmin@smartcafe.com");
    console.log("  Password: SuperAdmin@123");
    console.log("");

    // ============ CREATE MANAGER USER ============
    console.log("Creating manager user...");
    const managerPassword = await hashPassword("Manager@123");
    
    const manager = new User({
      name: "Cafe Manager",
      email: "manager@smartcafe.com",
      phone: "+1234567891",
      password: managerPassword,
      role: managerRole._id,
      cafes: [], // Will be updated after cafe creation
      status: "active",
    });

    await manager.save();
    console.log("✓ Created manager user");
    console.log("  Email: manager@smartcafe.com");
    console.log("  Password: Manager@123");
    console.log("");

    // ============ CREATE CAFE ============
    console.log("Creating cafe...");
    const cafe = new Cafe({
      name: "PAFIAST - STC",
      email: "zainkazmi258@gmail.com",
      phone: "+923354055473",
      linkedManager: manager._id,
      settings: {
        taxPercentage: 0, // 5% tax
      },
    });

    await cafe.save();
    console.log("✓ Created cafe:", cafe.name);
    console.log("");

    // ============ UPDATE MANAGER WITH CAFE ============
    console.log("Linking manager to cafe...");
    manager.cafes.push(cafe._id);
    await manager.save();
    console.log("✓ Manager linked to cafe");
    console.log("");

    // ============ SUMMARY ============
    console.log("========== SEED COMPLETE ==========");
    console.log("\nCreated:");
    console.log(`  - ${createdRoles.length} roles`);
    console.log("  - 1 Super Admin user");
    console.log("  - 1 Manager user");
    console.log("  - 1 Cafe");
    console.log("\nLogin Credentials:");
    console.log("  Super Admin:");
    console.log("    Email: superadmin@smartcafe.com");
    console.log("    Password: SuperAdmin@123");
    console.log("\n  Manager:");
    console.log("    Email: manager@smartcafe.com");
    console.log("    Password: Manager@123");
    console.log("\n===================================\n");

    // Close connection
    await mongoose.connection.close();
    console.log("Database connection closed");
    process.exit(0);

  } catch (error) {
    console.error("Error seeding database:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed script
seedDatabase();
