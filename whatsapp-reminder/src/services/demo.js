require("dotenv").config();
const axios = require("axios");
const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;
const WHATSAPP_ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const { getNearbyRestaurants } = require("../helpers/locationHelpers");


// Send image with caption to WhatsApp user
async function sendImageWithCaption(to, imageUrl, caption) {
  const message = {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: {
      link: imageUrl,
      caption,
    },
  };

  try {
    const res = await axios.post(WHATSAPP_API_URL, message, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    console.log("✅ Image sent:", res.data);
  } catch (err) {
    console.error("❌ Image send error:", err.response?.data || err.message);
  }
}

// Send plain text if no image
async function sendTextMessage(to, text) {
  const message = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  try {
    const res = await axios.post(WHATSAPP_API_URL, message, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    console.log("✅ Text sent:", res.data);
  } catch (err) {
    console.error("❌ Text send error:", err.response?.data || err.message);
  }
}

// Handle WhatsApp flow submission for restaurant search
async function handleLocationFlowSubmission(formData, userWaId) {
  const locationName = formData?.["location_name"];

  if (!locationName) {
    await sendTextMessage(userWaId, "⚠️ Please enter a valid location to proceed.");
    return;
  }

  try {
    const restaurants = await getNearbyRestaurants(locationName);

    if (!restaurants.length) {
      await sendTextMessage(userWaId, `❌ No restaurants found near *${locationName}*.`);
      return;
    }

    await sendTextMessage(userWaId, `🍽️ *Top Restaurants near ${locationName}:*`);

    for (const place of restaurants) {
      if (place.image) {
        await sendImageWithCaption(userWaId, place.image, place.caption);
      } else {
        await sendTextMessage(userWaId, place.caption);
      }
    }
    
  } catch (error) {
    console.error("❌ Error in location flow:", error);
    await sendTextMessage(userWaId, "⚠️ Could not fetch restaurants. Please try again later.");
  }
}



async function sendWelcomeWithFlow(phoneNumber) {
  const welcomeMessage = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneNumber,
    type: "interactive",
    interactive: {
      type: "flow",
      body: {
        text: "👋 *Welcome to Resway!*\n\nTell us where you're going, and we’ll recommend top spots nearby!\n\nTap *Explore* to begin.",
      },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_token: "FLOW_TOKEN", // Replace with your token
          flow_id: "2703159433208131",               // If using hosted flow
          flow_cta: "Explore",
          flow_action: "navigate",
          flow_action_payload: {
            screen: "RECOMMEND"
          }
        }
      }
    }
  };

  try {
    const response = await axios.post(WHATSAPP_API_URL, welcomeMessage, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    console.log("✅ Welcome message sent:", response.data);
  } catch (error) {
    console.error(
      "❌ Error sending welcome message:",
      error.response?.data || error.message
    );
  }
}
module.exports = {handleLocationFlowSubmission,sendTextMessage,sendImageWithCaption, sendWelcomeWithFlow };