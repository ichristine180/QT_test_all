import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

/**
 * Seed script to create initial admin user
 */
const seedAdmin = () => {
  try {
    console.log("Starting database seed...\n");
    const userCount = User.count();

    if (userCount > 0) {
      console.log(`Database already has ${userCount} user(s).`);
      console.log("Skipping seed. Delete the database file to reset.\n");
      return;
    }
    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    // Create admin user
    const admin = User.create({
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      status: "active",
    });
    console.log("\nAdmin user created successfully!");
    console.log("================================");
    console.log(`Email: ${admin.email}`);
  } catch (error) {
    console.error("Error seeding database:", error.message);
    process.exit(1);
  }
};

// Run seed
seedAdmin();
