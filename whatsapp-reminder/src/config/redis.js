// config/redis.js
const { Redis } = require("ioredis");
require("dotenv").config();

const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
};

const redis = new Redis(redisOptions);

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

redis.on("connect", () => {
  console.log("✅ Redis connected successfully.");
});

module.exports = redisOptions; // Export as an options object, NOT the Redis instance
