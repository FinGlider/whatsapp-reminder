const Booking = require("../../models/Appointment/Booking");
const { getBookingsForUser } = require("./bookingService");
const axios = require("axios");
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

exports.handleCancelMessage = async (textBody, userWaId, userName) => {
  const number = parseInt(textBody.trim());

  // ❌ Not a valid number
  if (!number || isNaN(number)) {
    return await sendWhatsAppText(
      userWaId,
      "⚠️ Invalid input. Please reply with the *appointment number* you want to cancel, e.g., 1"
    );
  }

  const bookings = await getBookingsForUser(userWaId);
  const bookingToCancel = bookings[number - 1];

  // ❌ Number is out of range
  if (!bookingToCancel) {
    return await sendWhatsAppText(
      userWaId,
      `⚠️ Invalid appointment number. Please reply with a number between 1 and ${bookings.length}.`
    );
  }

  // ✅ Update booking status to 'cancelled'
  await Booking.update(
    { status: "cancelled" },
    { where: { id: bookingToCancel.id } }
  );

  return await sendWhatsAppText(
    userWaId,
    `✅ Appointment with *${bookingToCancel.DoctorSchedule?.Doctor?.name}* for *${bookingToCancel.Patient.name}* has been cancelled.`
  );
};
