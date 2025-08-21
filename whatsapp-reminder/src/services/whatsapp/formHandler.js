const { getUserDetails } = require("../../utils/userHelper");
const { saveBooking } = require("../../helpers/saveBooking");
const Department = require("../../models/Appointment/department");
const Doctor = require("../../models/Appointment/doctor");
const Patient = require("../../models/Appointment/patient");
const { savePatientDetails } = require("../patientService");
const { handleLocationFlowSubmission } = require("../demo");
const {
  getFlowSession,
  clearFlowSession,
} = require("../../utils/flowSessionStore");
const { sendWhatsAppMessage } = require("./messageService");

const handleFormSubmission = async (messageEvent, body) => {
  console.log("📥 Form Submission Detected!");
  const { userName, userWaId } = getUserDetails(body);

  let formData;
  try {
    formData = JSON.parse(messageEvent.interactive.nfm_reply.response_json);
    console.log("📋 Parsed Form Data:", JSON.stringify(formData, null, 2));
  } catch (error) {
    console.error("❌ Error parsing form data:", error);
    await sendWhatsAppMessage(
      userWaId,
      "⚠️ We couldn’t understand your response. Please try again."
    );
    return;
  }

  const flowToken =
    formData.flow_token || messageEvent.interactive?.nfm_reply?.flow_token;
  const screen = formData.screen;

  const session = getFlowSession(userWaId);
  if (!session || session.flowToken !== flowToken) {
    clearFlowSession(userWaId);
    await sendExpiredFlowScreen(userWaId);
    return;
  }

  switch (flowToken) {
    case "FLOW_BOOKING_TOKEN":
      return await handleAppointmentFlowSubmission(
        formData,
        userWaId,
        userName,
        screen
      );
    case "FLOW_TOKEN":
      return await handleLocationFlowSubmission(formData, userWaId);
    default:
      console.warn("❓ Unrecognized flow_token:", flowToken);
      await sendWhatsAppMessage(
        userWaId,
        "⚠️ Unknown form submission. Please try again."
      );
  }
};

const handleAppointmentFlowSubmission = async (
  formData,
  userWaId,
  userName,
  screen
) => {
  const appointmentDetails = formData?.appointment_details || {};
  const { doctor, department, calendar, scheduleId, slot_metadata } =
    appointmentDetails;

  if (
    !doctor ||
    !department ||
    !calendar ||
    !scheduleId ||
    !slot_metadata ||
    !slot_metadata.startTime ||
    !slot_metadata.endTime
  ) {
    await sendWhatsAppMessage(
      userWaId,
      "⚠️ Missing appointment details. Please fill out the form correctly."
    );
    return;
  }

  try {
    const userId =
      formData.userId ||
      formData.user_id ||
      formData.appointment_details?.user_id;

    if (!userId) {
      throw new Error("User ID not found in form data.");
    }

    let patientId;
    let patientName;

    if (formData.new_patient_submit) {
      const patient = await savePatientDetails(
        formData.new_patient_submit,
        userId
      );
      if (!patient) throw new Error("Failed to save new patient");
      patientId = patient.id;
      patientName = patient.name;
      console.log(`✅ New patient saved with ID: ${patientId}`);
    } else if (formData.selected_patient_id) {
      patientId = formData.selected_patient_id;
      const existingPatient = await Patient.findByPk(patientId);
      patientName = existingPatient?.name || "Patient";
      console.log(`📌 Using existing patient ID: ${patientId}`);
    } else {
      throw new Error("No patient data received");
    }

    const bookingResult = await saveBooking({
      departmentId: department,
      bookingDate: calendar,
      patientId,
      scheduleId,
      appointmentDetails,
    });

    const doctorDetails = await Doctor.findByPk(doctor, {
      attributes: ["name"],
    });
    const departmentDetails = await Department.findByPk(department, {
      attributes: ["name"],
    });

    const formattedDate = new Date(calendar).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const slotTime = `${slot_metadata.startTime} - ${slot_metadata.endTime}`;
    const confirmationMessage = bookingResult.success
      ? `✅ Hello *${userName}*! Appointment for *${patientName}* with *${
          doctorDetails?.name || "Doctor"
        }* (Department: ${
          departmentDetails?.name || "Department"
        }) is confirmed for *${formattedDate}* at *${slotTime}*. Your *Token Number is ${
          bookingResult.tokenNumber || "N/A"
        }*.`
      : `❌ Booking failed: ${
          bookingResult.message || "Please try again later."
        }`;

    await sendWhatsAppMessage(userWaId, confirmationMessage);
    clearFlowSession(userWaId);
  } catch (error) {
    console.error("❌ Error in appointment flow:", error);
    await sendWhatsAppMessage(
      userWaId,
      `⚠️ Something went wrong: ${error.message || "Please try again."}`
    );
  }
};

const sendExpiredFlowScreen = async (phoneNumber) => {
  try {
    const message =
      "⏰ Your session has expired. Please send *h@@!* to start again.";
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "text",
      text: {
        body: message,
      },
    };

    const axios = require("axios");
    const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;
    const WHATSAPP_ACCESS_TOKEN = process.env.ACCESS_TOKEN;

    const response = await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Expired session message sent:", response.data);
  } catch (error) {
    console.error(
      "❌ Error sending expired session message:",
      error.response?.data || error.message
    );
  }
};

module.exports = {
  handleFormSubmission,
};
