const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bodyParser = require("body-parser");
require("dotenv").config();
const setupAssociations = require("./models/Appointment/association");
const worker = require("./workers/sentMessageWorker");
const sequelize = require("./config/db");
const User = require("./models/Appointment/user");
const otpRoutes = require("./routes/otpRoutes");

const departmentRoutes = require("./routes/Appointment/departmentRoutes");
// const doctorRoutes = require("./routes/Appointment/doctorRoutes");
const whatsappCredentialRoutes = require("./routes/whatsappCredentialRoutes");
const webhookRoutes = require("./routes/webhook");
const { scheduleReminders } = require("./schedulers/scheduler"); // Import the scheduler
const {
  decryptRequest,
  encryptResponse,
  FlowEndpointException,
} = require("./encryption");
const { getNextScreen } = require("./flow");
const { getDetails } = require("./demo_flow");

const app = express();
setupAssociations();
app.use(
  express.json({
    // store the raw request body to use it for signature verification
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf?.toString(encoding || "utf8");
    },
  })
);

const { APP_SECRET, PRIVATE_KEY, PASSPHRASE = "" } = process.env;

app.post("/", async (req, res) => {
  try {
    if (!isRequestSignatureValid(req)) {
      return res.status(432).send();
    }

    const decryptedRequest = decryptRequest(req.body, PRIVATE_KEY, PASSPHRASE);
    const { aesKeyBuffer, initialVectorBuffer, decryptedBody } =
      decryptedRequest;

    // 🔍 Debug log to inspect decrypted payload
    console.log(
      "🔎 Decrypted body structure:",
      JSON.stringify(decryptedBody, null, 2)
    );

    // ✅ Extract waId from known possible locations
    const waId =
      decryptedBody?.data?.userWaId || // ✅ Add this line
      decryptedBody?.user_wa_id ||
      decryptedBody?.userWaId ||
      decryptedBody?.user?.waId ||
      decryptedBody?.context?.userWaId ||
      null;

    console.log("📨 Incoming user waId:", waId);

    // ✅ Resolve userId if waId found
    let userId = null;
    if (waId) {
      const user = await User.findOne({ where: { waId } });
      userId = user?.id || null;
      if (userId) {
        console.log("✅ Resolved userId:", userId);
      } else {
        console.warn("⚠️ No user found for this waId.");
      }
    } else {
      console.warn("⚠️ waId not found in decryptedBody.");
    }

    const screenResponse = await getNextScreen(decryptedBody);

    // ✅ Inject user info into screen response if available
    if (!screenResponse.data) {
      screenResponse.data = {};
    }

    if (userId) screenResponse.data.userId = userId;
    if (waId) screenResponse.data.userWaId = waId;

    // 🔐 Send encrypted response back
    res.send(
      encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer)
    );
  } catch (err) {
    console.error("❌ Error in POST handler:", err);
    res.status(500).send();
  }
});

app.use("/webhook", webhookRoutes);

scheduleReminders();
app.use("/whatsapp", whatsappCredentialRoutes);
app.use("/otp", otpRoutes);

// Appointment routes
// ------------------
app.use(bodyParser.json());
// app.use(
//   "/uploads",
//   express.static(path.join(__dirname, "middleware", "uploads"))
// );
app.use("/appointment", departmentRoutes);
// app.use("/doctors", doctorRoutes);

sequelize.sync().then(() => {
  console.log("Database connected");
  app.listen(3015, () => console.log("Server running on port 3015"));
});

// function
function isRequestSignatureValid(req) {
  if (!APP_SECRET) {
    console.warn(
      "App Secret is not set up. Please Add your app secret in /.env file to check for request validation"
    );
    return true;
  }

  const signatureHeader = req.get("x-hub-signature-256");
  const signatureBuffer = Buffer.from(
    signatureHeader.replace("sha256=", ""),
    "utf-8"
  );

  const hmac = crypto.createHmac("sha256", APP_SECRET);
  const digestString = hmac.update(req.rawBody).digest("hex");
  const digestBuffer = Buffer.from(digestString, "utf-8");

  if (!crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.error("Error: Request Signature did not match");
    return false;
  }
  return true;
}
