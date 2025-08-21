const {
  fetchDoctorsByDepartment,
  fetchPatientsFromDB,
  getSlotsForDoctorOnDate,
  getDoctorAvailableDatesFromDB,
} = require("../src/helpers/databaseHelpers");

const User = require("./models/Appointment/user");

const {
  setFlowSession,
  getFlowSession,
  clearFlowSession,
} = require("./utils/flowSessionStore");

const getNextScreen = async (decryptedBody) => {
  try {
    let { screen, action, data } = decryptedBody;
    data = data || {};

    let userId = data?.userId || null;

    if (!userId) {
      const waId =
        data?.userWaId ||
        decryptedBody?.user_wa_id ||
        decryptedBody?.userWaId ||
        decryptedBody?.user?.waId ||
        null;

      if (waId) {
        const user = await User.findOne({ where: { waId } });
        userId = user?.id || null;
        if (userId) {
          data.userId = userId;
          data.userWaId = waId;
        }
      }
    }

    console.log("👤 Resolved user ID:", userId);

    // ✅ Flow session timeout check
    if (data?.flow_token && data?.userWaId) {
      const session = getFlowSession(data.userWaId);

      if (session && session.flowToken === data.flow_token) {
        const now = Date.now();
        if (now > session.expiresAt) {
          console.log(
            "⏱️ Session expired. Navigating to SESSION_EXPIRED screen."
          );
          clearFlowSession(data.userWaId);
          return {
            screen: "SESSION_EXPIRED",
            data: {
              message:
                "Your session has expired. Please restart by sending 'h@@!'",
            },
          };
        } else {
          setFlowSession(data.userWaId, data.flow_token, screen); // sliding expiry
        }
      } else {
        setFlowSession(data.userWaId, data.flow_token, screen); // new session
      }
    }

    if (
      !action &&
      decryptedBody.messages?.[0]?.interactive?.type === "nfm_reply"
    ) {
      console.log("🔍 Detected nfm_reply, setting action to 'complete'");
      action = "complete";
      data = decryptedBody.messages[0].interactive.nfm_reply;
    }

    console.log("🔎 Extracted Action:", action);
    console.log("📩 Extracted Data:", data);

    if (action === "ping") {
      return { data: { status: "active" } };
    }

    if (action === "data_exchange" && screen === "APPOINTMENT") {
      const { trigger, department, doctor, calendar } = data;

      switch (trigger) {
        case "department_selected": {
          const appointmentDetails = {
            department: String(department || ""),
            doctor: String(data.doctor || ""),
            calendar: String(data.calendar || ""),
            scheduleId: null,
            user_id: userId,
          };

          if (!department) {
            return {
              screen: "APPOINTMENT",
              data: {
                is_doctor_enabled: false,
                doctor_list: [],
                slot_list: [],
                is_slot_enabled: false,
                appointment_details: appointmentDetails,
              },
            };
          }

          const doctors = await fetchDoctorsByDepartment(department);

          return {
            screen: "APPOINTMENT",
            data: {
              is_doctor_enabled: true,
              doctor_list: doctors.map((doc) => ({
                id: String(doc.id),
                title: doc.name,
              })),
              slot_list: [],
              is_slot_enabled: false,
              appointment_details: appointmentDetails,
            },
          };
        }

        case "doctor_selected": {
          const appointmentDetails = {
            ...data.appointment_details,
            department: String(data.department || ""),
            doctor: String(doctor || ""),
            calendar: String(data.calendar || ""),
            user_id: userId,
          };

          if (!doctor) {
            return {
              screen: "APPOINTMENT",
              data: {
                message: "Doctor selection cleared",
                slot_list: [],
                is_slot_enabled: false,
                appointment_details: appointmentDetails,
              },
            };
          }

          const {
            min_date: minDate,
            max_date: maxDate,
            include_days: includeDays,
            date_schedule_map: dateScheduleMap,
          } = await getDoctorAvailableDatesFromDB(doctor);

          return {
            screen: "APPOINTMENT",
            data: {
              message: "Doctor availability fetched.",
              min_date: minDate,
              max_date: maxDate,
              include_days: includeDays,
              unavailable_dates: [],
              slot_list: [],
              is_slot_enabled: false,
              appointment_details: {
                ...appointmentDetails,
                date_schedule_map: dateScheduleMap,
              },
            },
          };
        }

        case "date_selected": {
          const appointmentDetails = {
            ...data.appointment_details,
            department: String(data.department || ""),
            doctor: String(data.doctor || ""),
            calendar: String(data.calendar || ""),
            scheduleId: null,
            user_id: userId,
          };

          if (!appointmentDetails.calendar || !appointmentDetails.doctor) {
            return {
              screen: "APPOINTMENT",
              data: {
                message: appointmentDetails.calendar
                  ? `Appointment date set for ${appointmentDetails.calendar}`
                  : "Date selection cleared",
                appointment_details: appointmentDetails,
                slot_list: [],
                is_slot_enabled: false,
              },
            };
          }

          const { dateScheduleMap } = await getDoctorAvailableDatesFromDB(
            appointmentDetails.doctor
          );
          const scheduleId = dateScheduleMap?.[appointmentDetails.calendar];
          appointmentDetails.scheduleId = scheduleId
            ? String(scheduleId)
            : null;

          if (!scheduleId) {
            return {
              screen: "APPOINTMENT",
              data: {
                message: `No schedule available for ${appointmentDetails.calendar}`,
                appointment_details: appointmentDetails,
                slot_list: [],
                is_slot_enabled: false,
              },
            };
          }

          const slots = await getSlotsForDoctorOnDate(
            scheduleId,
            appointmentDetails.calendar
          );

          const availableSlots = slots.filter((slot) => !slot.booked);

          const isTokenBased = slots?.[0]?.type === "token";

          if (isTokenBased) {
            const selectedSlot = availableSlots[0];

            if (!selectedSlot) {
              return {
                screen: "APPOINTMENT",
                data: {
                  message: `No tokens available for ${appointmentDetails.calendar}`,
                  appointment_details: appointmentDetails,
                  slot_list: [],
                  is_slot_enabled: false,
                },
              };
            }

            appointmentDetails.slot_metadata = {
              doctorScheduleId: selectedSlot.doctorScheduleId,
              startTime: selectedSlot.startTime,
              endTime: selectedSlot.endTime,
              tokenNumber: selectedSlot.tokenNumber,
            };

            appointmentDetails.slot_summary = `Token ${selectedSlot.tokenNumber}`;
            appointmentDetails.slot = `slot_${
              selectedSlot.doctorScheduleId
            }_${selectedSlot.startTime.replace(/[^a-zA-Z0-9]/g, "")}`;

            const patients = await fetchPatientsFromDB(userId);
            const existingPatients = patients.map((p) => ({
              id: String(p.id),
              title: p.name,
              description: `Age:${p.age}, Gender:${p.gender}, Contact Number:${p.phoneNumber}`,
            }));

            return {
              screen: "PATIENT",
              data: {
                message: `Auto-assigned: Token ${selectedSlot.tokenNumber}`,
                appointment_details: appointmentDetails,
                existing_patients: existingPatients,
                is_existing_patients_available: existingPatients.length > 0,
              },
            };
          }

          return {
            screen: "APPOINTMENT",
            data: {
              message: `Appointment date set for ${appointmentDetails.calendar}`,
              appointment_details: appointmentDetails,
              slot_list: availableSlots.map((slot) => ({
                id: `slot_${slot.doctorScheduleId}_${slot.startTime.replace(
                  /[^a-zA-Z0-9]/g,
                  ""
                )}`,
                title: slot.tokenNumber
                  ? `Token ${slot.tokenNumber} (${slot.startTime} - ${slot.endTime})`
                  : `${slot.startTime} - ${slot.endTime}`,
              })),
              is_slot_enabled: true,
            },
          };
        }

        case "slot_selected": {
          const appointmentDetails = {
            ...data.appointment_details,
            user_id: userId,
          };
          const slotId =
            typeof data.slot === "string" ? data.slot : data.slot?.id;

          if (
            !slotId ||
            !appointmentDetails.calendar ||
            !appointmentDetails.scheduleId
          ) {
            return {
              data: {
                error: "Invalid or missing slot or appointment details",
              },
            };
          }

          appointmentDetails.scheduleId = String(appointmentDetails.scheduleId);

          const slots = await getSlotsForDoctorOnDate(
            appointmentDetails.scheduleId,
            appointmentDetails.calendar
          );

          const selectedSlot = slots.find(
            (s) =>
              `slot_${s.doctorScheduleId}_${s.startTime.replace(
                /[^a-zA-Z0-9]/g,
                ""
              )}` === slotId
          );

          if (!selectedSlot) {
            return {
              screen: "APPOINTMENT",
              data: {
                message: "Selected slot is no longer available.",
                appointment_details,
                slot_list: slots
                  .filter((s) => !s.booked)
                  .map((s) => ({
                    id: `slot_${s.doctorScheduleId}_${s.startTime.replace(
                      /[^a-zA-Z0-9]/g,
                      ""
                    )}`,
                    title: s.tokenNumber
                      ? `Token ${s.tokenNumber} (${s.startTime} - ${s.endTime})`
                      : `${s.startTime} - ${s.endTime}`,
                  })),
                is_slot_enabled: false,
              },
            };
          }

          appointmentDetails.slot = slotId;
          appointmentDetails.slot_metadata = {
            doctorScheduleId: selectedSlot.doctorScheduleId,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            ...(Number.isFinite(selectedSlot.tokenNumber) && {
              tokenNumber: selectedSlot.tokenNumber,
            }),
          };

          appointmentDetails.slot_summary = selectedSlot.tokenNumber
            ? `Token ${selectedSlot.tokenNumber}`
            : `${selectedSlot.startTime} - ${selectedSlot.endTime}`;

          const patients = await fetchPatientsFromDB(userId);
          const existingPatients = patients.map((p) => ({
            id: String(p.id),
            title: p.name,
            description: `Age:${p.age}, Gender:${p.gender}, Contact Number:${p.phoneNumber}`,
          }));

          return {
            screen: "PATIENT",
            data: {
              message: `Slot selected: ${appointmentDetails.slot_summary}`,
              appointment_details: appointmentDetails,
              existing_patients: existingPatients,
              is_existing_patients_available: existingPatients.length > 0,
            },
          };
        }

        case "patient_info": {
          const appointmentDetails = {
            ...data.appointment_details,
            user_id: userId,
          };

          const patients = await fetchPatientsFromDB(userId);
          const existingPatients = patients.map((p) => ({
            id: String(p.id),
            title: p.name,
            description: `Age:${p.age}, Gender:${p.gender}, Contact Number:${p.phoneNumber}`,
          }));

          return {
            screen: "PATIENT",
            data: {
              existing_patients: existingPatients,
              is_existing_patients_available: existingPatients.length > 0,
              appointment_details: appointmentDetails,
              user_id: String(userId || ""),
            },
          };
        }

        default:
          return {
            data: { error: `Unhandled trigger: ${trigger}` },
          };
      }
    }

    if (action === "data_exchange" && screen === "PATIENT") {
      const {
        trigger,
        next_screen,
        appointment_details,
        selected_patient_id,
        user_id,
      } = data;

      if (next_screen === "ADD_NEW_PATIENT") {
        return {
          screen: "ADD_NEW_PATIENT",
          data: {
            appointment_details: appointment_details || {},
            user_id: String(user_id || ""),
          },
        };
      }

      switch (trigger) {
        case "add_patient_info":
          return {
            screen: "ADD_NEW_PATIENT",
            data: {
              appointment_details: appointment_details || {},
              user_id: String(user_id || ""),
            },
          };

        case "patient_selected":
          if (!selected_patient_id) {
            return { data: { error: "Missing selected patient ID" } };
          }
          return {
            screen: "SUMMARY",
            data: {
              appointment_details: {
                ...appointment_details,
                selected_patient_id: String(selected_patient_id),
              },
            },
          };

        default:
          return {
            data: {
              error: `Invalid trigger: ${trigger} for screen: PATIENT`,
            },
          };
      }
    }

    return { data: { error: "Invalid action or screen" } };
  } catch (error) {
    console.error("❌ Error in getNextScreen:", error);
    return { data: { error: "Internal server error" } };
  }
};

module.exports = { getNextScreen };
