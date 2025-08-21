const express = require("express");
const router = express.Router();
const whatsappCredentialController = require("../controllers/whatsappCredentialController");

// 📌 Route to get all credentials
router.get("/credentials", whatsappCredentialController.getAllCredentials);

// 📌 Route to get credentials for a specific project
router.get(
  "/credentials/:projectName",
  whatsappCredentialController.getCredentialByProject
);

// 📌 Route to add a new credential
router.post("/credentials", whatsappCredentialController.addCredential);

// 📌 Route to update a credential
router.put("/credentials/:id", whatsappCredentialController.updateCredential);

// 📌 Route to delete a credential
router.delete(
  "/credentials/:id",
  whatsappCredentialController.deleteCredential
);

module.exports = router;
