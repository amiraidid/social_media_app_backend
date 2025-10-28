import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";
import connectDB from "./config/db.js";
import userRoutes from "./routes/user.routes.js";
import messageRoutes from "./routes/message.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import registerUserRequestListeners from "./listeners/userRequestListener.js";
import registerUserSendMessageListener from "./listeners/userSendMessages.js";
import logger from "./middlewares/loggerMiddleware.js";
import cron from "node-cron";
import Notification from "./models/notification.model.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

app.use("/api/v1", userRoutes);
app.use("/api/v1", messageRoutes);
app.use("/api/v1", notificationRoutes);

app.use(errorHandler);

registerUserRequestListeners();
registerUserSendMessageListener();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Make io available in routes/controllers
app.set("io", io);

io.on("connection", (socket) => {
  // console.log("🟢 User connected:", socket.id);

  // allow client to join a room named after their user id
  socket.on("join", (userId) => {
    try {
      socket.join(userId);
      // console.log(`Socket ${socket.id} joined room ${userId}`);
    } catch (err) {
      console.error("Error joining room:", err);
    }
  });

  // handle incoming messages
  socket.on("message", (data) => {
    // Broadcast the message to the intended receiver (room by user id)
    if (data.receiverId) {
      io.to(data.receiverId).emit("receive_message", data);
    } else {
      logger.info("Receiver not connected:", data.receiverId);
    }
  });

  // handle notifications
  socket.on("notification", (data) => {
    if (data.userId) {
      io.to(data.userId).emit("receive_notification", data);
    } else {
      logger.info("User not connected:", data.userId);
    }
  });

  socket.on("disconnect", () => {
    logger.log("🔴 User disconnected:", socket.id);
  });
});

// delete notifications older than 7 days every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await Notification.deleteMany({ createdAt: { $lt: sevenDaysAgo } });
    console.log("🔔 Old notifications deleted successfully");
  } catch (error) {
    console.error("Error deleting old notifications:", error);
  }
});

server.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
