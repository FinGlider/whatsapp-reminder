const { Worker } = require("bullmq");
const sendWhatsAppMessage = require("../services/templateMsg");

// Create a worker to process jobs from the queue
const worker = new Worker(
  "sendReminder",
  async (job) => {
    const { phoneNumber, templateName, templateComponents } = job.data;

    console.log(
      `📩 Processing job: Sending WhatsApp reminder to ${phoneNumber} using template: ${templateName}`
    );

    try {
      const response = await sendWhatsAppMessage(
        phoneNumber,
        templateName,
        templateComponents
      );

      // Log the API response for debugging
      console.log("📩 WhatsApp API Response:", response);

      if (!response || response.error) {
        throw new Error(
          `Failed to send WhatsApp message to ${phoneNumber}: ${
            response?.error?.message || "Unknown error"
          }`
        );
      }

      console.log(`✅ Reminder successfully sent to ${phoneNumber}`);
    } catch (error) {
      console.error(
        `❌ Error sending WhatsApp message to ${phoneNumber}:`,
        error.message
      );
      throw new Error(`Failed to send WhatsApp message to ${phoneNumber}`);
    }
  },
  {
    connection: {
      host: "localhost",
      port: 6379, // Ensure Redis is running on this port
    },
  }
);

// Event listeners for job status
worker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

console.log("🚀 WhatsApp Reminder Worker is running...");
module.exports = worker;
