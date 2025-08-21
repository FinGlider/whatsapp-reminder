require("dotenv").config();
const { processMessage } = require("../services/whatsapp/whatsappService");
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const axios = require("axios");
const User = require("../models/Appointment/user");

// ✅ Webhook Verification (GET)
exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ WEBHOOK VERIFIED SUCCESSFULLY!");
    return res.status(200).send(challenge);
  }

  console.log("❌ WEBHOOK VERIFICATION FAILED!");
  res.sendStatus(403);
};

// ✅ Webhook Listener (POST) - Handles Incoming Messages

exports.handleWebhookEvent = async (req) => {
  try {
    console.log(
      "📩 Received Webhook Event:",
      JSON.stringify(req.body, null, 2)
    );

    const body = req.body;
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const flowToken =
      value?.messages?.[0]?.context?.flow_token || value?.flow_token || null;

    const contact = value?.contacts?.[0];
    const userWaId = contact?.wa_id;

    if (userWaId && flowToken) {
      const user = await User.findOne({ where: { waId: userWaId } });
      if (user) {
        setFlowUser(flowToken, user.id);
        console.log(`✅ Linked flowToken ${flowToken} to userId ${user.id}`);
      } else {
        console.warn(`⚠️ User not found for waId ${userWaId}`);
      }
    }

    await processMessage(body); // Your main logic
  } catch (error) {
    console.error("❌ Error handling webhook event:", error.message);
    throw error;
  }
};

exports.forwardWebhook = async (req) => {
  try {
    await axios.post(
      "https://wapromoapi.finglider.com/whatsapp-webhook",
      req.body
    );
    console.log("✅ Webhook forwarded to new project");
  } catch (error) {
    console.error("❌ Failed to forward webhook:", error.message);
    throw error;
  }
};
