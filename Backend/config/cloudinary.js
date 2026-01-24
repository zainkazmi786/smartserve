import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

const config = {
  cloud_name: process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

// Validate configuration - check for empty strings too
const missingConfig = [];
if (!config.cloud_name || config.cloud_name.trim() === "") {
  missingConfig.push("CLOUDINARY_NAME (or CLOUDINARY_CLOUD_NAME)");
}
if (!config.api_key || config.api_key.trim() === "") {
  missingConfig.push("CLOUDINARY_API_KEY");
}
if (!config.api_secret || config.api_secret.trim() === "") {
  missingConfig.push("CLOUDINARY_API_SECRET");
}

if (missingConfig.length > 0) {
  console.error("❌ Cloudinary configuration missing:");
  missingConfig.forEach(key => console.error(`   - ${key}`));
  console.error("Please set these environment variables in your .env file");
  console.error("Image uploads will fail until Cloudinary is properly configured.");
  
  // Debug: Show what was found (without revealing secrets)
  console.debug("Current env values:");
  console.debug(`  CLOUDINARY_NAME: ${process.env.CLOUDINARY_NAME ? '***set***' : 'NOT SET'}`);
  console.debug(`  CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? '***set***' : 'NOT SET'}`);
  console.debug(`  CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? '***set***' : 'NOT SET'}`);
  console.debug(`  CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? '***set***' : 'NOT SET'}`);
} else {
  console.log("✅ Cloudinary configured successfully");
}

cloudinary.config(config);

export default cloudinary;
