import express from "express";
import {
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser,
  activateUser,
  deactivateUser,
  getUserStats,
  exportUsers,
  getPublicKeyHandler,
} from "../controllers/userController.js";
import {
  authenticate,
  requireAdmin,
} from "../middleware/auth.js";
import { createAccountLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();
router.get("/me", authenticate, getCurrentUser);
router.get("/stats", authenticate, requireAdmin, getUserStats);
router.get("/export", authenticate, requireAdmin, exportUsers);
router.get("/public-key", authenticate, requireAdmin, getPublicKeyHandler);
router.post("/", createAccountLimiter, authenticate, requireAdmin, createUser);
router.put("/:id", authenticate, requireAdmin, updateUser);
router.patch("/:id/activate", authenticate, requireAdmin, activateUser);
router.patch("/:id/deactivate", authenticate, requireAdmin, deactivateUser);
router.delete("/:id", authenticate, requireAdmin, deleteUser);

export default router;
