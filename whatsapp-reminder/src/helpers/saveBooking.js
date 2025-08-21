const { Op } = require("sequelize");
const DoctorSchedule = require("../models/Appointment/doctorSchedule");
const Booking = require("../models/Appointment/Booking");
const sequelize = require("../models").sequelize;

const parseToMySQLTime = (timeString) => {
  const [time, modifier] = timeString.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:00`;
};

const saveBooking = async ({
  scheduleId,
  bookingDate,
  patientId,
  appointmentDetails,
}) => {
  try {
    const schedule = await DoctorSchedule.findByPk(scheduleId);
    if (!schedule) {
      return {
        success: false,
        message: "❌ Invalid schedule. Please try again.",
      };
    }

    const startTime = parseToMySQLTime(
      appointmentDetails.slot_metadata.startTime
    );
    const endTime = parseToMySQLTime(appointmentDetails.slot_metadata.endTime);

    const tokenNumber =
      appointmentDetails.slot_metadata.tokenNumber ||
      (schedule.bookingType === "token"
        ? (await Booking.count({
            where: {
              doctorScheduleId: scheduleId,
              bookingDate,
            },
          })) + 1
        : null);

    // 🛑 Prevent double booking
    const existingBooking = await Booking.findOne({
      where: {
        doctorScheduleId: scheduleId,
        bookingDate,
        ...(schedule.bookingType === "interval"
          ? {
              startTime,
              endTime,
            }
          : {
              tokenNumber,
            }),
        status: {
          [Op.not]: "cancelled", // allow rebooking cancelled slots
        },
      },
    });

    if (existingBooking) {
      return {
        success: false,
        message: "❌ Slot already booked.",
      };
    }

    // ✅ Save booking
    const result = await sequelize.transaction(async (t) => {
      const newBooking = await Booking.create(
        {
          doctorScheduleId: schedule.id,
          patientId,
          bookingDate,
          startTime,
          endTime,
          status: "booked",
          tokenNumber,
        },
        { transaction: t }
      );

      return newBooking;
    });

    return {
      success: true,
      bookingId: result.id,
      tokenNumber,
    };
  } catch (error) {
    console.error("❌ Error saving booking:", error);
    return {
      success: false,
      message: "❌ Something went wrong while booking.",
    };
  }
};

module.exports = { saveBooking };
