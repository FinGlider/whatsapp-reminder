const { OTP } = require("../models"); // Correct import
const { sendWhatsAppMessage } = require("../config/whatsapp");
const { sendSMS } = require("../config/twilio");

exports.sendOTP = async (req, res) => {
  try {
    const { projectName, phoneNumber, otpCode } = req.body;

    if (!projectName || !phoneNumber || !otpCode) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const success = await sendWhatsAppMessage(
      projectName,
      phoneNumber,
      otpCode
    );

    if (success) {
      return res
        .status(200)
        .json({ message: "WhatsApp OTP sent successfully!" });
    } else {
      return res.status(500).json({ message: "Failed to send WhatsApp OTP" });
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.generateOTP = async (req, res) => {
  const { phoneNumber } = req.body;
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Expires in 5 minutes

  try {
    await OTP.create({ phoneNumber, otpCode, expiresAt, isUsed: false });

    // Send OTP via WhatsApp
    const whatsappSent = await sendWhatsAppMessage(phoneNumber, otpCode);

    if (whatsappSent) {
      return res.json({ message: "OTP sent via WhatsApp" });
    } else {
      // If WhatsApp fails, send OTP via SMS
      await sendSMS(phoneNumber, otpCode);
      return res.json({ message: "OTP sent via SMS (fallback)" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error generating OTP" });
  }
};

exports.verifyOTP = async (req, res) => {
  const { phoneNumber, otpCode } = req.body;

  const otpEntry = await OTP.findOne({
    where: { phoneNumber, otpCode, isUsed: false },
  });

  if (!otpEntry) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (new Date() > otpEntry.expiresAt) {
    return res.status(400).json({ message: "OTP expired" });
  }

  // Mark OTP as used
  await OTP.update({ isUsed: true }, { where: { id: otpEntry.id } });

  res.json({ message: "OTP verified successfully" });
};
