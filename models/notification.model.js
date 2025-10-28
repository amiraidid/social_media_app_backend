import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["friend_request", "request_accepted", "message", "like"], required: true },
    content: { type: String, required: true },
    seen: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
