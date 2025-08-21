
const { getNearbyRestaurants } = require("../src/helpers/locationHelpers");
const { sendImageWithCaption, sendTextMessage } = require("../src/services/demo");

const getDetails = async (decryptedBody) => {
  try {
    let { screen, action, data } = decryptedBody;

    if (!action && decryptedBody.messages?.[0]?.interactive?.type === "nfm_reply") {
      console.log("📥 Detected nfm_reply, setting action to 'complete'");
      action = "complete";
      data = decryptedBody.messages[0].interactive.nfm_reply;
    }

    console.log("📌 Action:", action);
    console.log("📌 Screen:", screen);
    console.log("📌 Data:", data);

    if (action === "ping") {
      return { data: { status: "active" } };
    }

    // Handle Restaurant Flow
    if (action === "complete" && screen === "RECOMMEND") {
      const location = data?.["location_name"];
      const userPhone = decryptedBody.contacts?.[0]?.wa_id;

      if (!location) {
        return {
          screen: "RECOMMEND",
          data: { error: "⚠️ Please enter a valid location to continue." },
        };
      }

      const restaurants = await getNearbyRestaurants(location);

      if (!restaurants.length) {
        await sendTextMessage(userPhone, `❌ No restaurants found near *${location}*.`);
        return { data: {} };
      }

      await sendTextMessage(userPhone, `🍽️ *Top Restaurants near ${location}:*`);

      for (const place of restaurants) {
        if (place.image) {
          await sendImageWithCaption(userPhone, place.image, place.caption);
        } else {
          await sendTextMessage(userPhone, place.caption);
        }
      }

      return { data: {} };
    }

    // Handle unknown actions/screens
    return { data: { error: "⚠️ Invalid screen or action." } };

  } catch (error) {
    console.error("❌ Error in getDetails:", error);
    return { data: { error: "⚠️ Internal server error." } };
  }
};

module.exports = { getDetails };
