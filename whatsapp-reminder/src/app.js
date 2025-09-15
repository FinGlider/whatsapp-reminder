require("dotenv").config();
const express = require("express");
const worker = require("./workers/sentMessageWorker");
const sequelize = require("./config/db");
const { scheduleReminders } = require("./schedulers/scheduler");

const app = express();
app.use(express.json());

// Import and use routes
const otpRoutes = require("./routes/otpRoutes");

const whatsappCredentialRoutes = require("./routes/whatsappCredentialRoutes");

// Setup routes
app.use("/api", otpRoutes);

app.use("/api", whatsappCredentialRoutes);

app.get("/", (req, res) => {
  res.send("WhatsApp Reminder Service is running.");
});

// Start automatic scheduler
scheduleReminders();

const PORT = process.env.PORT || 3015;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
