const WhatsAppCredential = require("../models/WhatsAppCredential");

// 📌 Get all WhatsApp credentials
exports.getAllCredentials = async (req, res) => {
  try {
    const credentials = await WhatsAppCredential.findAll();
    res.status(200).json(credentials);
  } catch (error) {
    res.status(500).json({ message: "Error fetching credentials", error });
  }
};

// 📌 Get credentials for a specific project
exports.getCredentialByProject = async (req, res) => {
  const { projectName } = req.params;
  try {
    const credential = await WhatsAppCredential.findOne({
      where: { projectName, status: "Active" },
    });

    if (!credential) {
      return res
        .status(404)
        .json({ message: "No active credentials found for this project." });
    }
    res.status(200).json(credential);
  } catch (error) {
    res.status(500).json({ message: "Error fetching credential", error });
  }
};

// 📌 Add a new credential
exports.addCredential = async (req, res) => {
  const { projectName, phoneNumberId, accessToken, status } = req.body;

  try {
    const newCredential = await WhatsAppCredential.create({
      projectName,
      phoneNumberId,
      accessToken,
      status,
    });

    res.status(201).json(newCredential);
  } catch (error) {
    console.error("Error adding credential:", error); // 🔴 Log the actual error
    res
      .status(500)
      .json({ message: "Error adding credential", error: error.message });
  }
};

// 📌 Update an existing credential
exports.updateCredential = async (req, res) => {
  const { id } = req.params;
  const { projectName, phoneNumberId, accessToken, status } = req.body;

  try {
    const credential = await WhatsAppCredential.findByPk(id);
    if (!credential) {
      return res.status(404).json({ message: "Credential not found" });
    }

    await credential.update({
      projectName,
      phoneNumberId,
      accessToken,
      status,
    });
    res.status(200).json(credential);
  } catch (error) {
    res.status(500).json({ message: "Error updating credential", error });
  }
};

// 📌 Delete a credential
exports.deleteCredential = async (req, res) => {
  const { id } = req.params;
  try {
    const credential = await WhatsAppCredential.findByPk(id);
    if (!credential) {
      return res.status(404).json({ message: "Credential not found" });
    }

    await credential.destroy();
    res.status(200).json({ message: "Credential deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting credential", error });
  }
};
