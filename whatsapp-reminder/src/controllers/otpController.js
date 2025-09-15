const { sendWhatsAppMessage } = require("../config/whatsapp");

exports.sendOTP = async (req, res) => {
  try {
    const { phoneNumberId, accessToken, phoneNumber, otpCode } = req.body;

    if (!phoneNumberId || !accessToken || !phoneNumber || !otpCode) {
      return res.status(400).json({
        message:
          "Missing required fields: phoneNumberId, accessToken, phoneNumber and otpCode are required",
      });
    }

    const success = await sendWhatsAppMessage(
      phoneNumberId,
      accessToken,
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
