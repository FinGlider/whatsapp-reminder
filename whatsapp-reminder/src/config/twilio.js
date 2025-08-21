require("dotenv").config(); // Load environment variables
const twilio = require("twilio");

// Fetch credentials from .env
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (phoneNumber, otpCode) => {
  try {
    await twilioClient.messages.create({
      body: `Your OTP is ${otpCode}`,
      from: process.env.TWILIO_PHONE_NUMBER, // Use env variable
      to: phoneNumber,
    });

    console.log(`OTP sent successfully to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error("Twilio SMS failed:", error.message);
    return false;
  }
};

module.exports = { sendSMS };
