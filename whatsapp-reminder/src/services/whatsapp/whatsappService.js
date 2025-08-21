require("dotenv").config();
const axios = require("axios");
const { saveUserDetails } = require("../userService");
const { sendWelcomeWithFlow } = require("../demo");
const {
  sendAppointmentReplyButton,
  sendAppointmentFlow,
} = require("./messageService");
const { handleFormSubmission } = require("./formHandler");
const { getUserDetails } = require("../../utils/userHelper");
const { getBookingsForUser } = require("./bookingService");
const { handleCancelMessage } = require("./cancelHandler");

const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;
const WHATSAPP_ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const sendWhatsAppText = async (to, text) => {
  await axios.post(
    WHATSAPP_API_URL,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
};

exports.processMessage = async (body) => {
  const { userName, userWaId } = getUserDetails(body);
  const messageEvent = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!messageEvent) return;

  // 🧾 Form submission
  if (messageEvent?.interactive?.type === "nfm_reply") {
    return await handleFormSubmission(messageEvent, body);
  }

  const textBody = messageEvent?.text?.body?.trim().toLowerCase();

  // 👋 Welcome message
  if (textBody === "h@@!") {
    const user = await saveUserDetails({ waId: userWaId, name: userName });
    await sendAppointmentReplyButton(messageEvent.from, userName);
    return;
  }

  // 🚪 Flow welcome message
  if (textBody === "hel@!") {
    await sendWelcomeWithFlow(messageEvent.from);
    return;
  }

  // 🔄 Ignore navigation events
  if (messageEvent?.interactive?.type === "navigate") {
    console.log("🔄 Ignoring navigation event...");
    return;
  }

  // 📅 Booking flow
  if (messageEvent?.interactive?.button_reply?.id === "book-appointment") {
    await sendAppointmentFlow(messageEvent.from, userWaId);
    return;
  }

  // ❌ Cancel appointment - Show list
  if (messageEvent?.interactive?.button_reply?.id === "cancel-appointment") {
    const bookings = await getBookingsForUser(userWaId);
    if (!bookings.length) {
      await sendWhatsAppText(
        messageEvent.from,
        "❌ You have no active bookings to cancel."
      );
      return;
    }

    let message = `📋 Here are your active appointments:\n\n`;
    bookings.forEach((b, index) => {
      const date = new Date(b.bookingDate).toLocaleDateString("en-IN");
      const start = b.startTime;
      const end = b.endTime;
      const doctor = b.DoctorSchedule?.Doctor;
      const department = doctor?.Department;

      message += `*${index + 1}. ${b.Patient.name}* with *${doctor?.name}* (${
        department?.name
      }) on *${date}* at *${start} - ${end}*.\nToken: *${
        b.tokenNumber || "N/A"
      }*\n\n`;
    });

    message += `Reply with the *appointment number* to cancel, e.g. "2".`;
    await sendWhatsAppText(messageEvent.from, message);
    return;
  }

  if (/^\d+$/.test(textBody)) {
    return await handleCancelMessage(textBody, userWaId, userName);
  }
};
