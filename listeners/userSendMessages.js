import userEventEmitter from "../events/userEvents.js";
import logger from "../middlewares/loggerMiddleware.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export default function registerUserSendMessageListener() {
    userEventEmitter.on("userReceivedMessage", async({from, to }) => {
        const fromUser = await User.findById(from);
        const toUser = await User.findById(to);

        await Notification.create({
            from,
            to,
            type: "message",
            content: `New message from ${fromUser.username}`,
        });
        logger.info(`📩 You have a new message from ${fromUser.username}`);
    });
}