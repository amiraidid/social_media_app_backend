import express from "express";
import { acceptFriendRequest, cancelFriendRequest, createUser, declineFriendRequest, getAllUsers, getFriends, getUserProfile, loginUser, removeFriend, requestFriends, searchUsers, updateUser } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/auth/register", createUser);
router.post("/auth/login", loginUser);
router.get("/profile/:id", verifyToken, getUserProfile);
router.get("/users", verifyToken, getAllUsers);

router.post("/add-friend", verifyToken, requestFriends);
router.get("/friends/:userId", verifyToken, getFriends);
router.delete("/remove-friend", verifyToken, removeFriend);
router.put("/update/:id", verifyToken, updateUser);
router.put("/accept-friend-request", verifyToken, acceptFriendRequest);
router.get("/search", verifyToken, searchUsers);
router.post("/friends/decline", verifyToken, declineFriendRequest);
router.post("/friends/cancel", verifyToken, cancelFriendRequest);


export default router;