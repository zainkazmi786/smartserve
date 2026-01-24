import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Generate JWT token for user authentication
 * @param {string} userId - User ID to encode in token
 * @param {string|null} activeCafeId - Active cafe ID (optional)
 * @returns {string} JWT token
 */
export const generateToken = (userId, activeCafeId = null) => {
  return jwt.sign({ userId, activeCafeId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
