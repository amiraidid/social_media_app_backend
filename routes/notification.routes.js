import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { deleteNotification, getUserNotifications, updateNotificationStatus } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/user-notifications", verifyToken, getUserNotifications);
router.put("/notifications/:id/seen", verifyToken, updateNotificationStatus);
router.delete("/notifications/:id", verifyToken, deleteNotification);

export default router;