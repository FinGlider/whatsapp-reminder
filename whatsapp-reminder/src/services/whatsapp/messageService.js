// services/messageSender.js
require("dotenv").config();
const axios = require("axios");
const Department = require("../../models/Appointment/department");
const User = require("../../models/Appointment/user");
const { setFlowSession } = require("../../utils/flowSessionStore");

const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;
const WHATSAPP_ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "text",
      text: { body: message },
    };

    const response = await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ WhatsApp Message Sent:", response.data);
  } catch (error) {
    console.error(
      "❌ Error sending WhatsApp message:",
      error.response?.data || error.message
    );
  }
};

const sendAppointmentFlow = async (phoneNumber, userWaId) => {
  try {
    const user = await User.findOne({ where: { waId: userWaId } });
    const userId = user?.id;
    const departments = await Department.findAll({
      attributes: ["id", "name"],
    });
    const todayDate = new Date().toISOString().split("T")[0];

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "interactive",
      interactive: {
        type: "flow",
        body: {
          text: "Welcome to our appointment booking service!",
        },
        footer: {
          text: "We are here to help you schedule your appointment.",
        },
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_token: "FLOW_BOOKING_TOKEN",
            flow_id: "1611706266896358",
            flow_cta: "Book An Appointment",
            flow_action: "navigate",
            flow_action_payload: {
              screen: "APPOINTMENT",
              data: {
                userId,
                userWaId,
                is_doctor_enabled: false,
                department_list: departments.map((dept) => ({
                  id: `${dept.id}`,
                  title: dept.name,
                })),
                doctor_list: [],
                min_date: todayDate,
              },
            },
          },
        },
      },
    };

    if (userWaId) {
      setFlowSession(userWaId, "FLOW_BOOKING_TOKEN", "APPOINTMENT");
    }

    const response = await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ WhatsApp Flow Message Sent:", response.data);
  } catch (error) {
    console.error(
      "❌ Error sending flow message:",
      error.response?.data || error.message
    );
  }
};

const sendAppointmentReplyButton = async (phoneNumber, userName) => {
  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneNumber,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `Hello *${userName}*! 😃\nHow can we assist you with your appointment today? Select an option below to schedule, make changes, or explore our services.`,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: "book-appointment", title: "📅 Book Appointment" },
          },
          {
            type: "reply",
            reply: { id: "cancel-appointment", title: "❌ Cancel Appointment" },
          },
          {
            type: "reply",
            reply: { id: "more-options", title: "ℹ️ More Options" },
          },
        ],
      },
    },
  };

  try {
    const response = await axios.post(WHATSAPP_API_URL, data, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    console.log("✅ Message sent:", response.data);
  } catch (error) {
    console.error(
      "❌ Error sending message:",
      error.response?.data || error.message
    );
  }
};

module.exports = {
  sendWhatsAppMessage,
  sendAppointmentReplyButton,
  sendAppointmentFlow,
  sendWelcomeWithFlow: sendAppointmentFlow, // placeholder if not defined elsewhere
};
