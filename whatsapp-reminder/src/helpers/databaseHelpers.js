const Department = require("../models/Appointment/department");
const Doctor = require("../models/Appointment/doctor");
const Patient = require("../models/Appointment/patient");
const DoctorSchedule = require("../models/Appointment/doctorSchedule");
const Booking = require("../models/Appointment/Booking");
const moment = require("moment");
const { generateSlots } = require("../utils/slotUtils");
const {
  getAvailableDatesFromSchedule,
} = require("../utils/getAvailableDatesFromSchedule.js");

const fetchDepartmentsFromDB = async () => {
  return await Department.findAll({
    attributes: ["id", "name"],
    raw: true,
  });
};

const fetchDoctorsByDepartment = async (departmentId) => {
  return await Doctor.findAll({
    where: { departmentId },
    attributes: ["id", "name"],
    raw: true,
  });
};

const fetchPatientsFromDB = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to fetch patients.");
    }

    return await Patient.findAll({
      where: { userId },
      attributes: ["id", "name", "age", "gender", "phoneNumber"],
      raw: true,
    });
  } catch (error) {
    console.error("❌ Error fetching patients:", error);
    return [];
  }
};

const saveBooking = async ({
  doctorId,
  doctorScheduleId,
  departmentId,
  bookingDate,
  patientId,
  startTime,
  endTime,
  tokenNumber,
}) => {
  try {
    if (
      !doctorId ||
      !departmentId ||
      !bookingDate ||
      !doctorScheduleId ||
      !patientId
    ) {
      throw new Error(
        "Missing required fields: doctorId, departmentId, doctorScheduleId, patientId, or bookingDate"
      );
    }

    const newBooking = await Booking.create({
      doctorId,
      doctorScheduleId,
      departmentId,
      bookingDate,
      patientId,
      startTime,
      endTime,
      tokenNumber,
      status: "booked",
    });

    console.log("✅ Booking saved:", newBooking);
    return { success: true, booking: newBooking };
  } catch (error) {
    console.error("❌ Error saving booking:", error);
    return { success: false, error: error.message };
  }
};

const getSlotsForDoctorOnDate = async (doctorScheduleId, date) => {
  try {
    const slots = await generateSlots(doctorScheduleId, date);
    return slots;
  } catch (err) {
    console.error("❌ Error fetching slots:", err);
    throw new Error("Failed to get slots");
  }
};

/**
 * Returns min/max/include_days + date_schedule_map like:
 * {
 *   min_date: "2025-06-27",
 *   max_date: "2025-07-10",
 *   include_days: ["Mon", "Wed", "Fri"],
 *   date_schedule_map: { "2025-06-27": 5, "2025-06-29": 5, "2025-07-01": 7 }
 * }
 */
async function getDoctorAvailableDatesFromDB(doctorId) {
  const schedules = await DoctorSchedule.findAll({
    where: { doctorId },
  });

  const dateScheduleMap = {}; // camelCase for consistency with frontend naming
  const allDates = [];

  const today = moment().startOf("day");

  for (const schedule of schedules) {
    const dates = getAvailableDatesFromSchedule({
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      recurringPattern: schedule.recurringPattern,
      days: schedule.days,
    });

    const futureDates = dates.filter((date) =>
      moment(date).isSameOrAfter(today)
    );

    for (const date of futureDates) {
      const formattedDate = moment(date).format("YYYY-MM-DD");
      if (!dateScheduleMap[formattedDate]) {
        dateScheduleMap[formattedDate] = schedule.id;
        allDates.push(formattedDate);
      }
    }
  }

  if (!allDates.length) {
    return {
      min_date: null,
      max_date: null,
      include_days: [],
      dateScheduleMap: {},
    };
  }

  const uniqueSortedDates = [...new Set(allDates)].sort((a, b) =>
    moment(a).diff(moment(b))
  );

  const min_date = uniqueSortedDates[0];
  const max_date = uniqueSortedDates[uniqueSortedDates.length - 1];
  const include_days = [
    ...new Set(uniqueSortedDates.map((date) => moment(date).format("ddd"))),
  ];

  return {
    min_date,
    max_date,
    include_days,
    dateScheduleMap,
  };
}

module.exports = {
  getSlotsForDoctorOnDate,
  getDoctorAvailableDatesFromDB,
  fetchDepartmentsFromDB,
  fetchDoctorsByDepartment,
  fetchPatientsFromDB,
  saveBooking,
};
