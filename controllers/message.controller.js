import userEventEmitter from "../events/userEvents.js";
import logger from "../middlewares/loggerMiddleware.js";
import UserMessage from "../models/message.model.js";

export async function sendMessage(req, res) {
    const { receiverId, content } = req.body;

    try {
        // first, we need to know the id of the sender from the header token
        const senderId = req.user.id;
        // second we create the io instance
        const io = req.app.get("io");
        // third, we create the message in the database
        const message = await UserMessage.create({
            sender: senderId,
            receiver: receiverId,
            content,
        });
        // fourth, we emit the message to the receiver
        io.to(receiverId).emit("message", message);

        // fifth, we emit an event for notifications
        userEventEmitter.emit("userReceivedMessage", {
            from: senderId,
            to: receiverId,
            content,
            senderUsername: req.user.username,
        });
        // console.log(req.user);

        res.status(200).json({ message: "Message sent successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
        logger.error("Error sending message: %o", error);
    }
}

// get current user's messages, both sent and received. use senderId as user1 and receiverId as user2 from query params
export async function getUserMessages(req, res) {
    const { user1, user2 } = req.query;

    try {
        const messages = await UserMessage.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 },
            ],
        }).sort({ createdAt: -1 }).populate('sender receiver', 'username email');

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
        logger.error("Error fetching user messages: %o", error);
    }
}

export async function getMessages(req, res) {
   try {
       const userId = req.user.id;
       const messages = await UserMessage.find({
           $or: [{ sender: userId }, { receiver: userId }],
       }).sort({ createdAt: -1 });
       res.status(200).json(messages);
   } catch (error) {
       res.status(500).json({ message: "Server error" });
       logger.error("Error fetching messages: %o", error);
   }
};

export const getSingleMessage = async (req, res) => {
    const { id } = req.params;
    try {
        const message = await UserMessage.findById(id);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
        logger.error("Error fetching message: %o", error);
    }
}

export async function updateMessage(req, res) {
   const { id } = req.params;
   const { content } = req.body;
    try {
       const message = await UserMessage.findById(id);
       if (!message) {
           return res.status(404).json({ message: "Message not found" });
       }
       message.content = content;
       await message.save();
       res.status(200).json({ message: "Message updated successfully", data: message });
   } catch (error) {
       res.status(500).json({ message: "Server error" });
       logger.error("Error updating message: %o", error);
   }
}

export async function deleteMessage(req, res) {
   const { id } = req.params;
   try {
       const message = await UserMessage.findById(id);
       if (!message) {
           return res.status(404).json({ message: "Message not found" });
       }
      await UserMessage.findByIdAndDelete(message._id);
      
       res.status(200).json({ message: "Message deleted successfully" });
   } catch (error) {
       res.status(500).json({ message: "Server error" });
       logger.error("Error deleting message: %o", error);
   }
}