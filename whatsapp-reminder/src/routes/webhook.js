const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

// Webhook Routes
router.get("/", webhookController.verifyWebhook); // Verification

// Combined handler for incoming webhooks
router.post("/", async (req, res) => {
  try {
    await webhookController.handleWebhookEvent(req);
    await webhookController.forwardWebhook(req);
    res.sendStatus(200); // ✅ only one response
  } catch (error) {
    res.sendStatus(500);
  }
});

module.exports = router;
