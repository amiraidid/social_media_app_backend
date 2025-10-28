import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import logger from "../middlewares/loggerMiddleware.js";
import userEventEmitter from "../events/userEvents.js";
import mongoose from "mongoose";

export const createUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const checkUser = await User.findOne({ email });
    if (checkUser) {
      logger.warn("User already exists: %o", email);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
    logger.error("Error creating user: %o", error);
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("User not found: %o", email);
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn("Invalid credentials for user: %o", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
    logger.error("Error logging in user: %o", error);
  }
};

export const getUserProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id)
      .select("-password")
      .populate("friends", "-password")
      .populate("requestedFriends", "username email")
      .populate("incomingRequests", "username email");

    if (!user) {
      logger.warn("User not found: %o", id);
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    logger.error("Error fetching user profile: %o", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

export const searchUsers = async (req, res) => {
  const { query } = req.query;
  try {
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("-password");

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    // do not show the current logged in user in search results
    const filteredUsers = users.filter(
      (user) => user._id.toString() !== req.user.id
    );

    res.status(200).json(filteredUsers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
    logger.error("Error searching users: %o", error);
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
    logger.error("Error fetching all users: %o", error);
  }
};

export const requestFriends = async (req, res) => {
  const { friendId } = req.body;
  const userId = req.user.id;
  const io = req.app.get("io");

  try {
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ message: "Invalid friend ID" });
    }

    if (friendId === userId) {
      return res
        .status(400)
        .json({ message: "You cannot send a friend request to yourself" });
    }

    const current_user = await User.findById(userId)
      .populate("friends", "-password")
      .populate("requestedFriends", "-password")
      .populate("incomingRequests", "-password");
    if (!current_user) {
      logger.error("User Not Found");
      return res.status(404).json("User Not Found!");
    }

    if (current_user.friends?.includes(friendId)) {
      logger.warn("You are already friends");
      return res.status(400).json("You are already friends");
    }

    const hasRequestedFriend = current_user.requestedFriends.find(
      (user) => user._id.toString() === friendId
    );

    if (hasRequestedFriend) {
      logger.warn("You have sent a friend request already");
      return res.status(400).json("You have sent a friend request already");
    }

    const hasIncomingFriendRequest = current_user.incomingRequests.find(
      (user) => user._id.toString() === friendId
    );

    if (hasIncomingFriendRequest) {
      logger.warn("You have a pending friend request from this user!");
      return res
        .status(400)
        .json("You have a pending friend request from this user!");
    }

    // if (current_user.)

    const friend = await User.findById(friendId);
    if (!friend) {
      logger.warn("Friend not found: %o", friendId);
      return res.status(404).json({ message: "Friend not found" });
    }

    // push directly to arrays (push returns new length, not the array)
    current_user.requestedFriends.push(friendId);
    friend.incomingRequests.push(userId);

    await current_user.save();
    await friend.save();

    // emit internal event and send a proper notification payload
    userEventEmitter.emit("userFriendRequest", {
      from: current_user._id,
      to: friend._id,
    });

    io.to(friendId).emit("notification", {
      type: "friend_request",
      from: {
        _id: current_user._id,
        username: current_user.username,
        email: current_user.email,
      },
    });

    return res.status(200).json({
      message: `You have successfully sent friend request to ${friend.username}`,
    });
  } catch (error) {
    logger.error(error.message || "Internal Server Error");
    return res.status(500).json(error.message || "Internal Server Error");
  }
};

export const acceptFriendRequest = async (req, res) => {
  const userId = req.user.id;
  const { requesterId } = req.body;
  const io = req.app.get("io");
  try {
    const current_user = await User.findById(userId)
      .populate("friends", "-password")
      .populate("incomingRequests", "-password");

    if (!current_user) {
      logger.error("The Current does not exists");
      return res.status(404).json("The Current does not exists");
    }

    const isAlreadyFriends = current_user.friends.find(
      (user) => user._id.toString() === requesterId
    );
    if (isAlreadyFriends) {
      current_user.incomingRequests = current_user.incomingRequests.filter(
        (user) => user._id === requesterId
      );
    }

    const requestExistence = current_user.incomingRequests.some(
      (user) => user?._id.toString() === requesterId
    );
    if (!requestExistence) {
      logger.error("The user was not found!");
      return res.status(404).json("The user was not found!");
    }

    const theRequester = await User.findById(requesterId).populate(
      "requestedFriends",
      "-password"
    );

    if (!theRequester) {
      logger.error("The Requester does not exists");
      return res.status(404).json("The Requester does not exists");
    }

    const incomingIndex = current_user.incomingRequests.findIndex(
      (user) => user._id.toString() === requesterId
    );
    if (incomingIndex > -1) {
      current_user.incomingRequests.splice(incomingIndex, 1);
    }

    const requestedIndex = theRequester.requestedFriends.findIndex(
      (user) => user._id.toString() === userId
    );
    if (requestedIndex > -1) {
      theRequester.requestedFriends.splice(requestedIndex, 1);
    }

    current_user.friends.push(theRequester._id);
    theRequester.friends.push(current_user._id);

    await current_user.save();
    await theRequester.save();

    userEventEmitter.emit("userAcceptedFriendRequest", {
      from: current_user._id,
      to: theRequester._id,
    });

    io.to(requesterId).emit("notification", {
      type: "request_accepted",
      from: {
        _id: current_user._id,
        username: current_user.username,
        email: current_user.email,
      },
    });

    return res.status(200).json("Successfully accepted");
  } catch (error) {
    logger.error(error.message || "Internal Server Error");
    return res.status(500).json(error.message || "Internal Server Error");
  }
};

