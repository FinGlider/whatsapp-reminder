require("dotenv").config();
const axios = require("axios");

const phoneNumberId = process.env.PHONE_NUMBER_ID; // From .env
const accessToken = process.env.ACCESS_TOKEN; // From .env

const sendWhatsAppMessage = async (
  phoneNumber,
  templateName,
  templateComponents = []
) => {
  const messageData = {
    messaging_product: "whatsapp",
    to: phoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en_US" },
      components: templateComponents,
    },
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, // Ensure correct API version
      messageData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log(`✅ Message sent to ${phoneNumber}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(
      `❌ Error sending message to ${phoneNumber}:`,
      error.response?.data?.error || error.message
    );
    throw new Error(`Failed to send message to ${phoneNumber}`);
  }
};

module.exports = sendWhatsAppMessage;
