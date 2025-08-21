const { Queue } = require("bullmq");

const messageQueue = new Queue("sendReminder", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});

module.exports = messageQueue;
