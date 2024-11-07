// utils/db.js
const mongoose = require("mongoose");
const logger = require("./logger");

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
require("dotenv").config({ path: envFile });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info("MongoDB connected");
  } catch (error) {
    logger.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
