import User from "../models/User.js";
import protobuf from "protobufjs";
import path from "path";
import { fileURLToPath } from "url";
import { hashAndSignEmail, getPublicKey } from "../utils/crypto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object|null} - Error object or null if valid
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      status: 400,
      error: "Validation error",
      message: "Invalid email format",
    };
  }
  return null;
};

/**
 * Validate role
 * @param {string} role - Role to validate
 * @returns {Object|null} - Error object or null if valid
 */
const validateRole = (role) => {
  if (!["admin", "user"].includes(role)) {
    return {
      status: 400,
      error: "Validation error",
      message: 'Role must be either "admin" or "user"',
    };
  }
  return null;
};

/**
 * Check if user exists
 * @param {number} id - User ID
 * @param {Object} res - Response object
 * @returns {Object|null} - User object or null (sends 404 response)
 */
const checkUserExists = (id, res) => {
  const user = User.findById(id);
  if (!user) {
    res.status(404).json({
      error: "Not found",
      message: "User not found",
    });
    return null;
  }
  return user;
};


/**
 * Create new user
 */
export const createUser = (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Validation error",
        message: "Email and password are required",
      });
    }

    // Email validation
    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(emailError.status).json({
        error: emailError.error,
        message: emailError.message,
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        error: "Validation error",
        message: "Password must be at least 6 characters long",
      });
    }

    // Role validation
    if (role) {
      const roleError = validateRole(role);
      if (roleError) {
        return res.status(roleError.status).json({
          error: roleError.error,
          message: roleError.message,
        });
      }
    }
    // Hash and sign the email using SHA-384 and ECDSA
    const { hash: emailHash, signature: emailSignature } = hashAndSignEmail(email);

    const user = User.create({
      email,
      password,
      role,
      emailHash,
      emailSignature
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    console.error("Create user error:", error);
    if (error.message === "Email already exists") {
      return res.status(409).json({
        error: "Conflict",
        message: error.message,
      });
    }
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to create user",
    });
  }
};

/**
 * Update user - Admin only, can only update email or role
 */
export const updateUser = (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;
    // Check if user exists
    const existingUser = checkUserExists(parseInt(id), res);
    if (!existingUser) return;

    // Email validation
    if (email) {
      const emailError = validateEmail(email);
      if (emailError) {
        return res.status(emailError.status).json({
          error: emailError.error,
          message: emailError.message,
        });
      }
    }

    // Role validation
    if (role) {
      const roleError = validateRole(role);
      if (roleError) {
        return res.status(roleError.status).json({
          error: roleError.error,
          message: roleError.message,
        });
      }
    }
    const updates = {};
    if (email !== undefined) {
      updates.email = email;
      // Re-hash and re-sign the new email
      const { hash: emailHash, signature: emailSignature } = hashAndSignEmail(email);
      updates.emailHash = emailHash;
      updates.emailSignature = emailSignature;
    }
    if (role !== undefined) updates.role = role;

    // Check if there are any updates to apply
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message:
          "No valid fields to update. Only email and role can be updated.",
      });
    }

    const updatedUser = User.update(parseInt(id), updates);

    res.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);

    if (error.message === "Email already exists") {
      return res.status(409).json({
        error: "Conflict",
        message: error.message,
      });
    }

    res.status(500).json({
      error: "Internal server error",
      message: "Failed to update user",
    });
  }
};

/**
 * Activate user - Admin only
 */
export const activateUser = (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = checkUserExists(parseInt(id), res);
    if (!existingUser) return;

    // Check if user is already active
    if (existingUser.status === "active") {
      return res.status(400).json({
        error: "Bad request",
        message: "User is already active",
      });
    }

    const updatedUser = User.update(parseInt(id), { status: "active" });

    res.json({
      success: true,
      message: "User activated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to activate user",
    });
  }
};

/**
 * Deactivate user - Admin only
 */
export const deactivateUser = (req, res) => {
  try {
    const { id } = req.params;
    // Check if user exists
    const existingUser = checkUserExists(parseInt(id), res);
    if (!existingUser) return;

    // Check if user is already inactive
    if (existingUser.status === "inactive") {
      return res.status(400).json({
        error: "Bad request",
        message: "User is already inactive",
      });
    }
    const updatedUser = User.update(parseInt(id), { status: "inactive" });

    res.json({
      success: true,
      message: "User deactivated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to deactivate user",
    });
  }
};

/**
 * Delete user
 */
export const deleteUser = (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Check if user exists
    const user = checkUserExists(userId, res);
    if (!user) return;

    const deleted = User.delete(userId);

    if (deleted) {
      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } else {
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete user",
      });
    }
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete user",
    });
  }
};

/**
 * Get current authenticated user info
 */
export const getCurrentUser = (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
};

export const getUserStats = (req, res) => {
  try {
    // Get stats for last 7 days
    const stats = User.getCreationStats(7);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve user statistics",
    });
  }
};

/**
 * Export all users in protobuf format
 */
export const exportUsers = async (req, res) => {
  try {
    const protoPath = path.join(__dirname, "../proto/user.proto");
    const root = await protobuf.load(protoPath);
    const UserList = root.lookupType("user.UserList");
    const { status, role } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (role) filters.role = role;

    const users = User.findAll(filters);
    const nonLoggedInUsers = users.filter((user) => user.id !== req.user.id);
    const payload = {
      users: nonLoggedInUsers.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        emailHash: user.emailHash || '',
        emailSignature: user.emailSignature || '',
      })),
      count: nonLoggedInUsers.length,
    };
    const errMsg = UserList.verify(payload);
    if (errMsg) {
      throw new Error(errMsg);
    }
    const message = UserList.create(payload);
    const buffer = UserList.encode(message).finish();
    res.set({
      "Content-Type": "application/x-protobuf",
      "Content-Length": buffer.length,
      "Content-Disposition": 'attachment; filename="users.pb"',
    });
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Export users error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to export users",
    });
  }
};

/**
 * Get public key for signature verification
 */
export const getPublicKeyHandler = (req, res) => {
  try {
    const publicKey = getPublicKey();
    res.json({
      success: true,
      publicKey,
    });
  } catch (error) {
    console.error("Get public key error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve public key",
    });
  }
};
