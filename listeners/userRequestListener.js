import userEventEmitter from "../events/userEvents.js";
import logger from "../middlewares/loggerMiddleware.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

const registerUserRequestListeners = () => {

  userEventEmitter.on("userFriendRequest", async ({ from, to }) => {
    const fromUser = await User.findById(from);
    const toUser = await User.findById(to);

    if(!fromUser || !toUser) return;

    await Notification.create({
      from,
      to,
      type: "friend_request",
      content: `New friend request from ${fromUser.username}`,
    });
    logger.info(`📧 ${ fromUser.username } has sent you a friend request.`);
  });

  userEventEmitter.on("userAcceptedFriendRequest", async ({ from, to }) => {
    const fromUser = await User.findById(from);
    const toUser = await User.findById(to);

    if(!fromUser || !toUser) return;

    await Notification.create({
      from,
      to,
      type: "request_accepted",
      content: `Your friend request to ${toUser.username} has been accepted.`,
    });
    
    logger.info(`🤝 ${ toUser.username } has accepted your friend request.`);
  });
};

export default registerUserRequestListeners;