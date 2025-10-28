import mongoose from "mongoose";
import logger from "../middlewares/loggerMiddleware.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error("MongoDB connection error: %o", error);
    process.exit(1);
  }
};

export default connectDB;
