import logger from "../middlewares/loggerMiddleware.js";
import Notification from "../models/notification.model.js";


export async function getUserNotifications (req, res) {
    const userId = req.user.id;

    try {

        if (!userId) {
            return res.status(404).json("Please make login first.")
        }

        const notifications = await Notification.find({ to: userId })
        .populate("to", "-password").populate("from", "-password")
        .sort({ createdAt: -1 });

        if (!notifications) {
            return res.status(404).json("Notifications are empty.")
        }

        return res.status(200).json({ notifications })

    } catch (error) {
        logger.error(error.message || "Internal Server Error");
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
}

export async function updateNotificationStatus (req, res) {
    const { id } = req.params;

    try {
        const notification = await Notification.findById(id);
        if(!notification) {
            return res.status(404).json("Not found any Notifications")
        }

        const updateNotification = await Notification.findByIdAndUpdate(id, { seen: true }, { new: true });

        return res.status(200).json({ message: "Notification updated successfully", notification: updateNotification });

    } catch (error) {
        logger.error(error.message || "Internal Server Error");
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
}

export async function deleteNotification (req, res) {
    const { id } = req.params;

    try {
        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json("Not found any Notifications");
        }

        await Notification.findByIdAndDelete(id);
        return res.status(200).json({ message: "Notification deleted successfully" });

    } catch (error) {
        logger.error(error.message || "Internal Server Error");
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
}