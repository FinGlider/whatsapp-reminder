require("dotenv").config();
const axios = require("axios");
const { WhatsAppCredential } = require("../models"); // Import the model

const sendWhatsAppMessage = async (projectName, phoneNumber, otpCode) => {
  try {
    // 🔍 Fetch WhatsApp credentials from the database based on project name
    const credentials = await WhatsAppCredential.findOne({
      where: { projectName },
    });

    if (!credentials) {
      console.error(
        `No WhatsApp credentials found for project: ${projectName}`
      );
      return false;
    }

    const { phoneNumberId, accessToken } = credentials;

    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: "otp",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: `${otpCode}`, // Your OTP Code
                },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                {
                  type: "text",
                  text: `${otpCode}`, // Optional URL Button
                },
              ],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error(
      "WhatsApp API failed:",
      error.response?.data || error.message
    );
    return false;
  }
};

module.exports = { sendWhatsAppMessage };