export const cancelFriendRequest = async (req, res) => {
  const { friendId } = req.body;
  const userId = req.user.id;

  try {
    const current_user = await User.findById(userId)
      .populate("friends", "-password")
      .populate("requestedFriends", "-password");

    if (!current_user) {
      logger.error("The Current does not exists");
      return res.status(404).json("The Current does not exists");
    }

    const requestExistence = current_user.requestedFriends.some(
      (user) => user?._id.toString() === friendId
    );

    if (!requestExistence) {
      logger.error("The user was not found!");
      return res.status(404).json("The user was not found!");
    }

    const requestIndex = current_user.requestedFriends.findIndex(
      (user) => user._id.toString() === friendId
    );
    if (requestIndex > -1) {
      current_user.requestedFriends.splice(requestIndex, 1);
    }

    const friendRequest = await User.findById(friendId).populate(
      "incomingRequests",
      "-password"
    );

    if (!friendRequest) {
      logger.error("The friend was not found!");
      return res.status(404).json("The friend was not found!");
    }

    const friendIndex = friendRequest.incomingRequests.findIndex(
      (user) => user._id.toString() === userId
    );
    if (friendIndex > -1) {
      friendRequest.incomingRequests.splice(friendIndex, 1);
    }

    await friendRequest.save();
    await current_user.save();

    res
      .status(200)
      .json({ message: "You have successfully Canceled this friend Request." });
  } catch (error) {
    logger.error(error.message || "Internal server error");
    return res.status(500).json(error.message || "Internal server error");
  }
};

export const declineFriendRequest = async (req, res) => {
  const { friendId } = req.body;
  const userId = req.user.id;

  try {
    const current_user = await User.findById(userId)
      .populate("friends", "-password")
      .populate("incomingRequests", "-password");

    if (!current_user) {
      logger.error("The Current does not exists");
      return res.status(404).json("The Current does not exists");
    }

    const requestExistence = current_user.incomingRequests.some(
      (user) => user?._id.toString() === friendId
    );

    if (!requestExistence) {
      logger.error("The user was not found!");
      return res.status(404).json("The user was not found!");
    }

    const requestIndex = current_user.incomingRequests.findIndex(
      (user) => user._id.toString() === friendId
    );
    if (requestIndex > -1) {
      current_user.incomingRequests.splice(requestIndex, 1);
    }

    const friendRequest = await User.findById(friendId).populate(
      "requestedFriends",
      "-password"
    );

    if (!friendRequest) {
      logger.error("The friend was not found!");
      return res.status(404).json("The friend was not found!");
    }

    const friendIndex = friendRequest.requestedFriends.findIndex(
      (user) => user._id.toString() === userId
    );
    if (friendIndex > -1) {
      friendRequest.requestedFriends.splice(friendIndex, 1);
    }

    await friendRequest.save();
    await current_user.save();

    res
      .status(200)
      .json({ message: "You have successfully declined this friend Request." });
  } catch (error) {
    logger.error(error.message || "Internal server error");
    return res.status(500).json(error.message || "Internal server error");
  }
};

export const getFriends = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId).populate("friends", "-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user.friends);
  } catch (error) {
    logger.error("Error fetching friends: %o", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeFriend = async (req, res) => {
  const { friendId } = req.body;
  const userId = req.user.id;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.friends.pull(friendId);
    await user.save({ session });
    const friend = await User.findById(friendId).session(session);
    if (!friend) {
      return res.status(404).json({ message: "Friend not found" });
    }
    friend.friends.pull(userId);
    await friend.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    logger.error("Error removing friend: %o", error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, password } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.username = username || user.username;
    user.email = email || user.email;
    user.password = password || user.password;
    await user.save();
    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    logger.error("Error updating user: %o", error);
    res.status(500).json({ message: "Server error" });
  }
};
